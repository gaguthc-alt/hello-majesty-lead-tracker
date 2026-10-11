-- Hello Majesty Chat -> Lead Tracker integration
-- Additive only: links each chat conversation to exactly one lead.
alter table public.chat_conversations
  add column if not exists lead_id text;

create index if not exists chat_conversations_lead_id_idx
  on public.chat_conversations (lead_id);

create or replace function public.hm_claim_chat_conversation(p_conversation_id uuid)
returns public.chat_conversations
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $function$
declare
  v_row public.chat_conversations;
  v_user uuid := auth.uid();
  v_name text;
  v_profile public.team_profiles%rowtype;
  v_lead_id text;
begin
  if v_user is null or not public.hm_is_active_cs(v_user) then
    raise exception 'Hanya CS aktif yang dapat claim chat.';
  end if;

  select * into v_profile
  from public.team_profiles
  where user_id = v_user
    and active = true
    and role = 'CS'
  limit 1;

  if v_profile.user_id is null then
    raise exception 'Profil CS aktif tidak ditemukan.';
  end if;

  v_name := v_profile.name;

  update public.chat_conversations
  set claimed_by = v_user,
      claimed_name = v_name,
      claimed_at = coalesce(claimed_at, now()),
      status = case when claimed_by is null then 'HANDLING' else status end,
      updated_at = now()
  where id = p_conversation_id
    and claimed_by is null
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
    from public.chat_conversations
    where id = p_conversation_id;

    if v_row.id is null then
      raise exception 'Chat tidak ditemukan.';
    end if;

    if v_row.claimed_by <> v_user then
      raise exception 'Chat sudah di-claim oleh %.', coalesce(v_row.claimed_name,'CS lain');
    end if;
  end if;

  -- One chat = one Lead Tracker lead. Safe to retry.
  if v_row.lead_id is null then
    insert into public.leads (
      customer,
      whatsapp,
      outlet,
      cs,
      cs_claimed_by,
      claimed_at,
      status_lead,
      need_type,
      initial_data,
      catatan
    )
    values (
      coalesce(nullif(trim(v_row.customer_name),''),'Customer'),
      'BELUM DIISI',
      v_profile.outlet,
      v_name,
      v_name,
      coalesce(v_row.claimed_at, now()),
      'CS LOCK',
      'INFORMASI',
      jsonb_build_object(
        'source', coalesce(v_row.source,'HELLO_MAJESTY_CHAT'),
        'chat_conversation_id', v_row.id::text,
        'created_from', 'HELLO_MAJESTY_CHAT'
      ),
      'Lead dibuat otomatis dari Hello Majesty Chat. Lengkapi data customer sebelum handover.'
    )
    returning lead_id into v_lead_id;

    update public.chat_conversations
    set lead_id = v_lead_id,
        updated_at = now()
    where id = v_row.id
      and lead_id is null
    returning * into v_row;
  end if;

  return v_row;
end;
$function$;