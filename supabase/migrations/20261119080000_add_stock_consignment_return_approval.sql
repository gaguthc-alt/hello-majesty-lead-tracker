create table if not exists public.stock_consignment_returns (
  id uuid primary key default gen_random_uuid(),
  return_no text not null unique default (
    'RKN-' || to_char(now(),'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))
  ),
  stock_unit_id uuid not null references public.stock_units(id),
  partner_name text not null default 'Majesty Cell',
  from_outlet text not null default 'Majesty Refill Phone',
  to_outlet text not null default 'Majesty Cell',
  status text not null default 'PENDING_APPROVAL'
    check (status in ('PENDING_APPROVAL','APPROVED','REJECTED')),
  reason text not null,
  requested_by uuid not null references public.team_profiles(user_id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.team_profiles(user_id),
  reviewed_at timestamptz,
  review_note text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists stock_consignment_returns_one_pending_per_unit
  on public.stock_consignment_returns(stock_unit_id)
  where status='PENDING_APPROVAL';
create index if not exists stock_consignment_returns_status_requested_idx
  on public.stock_consignment_returns(status, requested_at desc);

alter table public.stock_consignment_returns enable row level security;
revoke all on public.stock_consignment_returns from anon, authenticated;

create or replace function public.hm_request_consignment_return(p_stock_unit_id uuid,p_reason text default 'Pengembalian barang konsinyasi')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.team_profiles%rowtype;
  v_stock public.stock_units%rowtype;
  v_return_id uuid;
  v_return_no text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_profile from public.team_profiles where user_id=v_user and active=true;
  if not found or upper(trim(coalesce(v_profile.name,'')))<>'SAKA'
    or upper(trim(coalesce(v_profile.role,'')))<>'FASILITATOR'
    or upper(trim(coalesce(v_profile.outlet,'')))<>'MAJESTY REFILL PHONE' then
    raise exception 'Pengajuan retur hanya dapat dibuat oleh Saka sebagai Fasilitator Majesty Refill Phone';
  end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Alasan retur wajib diisi'; end if;
  select * into v_stock from public.stock_units where id=p_stock_unit_id for update;
  if not found then raise exception 'Unit stok tidak ditemukan'; end if;
  if v_stock.status<>'READY' then raise exception 'Hanya stok READY yang dapat diajukan retur'; end if;
  if upper(trim(coalesce(v_stock.source_type,''))) not in ('STOCKIST','MAJESTY_CELL')
    or upper(trim(coalesce(v_stock.partner_name,'')))<>'MAJESTY CELL'
    or upper(trim(coalesce(v_stock.outlet,'')))<>'MAJESTY REFILL PHONE' then
    raise exception 'Unit bukan stok konsinyasi Majesty Cell yang berada di Majesty Refill Phone';
  end if;
  insert into public.stock_consignment_returns(stock_unit_id,partner_name,from_outlet,to_outlet,reason,requested_by)
  values(v_stock.id,'Majesty Cell','Majesty Refill Phone','Majesty Cell',trim(p_reason),v_user)
  returning id,return_no into v_return_id,v_return_no;
  update public.stock_units set status='PENDING_APPROVAL',updated_at=now() where id=v_stock.id;
  insert into public.stock_movements(stock_unit_id,movement_type,from_status,to_status,actor_user_id,note,source_type_snapshot)
  values(v_stock.id,'CONSIGNMENT_RETURN_REQUEST','READY','PENDING_APPROVAL',v_user,
    'Pengajuan retur konsinyasi '||v_return_no||' • Majesty Refill Phone → Majesty Cell • '||trim(p_reason),v_stock.source_type);
  return jsonb_build_object('ok',true,'return_id',v_return_id,'return_no',v_return_no,'status','PENDING_APPROVAL');
end;
$$;

create or replace function public.hm_list_consignment_returns()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.team_profiles%rowtype;
  v_is_requester boolean;
  v_is_approver boolean;
  v_rows jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_profile from public.team_profiles where user_id=v_user and active=true;
  if not found then raise exception 'Profil aktif tidak ditemukan'; end if;
  v_is_requester:=upper(trim(coalesce(v_profile.name,'')))='SAKA'
    and upper(trim(coalesce(v_profile.role,'')))='FASILITATOR'
    and upper(trim(coalesce(v_profile.outlet,'')))='MAJESTY REFILL PHONE';
  v_is_approver:=upper(trim(coalesce(v_profile.role,'')))='FASILITATOR'
    and upper(trim(coalesce(v_profile.outlet,'')))='MAJESTY CELL';
  if not (v_is_requester or v_is_approver) then raise exception 'Akses daftar retur konsinyasi tidak diizinkan'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'return_no',r.return_no,'stock_unit_id',r.stock_unit_id,
    'partner_name',r.partner_name,'from_outlet',r.from_outlet,'to_outlet',r.to_outlet,
    'status',r.status,'reason',r.reason,'requested_at',r.requested_at,
    'requested_by',r.requested_by,'reviewed_at',r.reviewed_at,'review_note',r.review_note,
    'product',coalesce(pm.product,'Produk'),'variant',coalesce(pm.variant,''),
    'color',coalesce(s.color,''),'imei_1',s.imei_1,'battery_health',s.battery_health
  ) order by r.requested_at desc),'[]'::jsonb) into v_rows
  from public.stock_consignment_returns r
  join public.stock_units s on s.id=r.stock_unit_id
  left join public.product_master pm on pm.id=s.product_id
  where (v_is_approver and r.status='PENDING_APPROVAL')
    or (v_is_requester and r.requested_by=v_user);
  return v_rows;
