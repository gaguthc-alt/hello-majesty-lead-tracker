-- Fix Sambungan inbound conversation creation when older webhook payloads omit
-- cs_claim_enabled. jsonb_populate_record explicitly assigns NULL to omitted keys,
-- so table defaults are not applied; normalize the required CS-claim flag before insert.
CREATE OR REPLACE FUNCTION public.hm_sambungan_resolve_conversation(p_customer_phone text,p_whatsapp_account_id text,p_insert jsonb)
RETURNS TABLE(id uuid,lead_id uuid,customer_id uuid,customer_name text,created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare
 v_row public.chat_conversations%rowtype;
 v_phone text := regexp_replace(coalesce(p_customer_phone,''),'\D','','g');
 v_account text := nullif(trim(coalesce(p_whatsapp_account_id,'')),'');
 v_insert_lead uuid;
 v_lead_value text := nullif(trim(coalesce(p_insert->>'lead_id','')),'');
 v_created boolean := false;
begin
 if v_phone='' then raise exception 'customer phone is required'; end if;
 if v_lead_value is not null then
  if v_lead_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   v_insert_lead:=v_lead_value::uuid;
  else
   select l.id into v_insert_lead from public.leads l where l.lead_id=v_lead_value limit 1;
  end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(v_account,'<null>')||':'||v_phone,0));
 select c.* into v_row from public.chat_conversations c
 where regexp_replace(coalesce(c.customer_phone,''),'\D','','g')=v_phone
 and c.whatsapp_account_id is not distinct from v_account
 order by c.created_at desc limit 1 for update;
 if found then
  update public.chat_conversations c set lead_id=coalesce(c.lead_id,v_insert_lead),
   customer_id=coalesce(c.customer_id,nullif(p_insert->>'customer_id','')::uuid),
   customer_name=case when nullif(trim(coalesce(c.customer_name,'')),'') is null then coalesce(nullif(trim(p_insert->>'customer_name'),''),c.customer_name) else c.customer_name end,
   updated_at=now() where c.id=v_row.id returning * into v_row;
  if v_row.claimed_by is not null and v_row.claimed_at is not null and v_row.claimed_at<=now()-interval '7 days' then
   update public.chat_conversations c set claimed_by=null,claimed_name=null,claimed_at=null,status='AVAILABLE',updated_at=now()
   where c.id=v_row.id returning * into v_row;
  end if;
  if v_row.lead_id is not null then
   update public.leads l set cs=null,cs_claimed_by=null,claimed_at=null,status_lead='AVAILABLE',updated_at=now()
   where l.id=v_row.lead_id and l.status_lead='CS LOCK' and l.claimed_at is not null and l.claimed_at<=now()-interval '7 days';
  end if;
  return query select v_row.id,v_row.lead_id,v_row.customer_id,v_row.customer_name,false; return;
 end if;
 v_row:=jsonb_populate_record(null::public.chat_conversations,coalesce(p_insert,'{}'::jsonb)-'lead_id');
 v_row.id:=coalesce(v_row.id,gen_random_uuid());
 v_row.lead_id:=v_insert_lead;
 v_row.source:=coalesce(v_row.source,'HELLO_MAJESTY_CHAT');
 v_row.status:=coalesce(v_row.status,'AVAILABLE');
 v_row.source_confidence:=coalesce(v_row.source_confidence,'UNKNOWN');
 v_row.lead_decision:=coalesce(v_row.lead_decision,'UNREVIEWED');
 v_row.lead_qualification:=coalesce(v_row.lead_qualification,'{}'::jsonb);
 v_row.sales_response_state:=coalesce(v_row.sales_response_state,'IDLE');
 v_row.cs_claim_enabled:=coalesce(v_row.cs_claim_enabled,true);
 v_row.created_at:=coalesce(v_row.created_at,now());
 v_row.updated_at:=coalesce(v_row.updated_at,now());
 insert into public.chat_conversations select (v_row).* returning * into v_row;
 v_created:=true;
 return query select v_row.id,v_row.lead_id,v_row.customer_id,v_row.customer_name,v_created;
end;
$function$;
