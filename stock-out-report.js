(function(){
const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
const esc=v=>typeof window.esc==='function'?window.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function panel(title){const p=document.getElementById('hmMenuPanel'),b=document.getElementById('hmMenuPanelBody'),h=document.getElementById('hmMenuPanelTitle');if(!p||!b)throw new Error('Panel menu belum siap.');document.getElementById('modal')?.classList.add('hidden');if(h)h.textContent=title;p.classList.remove('hidden');return b;}
function fmtDate(d){return d.toLocaleDateString('en-CA');}
function today(){return fmtDate(new Date());}
function startOfMonth(){const d=new Date();return fmtDate(new Date(d.getFullYear(),d.getMonth(),1));}
function endExclusive(v){const d=new Date(v+'T00:00:00');d.setDate(d.getDate()+1);return fmtDate(d);}
function style(){if(document.getElementById('hm-stock-out-report-style'))return;const st=document.createElement('style');st.id='hm-stock-out-report-style';st.textContent=`
#hmMenuPanelBody .hmso-hero{padding:18px;border-radius:17px;background:linear-gradient(125deg,#0b1e38,#164e73 65%,#0f766e);color:#fff;margin-bottom:14px}
#hmMenuPanelBody .hmso-hero *{color:#fff!important}
#hmMenuPanelBody .hmso-filter{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:14px;border:1px solid #dbe5f1;border-radius:15px;background:#f4f8fd}
#hmMenuPanelBody .hmso-filter label{font-size:12px;font-weight:800;color:#334155}
#hmMenuPanelBody .hmso-filter input,#hmMenuPanelBody .hmso-filter select{width:100%;box-sizing:border-box;margin-top:5px;min-height:43px;padding:8px;border:1px solid #94a3b8;border-radius:9px;background:#fff!important;color:#172033!important}
#hmMenuPanelBody .hmso-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
#hmMenuPanelBody .hmso-actions button{min-height:42px;border-radius:10px;font-weight:800}
#hmMenuPanelBody .hmso-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}
#hmMenuPanelBody .hmso-stat{border:1px solid #dbe5ef;border-radius:13px;background:#f8fafc;padding:13px}
#hmMenuPanelBody .hmso-stat b{display:block;font-size:23px;color:#17324f}
#hmMenuPanelBody .hmso-row{border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:12px;margin:8px 0;color:#172033}
#hmMenuPanelBody .hmso-row .muted{font-size:12px;color:#64748b;line-height:1.5}
@media(max-width:750px){#hmMenuPanelBody .hmso-filter{grid-template-columns:repeat(2,minmax(0,1fr))}#hmMenuPanelBody .hmso-stats{grid-template-columns:1fr}}
@media(max-width:420px){#hmMenuPanelBody .hmso-filter{grid-template-columns:1fr}}
`;document.head.appendChild(st);}
window.openStockOutReport=async function(){
 const p=window.profile||{},role=String(p.role||p.team_role||p.position||'').trim().toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' '),outletProfile=String(p.outlet||'').trim();
 const stockist=role==='MITRA STOCKIST'||role==='ADMIN FINANCE MAJESTY CELL';
 if(!p.is_management&&!stockist&&role!=='FASILITATOR'&&!role.includes('DEVELOPER')){alert('Akses Laporan Stock Keluar tidak diizinkan.');return;}
 const allowed=['Majesty Cell','Majesty Gadget','Majesty Store'];
 const ownPartner=allowed.find(x=>x.toUpperCase()===outletProfile.toUpperCase())|| (role==='ADMIN FINANCE MAJESTY CELL'?'Majesty Cell':null);
 if(stockist&&!ownPartner){alert('Mitra stockist pada profil tidak dikenali.');return;}
 style();const b=panel('📤 Laporan Stock Keluar'),d=today(),m=startOfMonth();
 b.innerHTML='<div class="hmso-hero"><div style="font-size:11px;letter-spacing:1px;font-weight:800;opacity:.85">HELLO MAJESTY • BUILT ON TRUST</div><h3 style="margin:6px 0">Laporan Stock Keluar</h3><div style="font-size:13px;opacity:.9">Riwayat unit yang keluar dari stok melalui penjualan atau retur supplier. Tidak mengubah laporan modal mitra.</div></div>'+
 '<div class="hmso-filter">'+
 '<label>Status<select id="hmsoStatus"><option value="ALL">Semua</option><option value="SOLD">Terjual</option><option value="RETURN">Return</option></select></label>'+
 '<label>Mitra Stockist<select id="hmsoPartner"><option value="ALL">Semua Stockist</option><option>Majesty Cell</option><option>Majesty Gadget</option><option>Majesty Store</option></select></label>'+
 '<label>Outlet<select id="hmsoOutlet"><option value="ALL">Semua Outlet</option><option>Majesty Plaza iPhone</option><option>Majesty Refill Phone</option></select></label>'+
 '<label>Tanggal Dari<input id="hmsoFrom" type="date" value="'+m+'"></label>'+
 '<label>Tanggal Sampai<input id="hmsoTo" type="date" value="'+d+'"></label></div>'+
 '<div class="hmso-actions"><button class="success" type="button" onclick="window.loadStockOutReport()">↻ Muat Laporan</button><button class="secondary" type="button" onclick="window.resetStockOutReport()">Reset Filter</button><button class="secondary" type="button" onclick="window.exportStockOutReport()">⇩ Export CSV</button></div>'+
 '<div id="hmsoResult"><div class="box">Memuat laporan...</div></div>';
 if(stockist){const el=document.getElementById('hmsoPartner');el.value=ownPartner;el.disabled=true;}
 await window.loadStockOutReport();
};
window.loadStockOutReport=async function(){
 const host=document.getElementById('hmsoResult'),sb=window.sb;if(!host||!sb)return;
 const status=document.getElementById('hmsoStatus').value,partner=document.getElementById('hmsoPartner').value,outlet=document.getElementById('hmsoOutlet').value,from=document.getElementById('hmsoFrom').value,to=document.getElementById('hmsoTo').value;
 if(!from||!to||from>to){host.innerHTML='<div class="box">Periksa rentang tanggal.</div>';return;}
 const start=from+'T00:00:00+07:00',end=endExclusive(to)+'T00:00:00+07:00';
 host.innerHTML='<div class="box">Mengambil riwayat barang keluar...</div>';
 try{
  let sold=[],returns=[];
  if(status==='ALL'||status==='SOLD'){
   let q=sb.from('stock_units').select('id,product_id,outlet,partner_name,imei_1,color,grade,condition,battery_health,cost,sold_price,sold_at,status').eq('status','SOLD').gte('sold_at',start).lt('sold_at',end).order('sold_at',{ascending:false}).limit(2000);
   if(partner!=='ALL')q=q.eq('partner_name',partner);if(outlet!=='ALL')q=q.eq('outlet',outlet);
   const r=await q;if(r.error)throw r.error;sold=r.data||[];
  }
  if(status==='ALL'||status==='RETURN'){
   let q=sb.from('stock_supplier_returns').select('id,return_no,stock_unit_id,outlet,return_date,return_value,reason,settlement_type,notes').gte('return_date',start).lt('return_date',end).order('return_date',{ascending:false}).limit(2000);
   if(outlet!=='ALL')q=q.eq('outlet',outlet);
   const r=await q;if(r.error)throw r.error;const raw=r.data||[];
   const ids=[...new Set(raw.map(x=>x.stock_unit_id).filter(Boolean))];let units=[];
   if(ids.length){let uq=sb.from('stock_units').select('id,product_id,outlet,partner_name,imei_1,color,grade,condition,battery_health,cost,sold_price,sold_at,status').in('id',ids);if(partner!=='ALL')uq=uq.eq('partner_name',partner);const ur=await uq;if(ur.error)throw ur.error;units=ur.data||[];}
   const um=Object.fromEntries(units.map(x=>[x.id,x]));returns=raw.filter(x=>um[x.stock_unit_id]).map(x=>({...x,...um[x.stock_unit_id],event_date:x.return_date,exit_type:'RETURN',display_value:x.return_value}));
  }
  const productIds=[...new Set([...sold,...returns].map(x=>x.product_id).filter(Boolean))];let products={};
  if(productIds.length){const pr=await sb.from('product_master').select('id,product,variant').in('id',productIds);if(pr.error)throw pr.error;products=Object.fromEntries((pr.data||[]).map(x=>[x.id,x]));}
  const rows=[...sold.map(x=>({...x,exit_type:'SOLD',event_date:x.sold_at,display_value:x.sold_price})),...returns].map(x=>({...x,product_name:products[x.product_id]?.product||'Produk',variant:products[x.product_id]?.variant||'',event_date:x.event_date||x.sold_at}));
  rows.sort((a,b)=>String(b.event_date||'').localeCompare(String(a.event_date||'')));
  window.__hmStockOutRows=rows;
  const total=rows.reduce((n,x)=>n+Number(x.display_value||0),0),modal=rows.reduce((n,x)=>n+Number(x.cost||0),0);
  const cards='<div class="hmso-stats"><div class="hmso-stat"><div class="muted">Unit keluar</div><b>'+rows.length+'</b></div><div class="hmso-stat"><div class="muted">Total nilai jual / retur</div><b>'+money(total)+'</b></div><div class="hmso-stat"><div class="muted">Total modal terkait</div><b>'+money(modal)+'</b></div></div>';
  const list=rows.map(x=>'<div class="hmso-row"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>'+esc(x.product_name)+(x.variant?' · '+esc(x.variant):'')+'</b><b>'+ (x.exit_type==='SOLD'?'Terjual':'Return')+'</b></div><div class="muted">'+esc(x.event_date?new Date(x.event_date).toLocaleString('id-ID'):'-')+' · '+esc(x.outlet||'-')+' · '+esc(x.partner_name||'-')+'</div><div class="muted">'+esc([x.color,x.grade?'Grade '+x.grade:null,x.condition,x.battery_health!=null?'BH '+x.battery_health+'%':null,x.imei_1?'IMEI '+x.imei_1:null].filter(Boolean).join(' · '))+'</div><div style="margin-top:5px">Modal <b>'+money(x.cost)+'</b> · '+(x.exit_type==='SOLD'?'Harga jual ':'Nilai retur ')+ '<b>'+money(x.display_value)+'</b></div>'+(x.reason?'<div class="muted">Alasan retur: '+esc(x.reason)+'</div>':'')+(x.return_no?'<div class="muted">No. retur: '+esc(x.return_no)+'</div>':'')+'</div>').join('');
  host.innerHTML=cards+'<div class="box"><b>Rincian Stock Keluar</b><div class="muted" style="font-size:12px;margin:5px 0 10px">'+esc(from)+' s/d '+esc(to)+' · '+esc(status==='ALL'?'Semua status':status==='SOLD'?'Terjual':'Return')+'</div>'+(list||'<div class="muted">Tidak ada barang keluar pada filter ini.</div>')+'</div>';
 }catch(err){host.innerHTML='<div class="box"><b>Gagal memuat laporan stock keluar.</b><div class="small">'+esc(err?.message||err)+'</div></div>';}
};
window.resetStockOutReport=function(){const p=document.getElementById('hmsoPartner'),o=document.getElementById('hmsoOutlet'),s=document.getElementById('hmsoStatus'),a=document.getElementById('hmsoFrom'),z=document.getElementById('hmsoTo');if(p&&!p.disabled)p.value='ALL';if(o)o.value='ALL';if(s)s.value='ALL';if(a)a.value=startOfMonth();if(z)z.value=today();window.loadStockOutReport();};
window.exportStockOutReport=function(){const rows=window.__hmStockOutRows||[];if(!rows.length){alert('Tidak ada data untuk diekspor.');return;}const cols=['exit_type','event_date','product_name','variant','color','grade','condition','battery_health','imei_1','outlet','partner_name','cost','display_value','return_no','reason'];const csv=[cols.join(';'),...rows.map(r=>cols.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(';'))].join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='laporan-stock-keluar-'+today()+'.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);};
})();