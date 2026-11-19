-- Fix Walk-In finalization: approvals are stored in walkin_sale_approvals.
create or replace function public.finalize_walkin_sale_internal(p_approval_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
 a public.walkin_sale_approvals%rowtype;
 s public.stock_units%rowtype;
 uid uuid:=auth.uid(); v_sale_id uuid; v_profit numeric; v_actor uuid; v_ids uuid[];
 v_cash_account uuid; v_inv_account uuid; v_sales_account uuid; v_cogs_account uuid;
 v_hunter_expense_account uuid; v_hunter_payable_account uuid;
 v_hunter_commission numeric:=0; v_lines jsonb; v_journal jsonb;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 select * into a from public.walkin_sale_approvals where id=p_approval_id for update;
 if not found then raise exception 'Pengajuan Walk-In tidak ditemukan'; end if;
 if a.status<>'PENDING' then raise exception 'Pengajuan Walk-In sudah diproses'; end if;
 select * into s from public.stock_units where id=a.stock_unit_id for update;
 if not found then raise exception 'Stock tidak ditemukan'; end if;
 if s.status<>'READY' then raise exception 'Stock harus READY untuk Walk-In'; end if;
 if a.sale_price is null or a.sale_price<=0 then raise exception 'Harga Walk-In tidak valid'; end if;
 v_ids:=coalesce(a.sales_user_ids,'{}'::uuid[]);
 v_actor:=coalesce(a.requested_by,v_ids[1]);
 if v_actor is null then raise exception 'Sales pengaju tidak ditemukan'; end if;
 if not (v_actor=any(v_ids)) then v_ids:=array_append(v_ids,v_actor); end if;
 v_profit:=a.sale_price-coalesce(s.cost,0);
 v_hunter_commission:=greatest(v_profit,0)*case when s.hunter_user_id is not null then 0.10 else 0 end;
 select id into v_cash_account from public.accounting_accounts where active=true and code=case
  when s.outlet='Majesty Plaza iPhone' then '1101'
  when s.outlet='Majesty Refill Phone' then '1102' else null end;
 select id into v_inv_account from public.accounting_accounts where code='1202' and active=true;
 select id into v_sales_account from public.accounting_accounts where code='4101' and active=true;
 select id into v_cogs_account from public.accounting_accounts where code='5101' and active=true;
 select id into v_hunter_expense_account from public.accounting_accounts where code='6112' and active=true;
 select id into v_hunter_payable_account from public.accounting_accounts where code='2304' and active=true;
 if v_cash_account is null or v_inv_account is null or v_sales_account is null or v_cogs_account is null then
  raise exception 'Mapping COA Walk-In belum lengkap untuk outlet %',s.outlet;
 end if;
 if v_hunter_commission>0 and (v_hunter_expense_account is null or v_hunter_payable_account is null) then
  raise exception 'Mapping COA komisi Hunter belum lengkap';
 end if;
 update public.stock_units set status='SOLD',sold_at=now(),sold_price=a.sale_price,sold_by_user_id=v_actor,updated_at=now() where id=s.id;
 insert into public.sales_transactions(stock_unit_id,outlet,sales_user_id,sold_at,sale_price,discount,cost,gross_profit,
  hunter_user_id,hunter_commission,customer_name,customer_source,notes,closing_capacity)
 values(s.id,s.outlet,v_actor,now(),a.sale_price,0,s.cost,v_profit,s.hunter_user_id,v_hunter_commission,
  'Walk-In','WALK-IN','Walk-In disetujui Management/Facilitator','SALES_CORE') returning id into v_sale_id;
 update public.stock_units set sale_id=v_sale_id where id=s.id;
 insert into public.sales_transaction_team_members(sale_id,user_id)
  select distinct v_sale_id,x from unnest(v_ids) x where x is not null on conflict do nothing;
 insert into public.stock_movements(stock_unit_id,movement_type,from_status,to_status,actor_user_id,note)
  values(s.id,'SOLD','READY','SOLD',v_actor,'Walk-In disetujui Management/Facilitator');
 update public.walkin_sale_approvals set status='APPROVED',reviewed_by=uid,reviewed_at=now(),sale_id=v_sale_id where id=a.id;
 v_lines:=jsonb_build_array(
  jsonb_build_object('account_id',v_cash_account,'debit',greatest(a.sale_price,0),'credit',0,'description','Kas penjualan','outlet',s.outlet),
  jsonb_build_object('account_id',v_sales_account,'debit',0,'credit',greatest(a.sale_price,0),'description','Penjualan HP','outlet',s.outlet),
  jsonb_build_object('account_id',v_cogs_account,'debit',greatest(coalesce(s.cost,0),0),'credit',0,'description','HPP HP','outlet',s.outlet),
  jsonb_build_object('account_id',v_inv_account,'debit',0,'credit',greatest(coalesce(s.cost,0),0),'description','Pengurangan persediaan','outlet',s.outlet));
 if v_hunter_commission>0 then v_lines:=v_lines||jsonb_build_array(
  jsonb_build_object('account_id',v_hunter_expense_account,'debit',v_hunter_commission,'credit',0,'description','Beban Komisi Hunter','outlet',s.outlet),
  jsonb_build_object('account_id',v_hunter_payable_account,'debit',0,'credit',v_hunter_commission,'description','Hutang Komisi Hunter','outlet',s.outlet)); end if;
 v_journal:=public.create_inventory_journal('SALE',v_sale_id,now(),'Walk-In '||coalesce(s.outlet,''),v_lines);
 perform public.enqueue_accurate_sync_for_sale(v_sale_id);
 return jsonb_build_object('success',true,'status','APPROVED','sale_id',v_sale_id,'stock_id',s.id,'sales_user_ids',v_ids,'journal',v_journal);
end;
$function$;