end;
$$;

create or replace function public.hm_decide_consignment_return(p_return_id uuid,p_approve boolean,p_note text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.team_profiles%rowtype;
  v_return public.stock_consignment_returns%rowtype;
  v_stock public.stock_units%rowtype;
  v_next_status text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_profile from public.team_profiles where user_id=v_user and active=true;
  if not found or upper(trim(coalesce(v_profile.role,'')))<>'FASILITATOR'
    or upper(trim(coalesce(v_profile.outlet,'')))<>'MAJESTY CELL' then
    raise exception 'Persetujuan retur hanya dapat dilakukan Fasilitator Majesty Cell';
  end if;
  select * into v_return from public.stock_consignment_returns where id=p_return_id for update;
  if not found or v_return.status<>'PENDING_APPROVAL' then raise exception 'Pengajuan retur tidak ditemukan atau sudah diproses'; end if;
  select * into v_stock from public.stock_units where id=v_return.stock_unit_id for update;
  if not found or v_stock.status<>'PENDING_APPROVAL'
    or upper(trim(coalesce(v_stock.partner_name,'')))<>'MAJESTY CELL'
    or upper(trim(coalesce(v_stock.outlet,'')))<>'MAJESTY REFILL PHONE' then
    raise exception 'Posisi/status stok berubah; persetujuan dibatalkan';
  end if;
  v_next_status:=case when p_approve then 'APPROVED' else 'REJECTED' end;
  if p_approve then
    update public.stock_units set outlet='Majesty Cell',status='READY',
      notes=concat_ws(' | ',nullif(notes,''),'Retur konsinyasi disetujui '||v_return.return_no),updated_at=now()
    where id=v_stock.id;
  else
    update public.stock_units set status='READY',updated_at=now() where id=v_stock.id;
  end if;
  insert into public.stock_movements(stock_unit_id,movement_type,from_status,to_status,actor_user_id,note,source_type_snapshot)
  values(v_stock.id,case when p_approve then 'CONSIGNMENT_RETURN_APPROVED' else 'CONSIGNMENT_RETURN_REJECTED' end,
    'PENDING_APPROVAL','READY',v_user,
    case when p_approve then 'Retur konsinyasi disetujui '||v_return.return_no||' • Lokasi stok Majesty Cell'
      else 'Retur konsinyasi ditolak '||v_return.return_no||' • '||coalesce(nullif(trim(p_note),''),'Tanpa catatan') end,
    v_stock.source_type);
  update public.stock_consignment_returns set status=v_next_status,reviewed_by=v_user,reviewed_at=now(),
    review_note=nullif(trim(coalesce(p_note,'')),''),
    applied_at=case when p_approve then now() else null end,updated_at=now()
  where id=v_return.id;
  return jsonb_build_object('ok',true,'return_id',v_return.id,'return_no',v_return.return_no,
    'status',v_next_status,'outlet',case when p_approve then 'Majesty Cell' else 'Majesty Refill Phone' end);
end;
$$;

revoke all on function public.hm_request_consignment_return(uuid,text) from public,anon;
revoke all on function public.hm_list_consignment_returns() from public,anon;
revoke all on function public.hm_decide_consignment_return(uuid,boolean,text) from public,anon;
grant execute on function public.hm_request_consignment_return(uuid,text) to authenticated;
grant execute on function public.hm_list_consignment_returns() to authenticated;
grant execute on function public.hm_decide_consignment_return(uuid,boolean,text) to authenticated;
