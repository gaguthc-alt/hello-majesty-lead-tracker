alter table public.stock_movements
  add column if not exists source_type_snapshot text;

update public.stock_movements sm
set source_type_snapshot=su.source_type
from public.stock_units su
where su.id=sm.stock_unit_id
  and sm.source_type_snapshot is null;

create or replace function public.guard_stock_source_type_immutable()
returns trigger
language plpgsql
set search_path=pg_catalog,public,pg_temp
as $$
begin
  if old.source_type is distinct from new.source_type then
    raise exception 'Sumber kepemilikan stok tidak boleh diubah setelah barang tercatat. Buat proses koreksi sumber melalui Management dengan audit khusus.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_stock_source_type_immutable on public.stock_units;
create trigger trg_guard_stock_source_type_immutable
before update of source_type on public.stock_units
for each row execute function public.guard_stock_source_type_immutable();

create or replace function public.log_stock_received()
returns trigger
language plpgsql
set search_path=public
as $$
begin
 insert into public.stock_movements(stock_unit_id,movement_type,from_status,to_status,actor_user_id,note,source_type_snapshot)
 values(new.id,'RECEIVED',null,new.status,auth.uid(),coalesce(new.received_source_note,new.receipt_ref),new.source_type);
 return new;
end;
$$;

create or replace function public.log_stock_source_snapshot()
returns trigger
language plpgsql
set search_path=pg_catalog,public,pg_temp
as $$
begin
  if new.source_type_snapshot is null then
    select su.source_type into new.source_type_snapshot
    from public.stock_units su where su.id=new.stock_unit_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stock_movement_source_snapshot on public.stock_movements;
create trigger trg_stock_movement_source_snapshot
before insert on public.stock_movements
for each row execute function public.log_stock_source_snapshot();

create or replace view public.investor_management_stock_monitor
with (security_invoker=true)
as
select su.id as stock_unit_id,su.product_id,pm.category,pm.product,pm.variant,
 coalesce(su.color,pm.color) as color,coalesce(su.grade,pm.grade) as grade,
 su.battery_health,su.cost as capital_cost,su.asking_price,su.status,
 su.outlet as current_outlet,su.received_at,su.sold_at,su.sold_price,su.updated_at,
 su.source_type as source_type_snapshot,su.receipt_ref,su.received_source_note,
 su.supplier,su.supplier_id,su.partner_name
from public.stock_units su
left join public.product_master pm on pm.id=su.product_id
where su.source_type='MANAGEMENT';