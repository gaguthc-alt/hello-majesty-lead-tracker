CREATE OR REPLACE FUNCTION public.enforce_content_creator_stock_photo_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  cc boolean := false;
  mgmt boolean := false;
  fac boolean := false;
  sales_access boolean := false;
begin
  mgmt := public.is_management();
  fac := public.has_facilitator_inventory_access()
    OR exists (
      select 1 from public.team_profiles p
      where p.user_id = auth.uid() and p.active = true
        and upper(replace(coalesce(p.role,''),'_',' ')) in ('FASILITATOR','DEVELOPER','DEVELOPER APLIKASI')
    );

  select coalesce(tp.can_sales,false)
    into sales_access
  from public.team_profiles p
  join public.team_permissions tp
    on lower(trim(tp.name)) = lower(trim(p.name))
   and lower(trim(tp.outlet)) = lower(trim(p.outlet))
   and tp.active = true
  where p.user_id = auth.uid() and p.active = true
  limit 1;
  sales_access := coalesce(sales_access,false);

  if not mgmt and not fac then
    select exists (
      select 1 from public.team_profiles p
      where p.user_id = auth.uid() and p.active = true
        and (
          upper(replace(coalesce(p.role,''),'_',' ')) = 'CONTENT CREATOR'
          or exists (
            select 1 from public.team_permissions tp
            where tp.active = true
              and lower(trim(tp.name)) = lower(trim(p.name))
              and lower(trim(tp.outlet)) = lower(trim(p.outlet))
              and tp.can_content_creator = true
          )
        )
    ) into cc;
  end if;

  if cc then
    if new.id is distinct from old.id
       or new.product_id is distinct from old.product_id
       or new.outlet is distinct from old.outlet
       or new.imei_1 is distinct from old.imei_1
       or new.imei_2 is distinct from old.imei_2
       or new.grade is distinct from old.grade
       or new.condition is distinct from old.condition
       or new.battery_health is distinct from old.battery_health
       or new.completeness is distinct from old.completeness
       or new.minus is distinct from old.minus
       or new.supplier is distinct from old.supplier
       or new.source_type is distinct from old.source_type
       or new.hunter_user_id is distinct from old.hunter_user_id
       or new.cost is distinct from old.cost
       or new.asking_price is distinct from old.asking_price
       or (not sales_access and (
            new.status is distinct from old.status
         or new.sold_at is distinct from old.sold_at
         or new.sold_price is distinct from old.sold_price
         or new.sold_by_user_id is distinct from old.sold_by_user_id
         or new.sale_id is distinct from old.sale_id
       ))
       or new.received_at is distinct from old.received_at
       or new.notes is distinct from old.notes
       or new.created_at is distinct from old.created_at
       or new.received_source_note is distinct from old.received_source_note
       or new.receipt_ref is distinct from old.receipt_ref
       or new.color is distinct from old.color
       or new.accurate_item_id is distinct from old.accurate_item_id
       or new.accurate_item_no is distinct from old.accurate_item_no
       or new.partner_name is distinct from old.partner_name
       or new.partner_capital_share_pct is distinct from old.partner_capital_share_pct
       or new.partner_profit_share_pct is distinct from old.partner_profit_share_pct
       or new.partner_loss_share_pct is distinct from old.partner_loss_share_pct
    then
      raise exception 'Content Creator hanya boleh mengubah foto unit; proses SOLD hanya untuk akun dengan izin Sales.';
    end if;
  end if;
  return new;
end;
$function$;