-- Stock Sumber Management: investor portal, capital ledger, monthly profit allocation.
-- Investor entitlement: 10% of realized profit from MANAGEMENT-source stock only.
-- Investor share: (investor net capital / total active investor net capital) x investor pool.

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  investor_name text not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investor_user_access (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (investor_id, user_id),
  unique (user_id)
);

create table if not exists public.investor_capital_movements (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete restrict,
  movement_type text not null check (movement_type in ('CONTRIBUTION','WITHDRAWAL')),
  amount numeric(18,2) not null check (amount > 0),
  effective_date date not null default current_date,
  reference_no text,
  notes text,
  status text not null default 'POSTED' check (status in ('DRAFT','POSTED','VOID')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.investor_monthly_allocations (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique,
  management_profit numeric(18,2) not null default 0,
  allocation_rate numeric(7,4) not null default 10 check (allocation_rate >= 0 and allocation_rate <= 100),
  investor_pool numeric(18,2) not null default 0,
  total_investment numeric(18,2) not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT','FINALIZED')),
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id),
  finalized_at timestamptz
);

create table if not exists public.investor_monthly_allocation_items (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.investor_monthly_allocations(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete restrict,
  investment_basis numeric(18,2) not null default 0,
  investment_share_pct numeric(12,8) not null default 0,
  allocated_amount numeric(18,2) not null default 0,
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID')),
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  payment_reference text,
  unique (allocation_id, investor_id)
);

create index if not exists idx_investor_user_access_user on public.investor_user_access(user_id) where active;
create index if not exists idx_investor_capital_movements_investor_date on public.investor_capital_movements(investor_id,effective_date) where status='POSTED';
create index if not exists idx_investor_allocation_items_investor on public.investor_monthly_allocation_items(investor_id,allocation_id);

alter table public.investors enable row level security;
alter table public.investor_user_access enable row level security;
alter table public.investor_capital_movements enable row level security;
alter table public.investor_monthly_allocations enable row level security;
alter table public.investor_monthly_allocation_items enable row level security;

-- Investors: self-read, Management controls all writes.
drop policy if exists investors_management_all on public.investors;
drop policy if exists investors_self_read on public.investors;
drop policy if exists investors_select on public.investors;
drop policy if exists investors_insert on public.investors;
drop policy if exists investors_update on public.investors;
drop policy if exists investors_delete on public.investors;
create policy investors_select on public.investors for select to authenticated
using (public.is_management() or exists (
  select 1 from public.investor_user_access a
  where a.investor_id=investors.id and a.user_id=(select auth.uid()) and a.active=true
));
create policy investors_insert on public.investors for insert to authenticated with check (public.is_management());
create policy investors_update on public.investors for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investors_delete on public.investors for delete to authenticated using (public.is_management());

drop policy if exists investor_user_access_management_all on public.investor_user_access;
drop policy if exists investor_user_access_self_read on public.investor_user_access;
drop policy if exists investor_user_access_select on public.investor_user_access;
drop policy if exists investor_user_access_insert on public.investor_user_access;
drop policy if exists investor_user_access_update on public.investor_user_access;
drop policy if exists investor_user_access_delete on public.investor_user_access;
create policy investor_user_access_select on public.investor_user_access for select to authenticated
using (public.is_management() or (user_id=(select auth.uid()) and active=true));
create policy investor_user_access_insert on public.investor_user_access for insert to authenticated with check (public.is_management());
create policy investor_user_access_update on public.investor_user_access for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investor_user_access_delete on public.investor_user_access for delete to authenticated using (public.is_management());

drop policy if exists investor_capital_management_all on public.investor_capital_movements;
drop policy if exists investor_capital_self_read on public.investor_capital_movements;
drop policy if exists investor_capital_select on public.investor_capital_movements;
drop policy if exists investor_capital_insert on public.investor_capital_movements;
drop policy if exists investor_capital_update on public.investor_capital_movements;
drop policy if exists investor_capital_delete on public.investor_capital_movements;
create policy investor_capital_select on public.investor_capital_movements for select to authenticated
using (public.is_management() or exists (
  select 1 from public.investor_user_access a
  where a.investor_id=investor_capital_movements.investor_id
    and a.user_id=(select auth.uid()) and a.active=true
));
create policy investor_capital_insert on public.investor_capital_movements for insert to authenticated with check (public.is_management());
create policy investor_capital_update on public.investor_capital_movements for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investor_capital_delete on public.investor_capital_movements for delete to authenticated using (public.is_management());

drop policy if exists investor_monthly_management_all on public.investor_monthly_allocations;
drop policy if exists investor_monthly_self_read on public.investor_monthly_allocations;
drop policy if exists investor_monthly_allocations_select on public.investor_monthly_allocations;
drop policy if exists investor_monthly_allocations_insert on public.investor_monthly_allocations;
drop policy if exists investor_monthly_allocations_update on public.investor_monthly_allocations;
drop policy if exists investor_monthly_allocations_delete on public.investor_monthly_allocations;
create policy investor_monthly_allocations_select on public.investor_monthly_allocations for select to authenticated
using (public.is_management() or exists (
  select 1 from public.investor_monthly_allocation_items i
  join public.investor_user_access a on a.investor_id=i.investor_id
  where i.allocation_id=investor_monthly_allocations.id
    and a.user_id=(select auth.uid()) and a.active=true
));
create policy investor_monthly_allocations_insert on public.investor_monthly_allocations for insert to authenticated with check (public.is_management());
create policy investor_monthly_allocations_update on public.investor_monthly_allocations for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investor_monthly_allocations_delete on public.investor_monthly_allocations for delete to authenticated using (public.is_management());

drop policy if exists investor_monthly_items_management_all on public.investor_monthly_allocation_items;
drop policy if exists investor_monthly_items_self_read on public.investor_monthly_allocation_items;
drop policy if exists investor_monthly_items_select on public.investor_monthly_allocation_items;
drop policy if exists investor_monthly_items_insert on public.investor_monthly_allocation_items;
drop policy if exists investor_monthly_items_update on public.investor_monthly_allocation_items;
drop policy if exists investor_monthly_items_delete on public.investor_monthly_allocation_items;
create policy investor_monthly_items_select on public.investor_monthly_allocation_items for select to authenticated
using (public.is_management() or exists (
  select 1 from public.investor_user_access a
  where a.investor_id=investor_monthly_allocation_items.investor_id
    and a.user_id=(select auth.uid()) and a.active=true
));
create policy investor_monthly_items_insert on public.investor_monthly_allocation_items for insert to authenticated with check (public.is_management());
create policy investor_monthly_items_update on public.investor_monthly_allocation_items for update to authenticated using (public.is_management()) with check (public.is_management());
create policy investor_monthly_items_delete on public.investor_monthly_allocation_items for delete to authenticated using (public.is_management());

-- An investor account can read only MANAGEMENT-source stock, even if it is also mapped to another team role.
drop policy if exists stock_units_investor_management_source_read on public.stock_units;
create policy stock_units_investor_management_source_read on public.stock_units for select to authenticated
using (source_type='MANAGEMENT' and exists (
  select 1 from public.investor_user_access a
  join public.investors i on i.id=a.investor_id
  where a.user_id=(select auth.uid()) and a.active=true and i.active=true
));
drop policy if exists sales_transactions_investor_management_source_read on public.sales_transactions;
create policy sales_transactions_investor_management_source_read on public.sales_transactions for select to authenticated
using (exists (
  select 1 from public.stock_units su
  where su.id=sales_transactions.stock_unit_id and su.source_type='MANAGEMENT'
) and exists (
  select 1 from public.investor_user_access a
  join public.investors i on i.id=a.investor_id
  where a.user_id=(select auth.uid()) and a.active=true and i.active=true
));
drop policy if exists product_master_investor_management_source_read on public.product_master;
create policy product_master_investor_management_source_read on public.product_master for select to authenticated
using (exists (
  select 1 from public.stock_units su
  where su.product_id=product_master.id and su.source_type='MANAGEMENT'
) and exists (
  select 1 from public.investor_user_access a
  join public.investors i on i.id=a.investor_id
  where a.user_id=(select auth.uid()) and a.active=true and i.active=true
));

-- Restrictive policies prevent an investor-linked account from inheriting any permissive Stockist read policy.
drop policy if exists investor_accounts_limit_stock_units_to_management_source on public.stock_units;
create policy investor_accounts_limit_stock_units_to_management_source on public.stock_units as restrictive
for select to authenticated using (
  public.is_management()
  or not exists (select 1 from public.investor_user_access a where a.user_id=(select auth.uid()) and a.active=true)
  or source_type='MANAGEMENT'
);
drop policy if exists investor_accounts_limit_sales_to_management_source on public.sales_transactions;
create policy investor_accounts_limit_sales_to_management_source on public.sales_transactions as restrictive
for select to authenticated using (
  public.is_management()
  or not exists (select 1 from public.investor_user_access a where a.user_id=(select auth.uid()) and a.active=true)
  or exists (select 1 from public.stock_units su where su.id=sales_transactions.stock_unit_id and su.source_type='MANAGEMENT')
);
drop policy if exists investor_accounts_limit_product_master_to_management_source on public.product_master;
create policy investor_accounts_limit_product_master_to_management_source on public.product_master as restrictive
for select to authenticated using (
  public.is_management()
  or not exists (select 1 from public.investor_user_access a where a.user_id=(select auth.uid()) and a.active=true)
  or exists (select 1 from public.stock_units su where su.product_id=product_master.id and su.source_type='MANAGEMENT')
);

create or replace view public.investor_management_stock_monitor with (security_invoker=true) as
select su.id as stock_unit_id, su.product_id, pm.category, pm.product, pm.variant,
       coalesce(su.color,pm.color) as color, coalesce(su.grade,pm.grade) as grade,
       su.battery_health, su.cost as capital_cost, su.asking_price, su.status,
       su.outlet as current_outlet, su.received_at, su.sold_at, su.sold_price, su.updated_at
from public.stock_units su
left join public.product_master pm on pm.id=su.product_id
where su.source_type='MANAGEMENT';

create or replace view public.investor_management_sales_detail with (security_invoker=true) as
select s.id as sales_transaction_id, s.stock_unit_id, s.sold_at,
       coalesce(s.outlet,su.outlet) as sold_outlet,
       pm.category,pm.product,pm.variant,coalesce(su.color,pm.color) as color,
       coalesce(su.grade,pm.grade) as grade,su.cost as capital_cost,s.sale_price,s.discount,
       coalesce(s.gross_profit,s.sale_price-s.discount-s.cost) as realized_profit,
       round(greatest(coalesce(s.gross_profit,s.sale_price-s.discount-s.cost),0)*0.10,2) as investor_pool_reference
from public.sales_transactions s
join public.stock_units su on su.id=s.stock_unit_id
left join public.product_master pm on pm.id=su.product_id
where su.source_type='MANAGEMENT' and su.status='SOLD';

create or replace view public.investor_portfolio_summary with (security_invoker=true) as
select i.id as investor_id,i.investor_name,
       coalesce(sum(case when m.movement_type='CONTRIBUTION' then m.amount
                         when m.movement_type='WITHDRAWAL' then -m.amount else 0 end)
         filter (where m.status='POSTED'),0)::numeric(18,2) as net_investment
from public.investors i
left join public.investor_capital_movements m on m.investor_id=i.id
where i.active=true
group by i.id,i.investor_name;

create or replace view public.investor_monthly_report with (security_invoker=true) as
select a.id as allocation_id,a.month_start,a.management_profit,a.allocation_rate,
       a.investor_pool,a.total_investment,a.status as allocation_status,
       i.investor_id,v.investor_name,i.investment_basis,i.investment_share_pct,
       i.allocated_amount,i.payment_status,i.paid_at,i.payment_reference
from public.investor_monthly_allocations a
join public.investor_monthly_allocation_items i on i.allocation_id=a.id
join public.investors v on v.id=i.investor_id;

create or replace function public.generate_investor_monthly_allocation(p_month_start date)
returns uuid language plpgsql security invoker
set search_path=pg_catalog,public,pg_temp
as $$
declare
  v_month_start date := date_trunc('month',p_month_start)::date;
  v_month_end date := (date_trunc('month',p_month_start)+interval '1 month')::date;
  v_profit numeric(18,2); v_total_investment numeric(18,2); v_pool numeric(18,2);
  v_allocation_id uuid; v_status text;
begin
  if p_month_start is null then raise exception 'Bulan wajib diisi'; end if;
  if not public.is_management() then raise exception 'Akses hanya untuk Management'; end if;

  select coalesce(sum(coalesce(s.gross_profit,s.sale_price-s.discount-s.cost)),0)::numeric(18,2)
  into v_profit
  from public.sales_transactions s
  join public.stock_units su on su.id=s.stock_unit_id
  where su.source_type='MANAGEMENT' and su.status='SOLD'
    and (s.sold_at at time zone 'Asia/Makassar')>=v_month_start::timestamp
    and (s.sold_at at time zone 'Asia/Makassar')<v_month_end::timestamp;
  v_profit:=greatest(v_profit,0);
  v_pool:=round(v_profit*0.10,2);

  select coalesce(sum(greatest(net_investment,0)),0)::numeric(18,2)
  into v_total_investment
  from (
    select sum(case when m.movement_type='CONTRIBUTION' then m.amount
                    when m.movement_type='WITHDRAWAL' then -m.amount else 0 end) net_investment
    from public.investor_capital_movements m
    join public.investors i on i.id=m.investor_id and i.active=true
    where m.status='POSTED' and m.effective_date<v_month_end
    group by m.investor_id
  ) balances;

  insert into public.investor_monthly_allocations
    (month_start,management_profit,allocation_rate,investor_pool,total_investment,status,generated_at,generated_by)
  values (v_month_start,v_profit,10,v_pool,v_total_investment,'DRAFT',now(),auth.uid())
  on conflict (month_start) do update set
    management_profit=excluded.management_profit,allocation_rate=excluded.allocation_rate,
    investor_pool=excluded.investor_pool,total_investment=excluded.total_investment,
    generated_at=now(),generated_by=auth.uid()
  where public.investor_monthly_allocations.status='DRAFT'
  returning id,status into v_allocation_id,v_status;

  if v_allocation_id is null then
    select id,status into v_allocation_id,v_status from public.investor_monthly_allocations where month_start=v_month_start;
    if v_status='FINALIZED' then raise exception 'Laporan bulan ini sudah FINALIZED dan tidak dapat dihitung ulang'; end if;
    raise exception 'Gagal membuat alokasi bulanan';
  end if;

  delete from public.investor_monthly_allocation_items where allocation_id=v_allocation_id;
  if v_total_investment>0 then
    insert into public.investor_monthly_allocation_items
      (allocation_id,investor_id,investment_basis,investment_share_pct,allocated_amount)
    select v_allocation_id,i.id,
      greatest(sum(case when m.movement_type='CONTRIBUTION' then m.amount
                        when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0)::numeric(18,2),
      (greatest(sum(case when m.movement_type='CONTRIBUTION' then m.amount
                         when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0)
        /v_total_investment*100)::numeric(12,8),
      round(v_pool*greatest(sum(case when m.movement_type='CONTRIBUTION' then m.amount
                                     when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0)
        /v_total_investment,2)::numeric(18,2)
    from public.investors i
    join public.investor_capital_movements m on m.investor_id=i.id
    where i.active=true and m.status='POSTED' and m.effective_date<v_month_end
    group by i.id
    having greatest(sum(case when m.movement_type='CONTRIBUTION' then m.amount
                             when m.movement_type='WITHDRAWAL' then -m.amount else 0 end),0)>0;
  end if;
  return v_allocation_id;
end;
$$;

revoke all on function public.generate_investor_monthly_allocation(date) from public,anon;
grant execute on function public.generate_investor_monthly_allocation(date) to authenticated;

grant select on public.investors,public.investor_user_access,public.investor_capital_movements,
  public.investor_monthly_allocations,public.investor_monthly_allocation_items,
  public.investor_management_stock_monitor,public.investor_management_sales_detail,
  public.investor_portfolio_summary,public.investor_monthly_report to authenticated;
grant insert,update,delete on public.investors,public.investor_user_access,
  public.investor_capital_movements,public.investor_monthly_allocations,
  public.investor_monthly_allocation_items to authenticated;

comment on table public.investors is 'Master investor Stock Sumber Management.';
comment on table public.investor_capital_movements is 'Setoran dan penarikan modal investor; hanya Management dapat menulis.';
comment on table public.investor_monthly_allocations is 'Snapshot bulanan laba stok MANAGEMENT dan pool investor 10%.';
comment on table public.investor_monthly_allocation_items is 'Snapshot hak keuntungan per investor berdasarkan proporsi modal.';
comment on view public.investor_management_stock_monitor is 'Monitoring read-only stok source_type MANAGEMENT; tanpa IMEI dan tanpa stok Stockist.';
comment on view public.investor_management_sales_detail is 'Rincian penjualan stok MANAGEMENT per produk dan outlet.';
