create or replace function public.pay_sales_transaction(
  p_sale_id uuid,
  p_amount numeric,
  p_account_id uuid,
  p_payment_method_id uuid default null::uuid,
  p_actor_user_id uuid default null::uuid,
  p_notes text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
  v_sale public.sales_transactions%rowtype;
  v_account public.financial_accounts%rowtype;
  v_paid numeric;
  v_total numeric;
  v_outstanding numeric;
  v_payment_id uuid;
  v_payment_no text;
  v_actor uuid := auth.uid();
  v_cash_coa uuid;
  v_ar_coa uuid;
  v_journal jsonb;
  v_payment_code text;
  v_target_code text;
  v_effective_account uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  -- Management remains the default authority. A Sales user may only record
  -- payment against their own completed Walk-In stock transaction.
  if not public.is_management()
     and not (
       coalesce(current_setting('hello_majesty.stock_sale_approval',true),'')='true'
       and exists(
         select 1
         from public.stock_sale_approvals a
         join public.sales_transactions st on st.stock_unit_id=a.stock_unit_id
         where a.status='PENDING'
           and a.requested_by=auth.uid()
           and st.id=p_sale_id
       )
     )
     and not exists(
       select 1
       from public.sales_transactions st
       join public.stock_units su on su.id=st.stock_unit_id
       where st.id=p_sale_id
         and st.sales_user_id=auth.uid()
         and upper(coalesce(st.customer_source,''))='WALK-IN'
         and su.sale_id=st.id
         and su.status='SOLD'
         and su.sold_by_user_id=auth.uid()
     )
  then
    raise exception 'Access denied: Management only';
  end if;

  if p_amount is null or p_amount<=0 then raise exception 'Jumlah pembayaran harus lebih dari 0'; end if;
  select * into v_sale from public.sales_transactions where id=p_sale_id for update;
  if not found then raise exception 'Transaksi penjualan tidak ditemukan'; end if;
  v_total:=greatest(coalesce(v_sale.sale_price,0)-coalesce(v_sale.discount,0),0);
  select coalesce(sum(amount),0) into v_paid from public.sales_payments where sale_id=p_sale_id;
  v_outstanding:=v_total-v_paid;
  if p_amount>v_outstanding then raise exception 'Pembayaran melebihi sisa tagihan: %',v_outstanding; end if;
  select code into v_payment_code from public.payment_methods where id=p_payment_method_id and active=true;
  if p_payment_method_id is not null and v_payment_code is null then raise exception 'Metode pembayaran tidak aktif atau tidak ditemukan'; end if;
  v_effective_account:=p_account_id;
  if upper(coalesce(v_payment_code,''))='CASH' then
    v_target_code:=case when v_sale.outlet='Majesty Refill Phone' then '1103' when v_sale.outlet='Majesty Plaza iPhone' then '1104' else null end;
    if v_target_code is null then raise exception 'Outlet belum memiliki mapping Kas Pusat'; end if;
    select * into v_account from public.financial_accounts where code=v_target_code and active=true for update;
  else
    select * into v_account from public.financial_accounts where id=p_account_id and active=true for update;
  end if;
  if not found then raise exception 'Akun kas/bank tujuan tidak aktif atau tidak ditemukan'; end if;
  select id into v_ar_coa from public.accounting_accounts where code='1201' and active=true;
  select id into v_cash_coa from public.accounting_accounts where code=v_account.code and active=true;
  if v_ar_coa is null or v_cash_coa is null then raise exception 'Mapping COA kas/bank atau piutang belum tersedia'; end if;
  v_payment_no:='PAY-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(gen_random_uuid()::text,1,8);
  insert into public.sales_payments(sale_id,payment_no,payment_method_id,financial_account_id,amount,payment_date,notes,created_by)
  values(p_sale_id,v_payment_no,p_payment_method_id,v_account.id,p_amount,now(),coalesce(p_notes,'Pembayaran saat closing'),v_actor)
  returning id into v_payment_id;
  insert into public.financial_transactions(transaction_no,account_id,transaction_type,amount,transaction_date,reference_type,reference_id,description,created_by)
  values('FT-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(gen_random_uuid()::text,1,8),v_account.id,'IN',p_amount,now(),'SALE_PAYMENT',p_sale_id,'Pembayaran penjualan '||coalesce(v_sale.customer_name,'Customer'),v_actor);
  v_journal:=public.create_inventory_journal('SALE_PAYMENT',v_payment_id,now(),'Pembayaran penjualan '||coalesce(v_sale.customer_name,'Customer'),
    jsonb_build_array(
      jsonb_build_object('account_id',v_cash_coa,'debit',p_amount,'credit',0,'description',case when upper(coalesce(v_payment_code,''))='CASH' then 'Cash dititipkan ke Pusat' else 'Kas/Bank masuk' end,'outlet','PUSAT'),
      jsonb_build_object('account_id',v_ar_coa,'debit',0,'credit',p_amount,'description','Pelunasan piutang customer','outlet',v_sale.outlet)
    ));
  v_paid:=v_paid+p_amount;
  v_outstanding:=v_total-v_paid;
  return jsonb_build_object('status',case when v_outstanding=0 then 'PAID' else 'PARTIAL' end,'payment_id',v_payment_id,'payment_no',v_payment_no,'sale_id',p_sale_id,'total',v_total,'paid_amount',v_paid,'outstanding_amount',v_outstanding,'financial_account_id',v_account.id,'financial_account_code',v_account.code,'journal',v_journal);
end
$function$;