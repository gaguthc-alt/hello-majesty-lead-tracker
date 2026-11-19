-- Enforce a 5-minute priority claim window for selected non-sales roles at Majesty Plaza iPhone.
-- The window starts when CS hands the lead over to Sales; for leads without a handover
-- timestamp, fall back to the lead creation time. Enforcement is server-side in claim_lead.
do $$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.claim_lead(text,text)'::regprocedure) into v_def;

  v_old := $old$
    if not v_permission.can_sales then raise exception 'Sales permission denied untuk outlet asal lead ini'; end if;
    perform pg_advisory_xact_lock(hashtextextended(coalesce(v_lead.outlet,'') || ':' || coalesce(v_profile.name,''),0));
$old$;

  v_new := $new$
    if not v_permission.can_sales then raise exception 'Sales permission denied untuk outlet asal lead ini'; end if;

    -- Give other Sales users the first 5 minutes to claim Majesty Plaza iPhone leads.
    if lower(trim(coalesce(v_lead.outlet,'')))='majesty plaza iphone'
       and lower(trim(coalesce(v_profile.name,''))) in ('ifa','tyo','ebi','aal')
       and upper(replace(trim(coalesce(v_profile.role,'')),' ','_')) in ('FASILITATOR','CONTENT_CREATOR','FREELANCE_INTERNAL')
       and coalesce(v_lead.sales_handover_at,v_lead.created_at) > now() - interval '5 minutes' then
      raise exception 'Prioritas Sales: akun Anda dapat claim lead Majesty Plaza iPhone setelah 5 menit sejak handover.';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(coalesce(v_lead.outlet,'') || ':' || coalesce(v_profile.name,''),0));
$new$;

  if position('Prioritas Sales: akun Anda dapat claim lead Majesty Plaza iPhone setelah 5 menit sejak handover.' in v_def) > 0 then
    raise notice 'Priority claim rule already present; no change needed.';
    return;
  end if;

  if position(v_old in v_def) = 0 then
    raise exception 'Could not locate expected Sales permission guard in claim_lead; migration stopped without changing the function.';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end $$;