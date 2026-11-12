-- Investor semester settlement: monthly accrual, semiannual payment
create table if not exists public.investor_semester_settlements (
 id uuid primary key default gen_random_uuid(),
 fiscal_year integer not null,
 semester smallint not null check (semester in (1,2)),
 period_start date not null,
 period_end date not null,
 total_management_profit numeric(18,2) not null default 0,
 total_investor_pool numeric(18,2) not null default 0,
 total_payable numeric(18,2) not null default 0,
 status text not null default 'DRAFT' check (status in ('DRAFT','READY_TO_SETTLE','PARTIALLY_PAID','PAID')),
 generated_at timestamptz not null default now(),
 generated_by uuid,
 finalized_at timestamptz,
 unique(fiscal_year,semester)
);
create table if not exists public.investor_semester_settlement_items (
 id uuid primary key default gen_random_uuid(),
 settlement_id uuid not null references public.investor_semester_settlements(id) on delete cascade,
 investor_id uuid not null references public.investors(id),
 investment_basis numeric(18,2) not null default 0,
 investment_share_pct numeric(12,8) not null default 0,
 allocated_amount numeric(18,2) not null default 0,
 paid_amount numeric(18,2) not null default 0,
 payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PARTIALLY_PAID','PAID')),
 unique(settlement_id,investor_id),
 check (paid_amount >= 0 and paid_amount <= allocated_amount)
);
create table if not exists public.investor_semester_payments (
 id uuid primary key default gen_random_uuid(),
 settlement_item_id uuid not null references public.investor_semester_settlement_items(id),
 amount numeric(18,2) not null check (amount > 0),
 paid_at timestamptz not null default now(),
 paid_by uuid,
 payment_reference text,
 notes text,
 created_at timestamptz not null default now()
);
alter table public.investor_semester_settlements enable row level security;
alter table public.investor_semester_settlement_items enable row level security;
alter table public.investor_semester_payments enable row level security;
drop policy if exists investor_semester_settlements_select on public.investor_semester_settlements;
create policy investor_semester_settlements_select on public.investor_semester_settlements for select to authenticated using (
 public.is_management() or exists (select 1 from public.investor_semester_settlement_items si join public.investor_user_access ua on ua.investor_id=si.investor_id where si.settlement_id=investor_semester_settlements.id and ua.user_id=(select auth.uid()) and ua.active=true)
);
drop policy if exists investor_semester_settlements_write on public.investor_semester_settlements;
create policy investor_semester_settlements_insert on public.investor_semester_settlements for insert to authenticated with check (public.is_management());
create policy investor_semester_settlements_update on public.investor_semester_settlements for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investor_semester_settlements_delete on public.investor_semester_settlements for delete to authenticated using (public.is_management());
drop policy if exists investor_semester_items_select on public.investor_semester_settlement_items;
create policy investor_semester_items_select on public.investor_semester_settlement_items for select to authenticated using (
 public.is_management() or exists (select 1 from public.investor_user_access ua where ua.investor_id=investor_semester_settlement_items.investor_id and ua.user_id=(select auth.uid()) and ua.active=true)
);
drop policy if exists investor_semester_items_write on public.investor_semester_settlement_items;
create policy investor_semester_items_insert on public.investor_semester_settlement_items for insert to authenticated with check (public.is_management());
create policy investor_semester_items_update on public.investor_semester_settlement_items for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investor_semester_items_delete on public.investor_semester_settlement_items for delete to authenticated using (public.is_management());
drop policy if exists investor_semester_payments_select on public.investor_semester_payments;
create policy investor_semester_payments_select on public.investor_semester_payments for select to authenticated using (
 public.is_management() or exists (select 1 from public.investor_semester_settlement_items si join public.investor_user_access ua on ua.investor_id=si.investor_id where si.id=investor_semester_payments.settlement_item_id and ua.user_id=(select auth.uid()) and ua.active=true)
);
drop policy if exists investor_semester_payments_insert on public.investor_semester_payments;
create policy investor_semester_payments_insert on public.investor_semester_payments for insert to authenticated with check (public.is_management() and paid_by=(select auth.uid()));
create index if not exists idx_investor_semester_items_investor on public.investor_semester_settlement_items(investor_id);
create index if not exists idx_investor_semester_payments_item on public.investor_semester_payments(settlement_item_id);
grant select on public.investor_semester_settlements,public.investor_semester_settlement_items,public.investor_semester_payments to authenticated;
create or replace function public.generate_investor_semester_settlement(p_fiscal_year integer,p_semester smallint)
returns uuid language plpgsql set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_start date; v_end date; v_id uuid; v_status text; v_profit numeric(18,2); v_pool numeric(18,2); v_count integer;
begin
 if not public.is_management() then raise exception 'Akses hanya untuk Management'; end if;
 if p_fiscal_year is null or p_fiscal_year < 2000 or p_semester not in (1,2) then raise exception 'Tahun dan semester tidak valid'; end if;
 v_start:=make_date(p_fiscal_year,case when p_semester=1 then 1 else 7 end,1);
 v_end:=case when p_semester=1 then make_date(p_fiscal_year,7,1) else make_date(p_fiscal_year+1,1,1) end;
 select count(*),coalesce(sum(management_profit),0),coalesce(sum(investor_pool),0) into v_count,v_profit,v_pool
 from public.investor_monthly_allocations where month_start>=v_start and month_start<v_end;
 if v_count<>6 then raise exception 'Belum lengkap: diperlukan 6 laporan bulanan, baru tersedia % dari 6',v_count; end if;
 insert into public.investor_semester_settlements(fiscal_year,semester,period_start,period_end,total_management_profit,total_investor_pool,total_payable,status,generated_at,generated_by)
 values(p_fiscal_year,p_semester,v_start,v_end-1,v_profit,v_pool,v_pool,'DRAFT',now(),auth.uid())
 on conflict(fiscal_year,semester) do update set total_management_profit=excluded.total_management_profit,total_investor_pool=excluded.total_investor_pool,total_payable=excluded.total_payable,generated_at=now(),generated_by=auth.uid()
 where public.investor_semester_settlements.status='DRAFT'
 returning id,status into v_id,v_status;
 if v_id is null then
  select id,status into v_id,v_status from public.investor_semester_settlements where fiscal_year=p_fiscal_year and semester=p_semester;
  if v_status<>'DRAFT' then raise exception 'Settlement sudah masuk tahap pembayaran dan tidak dapat dihitung ulang'; end if;
 end if;
 delete from public.investor_semester_settlement_items where settlement_id=v_id;
 insert into public.investor_semester_settlement_items(settlement_id,investor_id,investment_basis,investment_share_pct,allocated_amount)
 with monthly_totals as (
  select i.investor_id,sum(i.allocated_amount)::numeric(18,2) allocated_amount
  from public.investor_monthly_allocation_items i join public.investor_monthly_allocations a on a.id=i.allocation_id
  where a.month_start>=v_start and a.month_start<v_end group by i.investor_id
 ), last_basis as (
  select distinct on(i.investor_id) i.investor_id,i.investment_basis
  from public.investor_monthly_allocation_items i join public.investor_monthly_allocations a on a.id=i.allocation_id
  where a.month_start>=v_start and a.month_start<v_end order by i.investor_id,a.month_start desc
 )
 select v_id,m.investor_id,coalesce(b.investment_basis,0),case when v_pool>0 then (m.allocated_amount/v_pool*100)::numeric(12,8) else 0 end,m.allocated_amount
 from monthly_totals m left join last_basis b on b.investor_id=m.investor_id;
 return v_id;
