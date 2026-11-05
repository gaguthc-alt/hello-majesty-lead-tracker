create or replace function public.get_hunter_checker_stock_catalog()
returns table(
 id uuid, product text, variant text, category text, color text, grade text,
 battery_health integer, asking_price numeric, received_at timestamptz, outlet text,
 source_type text, hunter_names text, checker_names text,
 photo_1 text, photo_2 text, photo_3 text, photo_4 text, photo_5 text
)
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $function$
 select
   s.id, pm.product, pm.variant, pm.category, s.color, s.grade,
   s.battery_health, s.asking_price, s.received_at, s.outlet, s.source_type,
   h.names, c.names, s.photo_1, s.photo_2, s.photo_3, s.photo_4, s.photo_5
 from public.stock_units s
 left join public.product_master pm on pm.id=s.product_id
 left join lateral (
   select string_agg(distinct tp.name, ', ' order by tp.name) as names
   from unnest(array_remove(array[s.hunter_user_id]::uuid[], null) || coalesce(s.hunter_user_ids, '{}'::uuid[])) assigned(user_id)
   join public.team_profiles tp on tp.user_id=assigned.user_id and tp.active=true
 ) h on true
 left join lateral (
   select string_agg(distinct tp.name, ', ' order by tp.name) as names
   from unnest(array_remove(array[s.checker_user_id]::uuid[], null) || coalesce(s.checker_user_ids, '{}'::uuid[])) assigned(user_id)
   join public.team_profiles tp on tp.user_id=assigned.user_id and tp.active=true
 ) c on true
 where s.status='READY'
   and upper(coalesce(s.source_type,'')) in ('MANAGEMENT','STOCKIST')
   and (
     (select auth.uid()) = any(array_remove(array[s.hunter_user_id,s.checker_user_id]::uuid[], null)
       || coalesce(s.hunter_user_ids,'{}'::uuid[]) || coalesce(s.checker_user_ids,'{}'::uuid[]))
     or exists (
       select 1 from public.team_profiles me
       where me.user_id=(select auth.uid()) and me.active=true and me.is_management=true
     )
     or exists (
       select 1 from public.team_profiles me
       where me.user_id=(select auth.uid()) and me.active=true
         and upper(coalesce(me.role,''))='FASILITATOR'
         and me.outlet=s.outlet
     )
   )
   and (h.names is not null or c.names is not null)
 order by s.received_at asc nulls last;
$function$;
revoke all on function public.get_hunter_checker_stock_catalog() from public;
grant execute on function public.get_hunter_checker_stock_catalog() to authenticated;