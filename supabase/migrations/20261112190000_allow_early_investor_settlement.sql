-- Early partial settlement support. Only closed months with monthly reports can be batched.
create table if not exists public.investor_semester_settlement_months (
 id uuid primary key default gen_random_uuid(),
 settlement_id uuid not null references public.investor_semester_settlements(id) on delete cascade,
 monthly_allocation_id uuid not null references public.investor_monthly_allocations(id),
 month_start date not null, created_at timestamptz not null default now(),
 unique(monthly_allocation_id)
);
alter table public.investor_semester_settlements drop constraint if exists investor_semester_settlements_fiscal_year_semester_key;
alter table public.investor_semester_settlements add column if not exists batch_number integer;
create unique index if not exists investor_semester_settlements_batch_number_uq on public.investor_semester_settlements(fiscal_year,semester,batch_number) where batch_number is not null;
create index if not exists idx_investor_settlement_months_settlement on public.investor_semester_settlement_months(settlement_id);
alter table public.investor_semester_settlement_months enable row level security;
drop policy if exists investor_settlement_months_select on public.investor_semester_settlement_months;
create policy investor_settlement_months_select on public.investor_semester_settlement_months for select to authenticated using(public.is_management() or exists(select 1 from public.investor_semester_settlement_items si join public.investor_user_access ua on ua.investor_id=si.investor_id join public.investor_semester_settlement_months sm on sm.settlement_id=si.settlement_id where sm.id=investor_semester_settlement_months.id and ua.user_id=(select auth.uid()) and ua.active=true));
drop policy if exists investor_settlement_months_insert on public.investor_semester_settlement_months;
create policy investor_settlement_months_insert on public.investor_semester_settlement_months for insert to authenticated with check(public.is_management());
drop policy if exists investor_settlement_months_delete on public.investor_semester_settlement_months;
create policy investor_settlement_months_delete on public.investor_semester_settlement_months for delete to authenticated using(public.is_management());
grant select on public.investor_semester_settlement_months to authenticated;

create or replace function public.generate_investor_semester_settlement(p_fiscal_year integer,p_semester smallint)
returns uuid language plpgsql security definer set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_start date;v_end date;v_cutoff date;v_id uuid;v_profit numeric(18,2);v_pool numeric(18,2);v_count integer;v_batch integer;v_existing uuid;
begin
 if not public.is_management() then raise exception 'Akses hanya untuk Management';end if;
 if p_fiscal_year is null or p_fiscal_year<2000 or p_semester not in(1,2) then raise exception 'Tahun dan semester tidak valid';end if;
 perform pg_advisory_xact_lock(hashtext('investor-semester-'||p_fiscal_year||'-'||p_semester));
 v_start:=make_date(p_fiscal_year,case when p_semester=1 then 1 else 7 end,1);v_end:=case when p_semester=1 then make_date(p_fiscal_year,7,1) else make_date(p_fiscal_year+1,1,1) end;v_cutoff:=date_trunc('month',now() at time zone 'Asia/Makassar')::date;
 select s.id into v_existing from public.investor_semester_settlements s where s.fiscal_year=p_fiscal_year and s.semester=p_semester and s.status='DRAFT' and exists(select 1 from public.investor_semester_settlement_months sm where sm.settlement_id=s.id) order by s.generated_at desc limit 1;
 select count(*),coalesce(sum(a.management_profit),0),coalesce(sum(a.investor_pool),0) into v_count,v_profit,v_pool from public.investor_monthly_allocations a where a.month_start>=v_start and a.month_start<v_end and a.month_start<v_cutoff and not exists(select 1 from public.investor_semester_settlement_months sm where sm.monthly_allocation_id=a.id);
 if v_count=0 then if v_existing is not null then return v_existing;end if;raise exception 'Belum ada laporan bulan yang sudah tutup dan belum pernah disettlement';end if;
 select coalesce(max(batch_number),0)+1 into v_batch from public.investor_semester_settlements where fiscal_year=p_fiscal_year and semester=p_semester;
 insert into public.investor_semester_settlements(fiscal_year,semester,period_start,period_end,total_management_profit,total_investor_pool,total_payable,status,generated_at,generated_by,batch_number)
 values(p_fiscal_year,p_semester,
 (select min(a.month_start) from public.investor_monthly_allocations a where a.month_start>=v_start and a.month_start<v_end and a.month_start<v_cutoff and not exists(select 1 from public.investor_semester_settlement_months sm where sm.monthly_allocation_id=a.id)),
 (select (max(a.month_start)+interval '1 month - 1 day')::date from public.investor_monthly_allocations a where a.month_start>=v_start and a.month_start<v_end and a.month_start<v_cutoff and not exists(select 1 from public.investor_semester_settlement_months sm where sm.monthly_allocation_id=a.id)),
 v_profit,v_pool,v_pool,'DRAFT',now(),auth.uid(),v_batch) returning id into v_id;
 insert into public.investor_semester_settlement_months(settlement_id,monthly_allocation_id,month_start) select v_id,a.id,a.month_start from public.investor_monthly_allocations a where a.month_start>=v_start and a.month_start<v_end and a.month_start<v_cutoff and not exists(select 1 from public.investor_semester_settlement_months sm where sm.monthly_allocation_id=a.id);
 insert into public.investor_semester_settlement_items(settlement_id,investor_id,investment_basis,investment_share_pct,allocated_amount)
 with monthly_totals as(select i.investor_id,sum(i.allocated_amount)::numeric(18,2) allocated_amount from public.investor_monthly_allocation_items i join public.investor_monthly_allocations a on a.id=i.allocation_id join public.investor_semester_settlement_months sm on sm.monthly_allocation_id=a.id and sm.settlement_id=v_id group by i.investor_id),
 last_basis as(select distinct on(i.investor_id)i.investor_id,i.investment_basis from public.investor_monthly_allocation_items i join public.investor_monthly_allocations a on a.id=i.allocation_id join public.investor_semester_settlement_months sm on sm.monthly_allocation_id=a.id and sm.settlement_id=v_id order by i.investor_id,a.month_start desc)
 select v_id,m.investor_id,coalesce(b.investment_basis,0),case when v_pool>0 then(m.allocated_amount/v_pool*100)::numeric(12,8)else 0 end,m.allocated_amount from monthly_totals m left join last_basis b on b.investor_id=m.investor_id;
 return v_id;