end; $$;
revoke all on function public.generate_investor_semester_settlement(integer,smallint) from public,anon;
grant execute on function public.generate_investor_semester_settlement(integer,smallint) to authenticated;
create or replace function public.record_investor_semester_payment(p_settlement_item_id uuid,p_amount numeric,p_reference text default null,p_notes text default null)
returns uuid language plpgsql set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_item public.investor_semester_settlement_items%rowtype; v_payment uuid; v_remaining numeric(18,2); v_settlement uuid; v_status text;
begin
 if not public.is_management() then raise exception 'Akses hanya untuk Management'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Nominal pembayaran harus lebih dari nol'; end if;
 select * into v_item from public.investor_semester_settlement_items where id=p_settlement_item_id for update;
 if not found then raise exception 'Data hak investor tidak ditemukan'; end if;
 select settlement_id into v_settlement from public.investor_semester_settlement_items where id=p_settlement_item_id;
 select status into v_status from public.investor_semester_settlements where id=v_settlement for update;
 if v_status not in ('READY_TO_SETTLE','PARTIALLY_PAID') then raise exception 'Settlement harus ditandai READY_TO_SETTLE sebelum pembayaran dicatat'; end if;
 v_remaining:=v_item.allocated_amount-v_item.paid_amount;
 if p_amount>v_remaining then raise exception 'Pembayaran melebihi sisa kewajiban sebesar %',v_remaining; end if;
 insert into public.investor_semester_payments(settlement_item_id,amount,paid_by,payment_reference,notes)
 values(p_settlement_item_id,p_amount,auth.uid(),nullif(trim(p_reference),''),nullif(trim(p_notes),'')) returning id into v_payment;
 update public.investor_semester_settlement_items set paid_amount=paid_amount+p_amount,payment_status=case when paid_amount+p_amount>=allocated_amount then 'PAID' else 'PARTIALLY_PAID' end where id=p_settlement_item_id;
 update public.investor_semester_settlements s set status=case
  when not exists(select 1 from public.investor_semester_settlement_items x where x.settlement_id=s.id and x.paid_amount<x.allocated_amount) then 'PAID'
  when exists(select 1 from public.investor_semester_settlement_items x where x.settlement_id=s.id and x.paid_amount>0) then 'PARTIALLY_PAID'
  else s.status end where s.id=v_settlement;
 return v_payment;
