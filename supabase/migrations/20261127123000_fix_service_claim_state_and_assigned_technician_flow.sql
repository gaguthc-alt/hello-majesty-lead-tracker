CREATE OR REPLACE FUNCTION public.claim_service_lead(p_lead_id text)
RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.team_profiles%rowtype;
  v_permission public.team_permissions%rowtype;
  v_lead public.leads%rowtype;
  v_followup date;
  v_today date := (now() AT TIME ZONE 'Asia/Makassar')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_profile FROM public.team_profiles
  WHERE user_id=v_uid AND active=true LIMIT 1;
  IF v_profile.user_id IS NULL THEN RAISE EXCEPTION 'Active team profile not found'; END IF;

  SELECT * INTO v_permission FROM public.team_permissions
  WHERE lower(trim(name))=lower(trim(v_profile.name))
    AND lower(trim(outlet))=lower(trim(v_profile.outlet))
    AND active=true AND can_technician=true LIMIT 1;
  IF v_permission.id IS NULL THEN RAISE EXCEPTION 'Teknisi permission denied'; END IF;

  SELECT * INTO v_lead FROM public.leads
  WHERE lead_id=p_lead_id AND outlet=v_profile.outlet FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead not found or outside your outlet'; END IF;
  IF v_lead.need_type<>'SERVICE' THEN RAISE EXCEPTION 'Lead ini bukan SERVICE'; END IF;

  v_followup := coalesce(v_lead.sales_follow_up_date,v_lead.cs_follow_up_date,v_lead.follow_up_date);
  IF v_followup IS NOT NULL AND v_followup <= v_today - 7
     AND upper(trim(coalesce(v_lead.service_status,''))) NOT IN ('CLOSING','GAGAL') THEN
    UPDATE public.leads SET service_status='GAGAL',status_lead='HASIL',
      hasil='SERVICE GAGAL',
      next_action='Service kedaluwarsa otomatis setelah 7 hari sejak follow-up',
      service_note=concat_ws(E'\\n',nullif(trim(service_note),''),'Otomatis GAGAL: tanggal follow-up telah melewati 7 hari.'),
      updated_at=now()
    WHERE id=v_lead.id RETURNING * INTO v_lead;
    RETURN v_lead;
  END IF;

  IF nullif(trim(coalesce(v_lead.service_pic,'')),'') IS NOT NULL
     AND lower(trim(v_lead.service_pic))<>lower(trim(v_profile.name)) THEN
    RAISE EXCEPTION 'Service sudah di-claim oleh Teknisi %.',v_lead.service_pic;
  END IF;

  UPDATE public.leads SET
    service_pic=v_profile.name,
    service_claimed_at=coalesce(service_claimed_at,now()),
    service_claimed_by=coalesce(nullif(trim(service_claimed_by),''),v_profile.name),
    service_status='DITANGANI',
    status_lead='SERVICE',
    next_action='Service sedang ditangani Teknisi',
    updated_at=now()
  WHERE id=v_lead.id RETURNING * INTO v_lead;
  RETURN v_lead;
END;
$function$;

UPDATE public.leads
SET service_status='DITANGANI',status_lead='SERVICE',
    next_action='Service sedang ditangani Teknisi',updated_at=now()
WHERE lead_id='LM-4F0D6EE9' AND need_type='SERVICE'
  AND lower(trim(coalesce(service_pic,'')))='imas'
  AND lower(trim(coalesce(service_claimed_by,'')))='imas'
  AND service_status='MENUNGGU PIC';