end;$$;
revoke all on function public.generate_investor_semester_settlement(integer,smallint) from public,anon;
grant execute on function public.generate_investor_semester_settlement(integer,smallint) to authenticated;

create or replace function public.generate_investor_monthly_allocation(p_month_start date)
returns uuid language plpgsql security definer set search_path to 'pg_catalog','public','pg_temp' as $function$
declare v_month_start date:=date_trunc('month',p_month_start)::date;v_month_end date:=(date_trunc('month',p_month_start)+interval '1 month')::date;v_profit numeric(18,2);v_total_investment numeric(18,2);v_pool numeric(18,2);v_allocation_id uuid;v_status text;
begin
 if p_month_start is null then raise exception 'Bulan wajib diisi';end if;if not public.is_management() then raise exception 'Akses hanya untuk Management';end if;
 if exists(select 1 from public.investor_semester_settlement_months where month_start=v_month_start)then raise exception 'Bulan ini sudah masuk batch settlement dan tidak dapat dihitung ulang';end if;
 select coalesce(sum(coalesce(s.gross_profit,s.sale_price-s.discount-s.cost)),0)::numeric(18,2) into v_profit from public.sales_transactions s join public.stock_units su on su.id=s.stock_unit_id where su.source_type='MANAGEMENT' and su.status='SOLD' and(s.sold_at at time zone 'Asia/Makassar')>=v_month_start::timestamp and(s.sold_at at time zone 'Asia/Makassar')<v_month_end::timestamp;
 v_profit:=greatest(v_profit,0);v_pool:=round(v_profit*0.10,2);
 select coalesce(sum(greatest(net_investment,0)),0)::numeric(18,2) into v_total_investment from(select sum(case when m.movement_type='CONTRIBUTION'then m.amount when m.movement_type='WITHDRAWAL'then-m.amount else 0 end)net_investment from public.investor_capital_movements m join public.investors i on i.id=m.investor_id and i.active=true where m.status='POSTED' and m.effective_date<v_month_end group by m.investor_id)balances;
 insert into public.investor_monthly_allocations(month_start,management_profit,allocation_rate,investor_pool,total_investment,status,generated_at,generated_by)values(v_month_start,v_profit,10,v_pool,v_total_investment,'DRAFT',now(),auth.uid())on conflict(month_start)do update set management_profit=excluded.management_profit,allocation_rate=excluded.allocation_rate,investor_pool=excluded.investor_pool,total_investment=excluded.total_investment,generated_at=now(),generated_by=auth.uid()where public.investor_monthly_allocations.status='DRAFT'returning id,status into v_allocation_id,v_status;
 if v_allocation_id is null then select id,status into v_allocation_id,v_status from public.investor_monthly_allocations where month_start=v_month_start;if v_status='FINALIZED'then raise exception 'Laporan bulan ini sudah FINALIZED dan tidak dapat dihitung ulang';end if;raise exception 'Gagal membuat alokasi bulanan';end if;
 delete from public.investor_monthly_allocation_items where allocation_id=v_allocation_id;
 if v_total_investment>0 then insert into public.investor_monthly_allocation_items(allocation_id,investor_id,investment_basis,investment_share_pct,allocated_amount)select v_allocation_id,i.id,greatest(coalesce(sum(case when m.movement_type='CONTRIBUTION'then m.amount when m.movement_type='WITHDRAWAL'then-m.amount else 0 end),0),0)::numeric(18,2),(greatest(coalesce(sum(case when m.movement_type='CONTRIBUTION'then m.amount when m.movement_type='WITHDRAWAL'then-m.amount else 0 end),0),0)/v_total_investment*100)::numeric(12,8),round(v_pool*greatest(coalesce(sum(case when m.movement_type='CONTRIBUTION'then m.amount when m.movement_type='WITHDRAWAL'then-m.amount else 0 end),0),0)/v_total_investment,2)::numeric(18,2)from public.investors i join public.investor_capital_movements m on m.investor_id=i.id where i.active=true and m.status='POSTED' and m.effective_date<v_month_end group by i.id having greatest(sum(case when m.movement_type='CONTRIBUTION'then m.amount when m.movement_type='WITHDRAWAL'then-m.amount else 0 end),0)>0;end if;return v_allocation_id;
end;$function$;
revoke all on function public.generate_investor_monthly_allocation(date) from public,anon;
grant execute on function public.generate_investor_monthly_allocation(date) to authenticated;

create or replace view public.investor_semester_report with(security_invoker=true)as
select s.id settlement_id,s.fiscal_year,s.semester,s.period_start,s.period_end,s.total_management_profit,s.total_investor_pool,s.total_payable,s.status settlement_status,i.investor_id,v.investor_name,i.investment_basis,i.investment_share_pct,i.allocated_amount,i.paid_amount,(i.allocated_amount-i.paid_amount)remaining_amount,i.payment_status,i.id settlement_item_id,s.batch_number
from public.investor_semester_settlements s join public.investor_semester_settlement_items i on i.settlement_id=s.id join public.investors v on v.id=i.investor_id;
grant select on public.investor_semester_report to authenticated;