end; $$;
revoke all on function public.record_investor_semester_payment(uuid,numeric,text,text) from public,anon;
grant execute on function public.record_investor_semester_payment(uuid,numeric,text,text) to authenticated;
create or replace function public.mark_investor_semester_ready(p_settlement_id uuid)
returns void language plpgsql set search_path to 'pg_catalog','public','pg_temp' as $$
begin
 if not public.is_management() then raise exception 'Akses hanya untuk Management'; end if;
 update public.investor_semester_settlements set status='READY_TO_SETTLE',finalized_at=now() where id=p_settlement_id and status='DRAFT';
 if not found then raise exception 'Settlement tidak ditemukan atau bukan berstatus DRAFT'; end if;
end; $$;
revoke all on function public.mark_investor_semester_ready(uuid) from public,anon;
grant execute on function public.mark_investor_semester_ready(uuid) to authenticated;
create or replace view public.investor_semester_report with (security_invoker=true) as
select s.id settlement_id,s.fiscal_year,s.semester,s.period_start,s.period_end,s.total_management_profit,s.total_investor_pool,s.total_payable,s.status settlement_status,
 i.id settlement_item_id,i.investor_id,v.investor_name,i.investment_basis,i.investment_share_pct,i.allocated_amount,i.paid_amount,(i.allocated_amount-i.paid_amount) remaining_amount,i.payment_status
from public.investor_semester_settlements s join public.investor_semester_settlement_items i on i.settlement_id=s.id join public.investors v on v.id=i.investor_id;
grant select on public.investor_semester_report to authenticated;

-- Prevent monthly recalculation after the semester has been closed for settlement.
create or replace function public.generate_investor_monthly_allocation(p_month_start date)
returns uuid language plpgsql set search_path to 'pg_catalog','public','pg_temp' as $function$
declare
 v_month_start date := date_trunc('month',p_month_start)::date;
 v_month_end date := (date_trunc('month',p_month_start)+interval '1 month')::date;
 v_profit numeric(18,2); v_total_investment numeric(18,2); v_pool numeric(18,2); v_allocation_id uuid; v_status text; v_semester_status text;
begin
 if p_month_start is null then raise exception 'Bulan wajib diisi'; end if;
 if not public.is_management() then raise exception 'Akses hanya untuk Management'; end if;
 select status into v_semester_status from public.investor_semester_settlements where fiscal_year=extract(year from v_month_start)::integer and semester=case when extract(month from v_month_start)<=6 then 1 else 2 end;
 if v_semester_status in ('READY_TO_SETTLE','PARTIALLY_PAID','PAID') then raise exception 'Periode semester sudah ditutup untuk settlement; laporan bulanan tidak dapat dihitung ulang'; end if;
 select coalesce(sum(coalesce(s.gross_profit,s.sale_price-s.discount-s.cost)),0)::numeric(18,2) into v_profit from public.sales_transactions s join public.stock_units su on su.id=s.stock_unit_id where su.source_type='MANAGEMENT' and su.status='SOLD' and (s.sold_at at time zone 'Asia/Makassar')>=v_month_start::timestamp and (s.sold_at at time zone 'Asia/Makassar')<v_month_end::timestamp;
 v_profit:=greatest(v_profit,0); v_pool:=round(v_profit*0.10,2);
 select coalesce(sum(greatest(net_investment,0)),0)::numeric(18,2) into v_total_investment from (select sum(case when m.movement_type='CONTRIBUTION' then m.amount when m.movement_type='WITHDRAWAL' then -m.amount else 0 end) net_investment from public.investor_capital_movements m join public.investors i on i.id=m.investor_id and i.active=true where m.status='POSTED' and m.effective_date<v_month_end group by m.investor_id) balances;
 insert into public.investor_monthly_allocations(month_start,management_profit,allocation_rate,investor_pool,total_investment,status,generated_at,generated_by) values(v_month_start,v_profit,10,v_pool,v_total_investment,'DRAFT',now(),auth.uid()) on conflict(month_start) do update set management_profit=excluded.management_profit,allocation_rate=excluded.allocation_rate,investor_pool=excluded.investor_pool,total_investment=excluded.total_investment,generated_at=now(),generated_by=auth.uid() where public.investor_monthly_allocations.status='DRAFT' returning id,status into v_allocation_id,v_status;
 if v_allocation_id is null then select id,status into v_allocation_id,v_status from public.investor_monthly_allocations where month_start=v_month_start; if v_status='FINALIZED' then raise exception 'Laporan bulan ini sudah FINALIZED dan tidak dapat dihitung ulang'; end if; raise exception 'Gagal membuat alokasi bulanan'; end if;
 delete from public.investor_monthly_allocation_items where allocation_id=v_allocation_id;
 if v_total_investment>0 then insert into public.investor_monthly_allocation_items(allocation_id,investor_id,investment_basis,investment_share_pct,allocated_amount) select v_allocation_id,i.id,greatest(coalesce(sum(case when m.movement_type='CONTRIBUTION' then m.amount when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0),0)::numeric(18,2),(greatest(coalesce(sum(case when m.movement_type='CONTRIBUTION' then m.amount when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0),0)/v_total_investment*100)::numeric(12,8),round(v_pool*greatest(coalesce(sum(case when m.movement_type='CONTRIBUTION' then m.amount when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0),0)/v_total_investment,2)::numeric(18,2) from public.investors i join public.investor_capital_movements m on m.investor_id=i.id where i.active=true and m.status='POSTED' and m.effective_date<v_month_end group by i.id having greatest(sum(case when m.movement_type='CONTRIBUTION' then m.amount when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0)>0; end if;
 return v_allocation_id;
end; $function$;
