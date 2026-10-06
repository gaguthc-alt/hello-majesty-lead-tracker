function hasContentCreatorAccess(){const r=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');return !!profile?.is_management||r==='CONTENT CREATOR'||!!inventoryCanContentCreator;}
/* HM_INVENTORY_STABLE_20260930_ANDROID_SECOND_3 */
/* Hello Majesty Inventory & Hunter */
let inventoryProducts=[], inventoryStock=[], inventoryView='stock';
let inventoryDashboardLock=false;
let hunterDashboard=[]; let inventoryCanFacilitator=false; let inventoryCanContentCreator=false; let inventoryCanHunter=false;
function canViewFullImei(){
 return !!profile?.is_management || inventoryCanFacilitator || String(profile?.role||'').toUpperCase()==='FASILITATOR' || (Array.isArray(window.hmRoles) && window.hmRoles.some(r=>String(r).toUpperCase()==='FASILITATOR'));
}
function maskImei(v){
 const x=String(v||'').trim();
 if(!x)return '-';
 if(x.length<=4)return '••••';
 return '••••••••'+x.slice(-4);
}


async function loadInventoryData(){
  inventoryCanFacilitator=false;
  inventoryCanHunter=false;
  inventoryCanContentCreator=!!profile?.is_management || String(profile?.role||'').toUpperCase()==='CONTENT CREATOR' || String(profile?.role||'').toUpperCase()==='CONTENT_CREATOR';
  if(!profile?.is_management){
    const perm=await sb.rpc('has_facilitator_inventory_access');
    if(!perm.error) inventoryCanFacilitator=!!perm.data;
  }
  if(!profile?.is_management && !inventoryCanContentCreator){const cc=await sb.from('team_permissions').select('can_content_creator').eq('name',profile?.name).eq('outlet',profile?.outlet).eq('active',true).maybeSingle();if(!cc.error)inventoryCanContentCreator=!!cc.data?.can_content_creator;}
  if(!profile?.is_management){const hp=await sb.rpc('has_hunter_inventory_access');if(!hp.error)inventoryCanHunter=!!hp.data;}
  window.hmCanFacilitator=inventoryCanFacilitator; window.hmCanContentCreator=inventoryCanContentCreator;
  const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
  const isPartnerFinance=role==='ADMIN FINANCE MAJESTY CELL';
  const stockView=profile?.is_management?'stock_management':(inventoryCanFacilitator?'stock_facilitator':'stock_catalog');
  let stockQuery=sb.from(stockView).select('*').order('status').order('received_at',{ascending:false});
  if(!profile?.is_management && profile?.outlet && !isPartnerFinance) stockQuery=stockQuery.eq('outlet',profile.outlet);
  const [p,s]=await Promise.all([
    sb.from('product_master').select('*').eq('active',true).order('category').order('product'),
    stockQuery
  ]);
  if(p.error) throw p.error; if(s.error) throw s.error;
  inventoryProducts=p.data||[]; inventoryStock=s.data||[];
  if((role==='ADMIN FINANCE'||role==='ADMIN FINANCE MAJESTY CELL') && inventoryStock.length){
    const ids=inventoryStock.map(x=>x.id).filter(Boolean);
    const costs=await sb.from('stock_units').select('id,cost').in('id',ids);
    if(!costs.error){const byId=Object.fromEntries((costs.data||[]).map(x=>[x.id,x.cost]));inventoryStock=inventoryStock.map(x=>({...x,cost:byId[x.id]??null}));}
  }
  // Foto unit disimpan di stock_units, sementara view inventory tidak selalu mengekspos kolom foto.
  // Ambil hanya kolom foto dan merge ke hasil view agar Detail Produk/Card selalu menampilkan foto.
  if(inventoryStock.length){
    const ids=inventoryStock.map(x=>x.id).filter(Boolean);
    const photos=await sb.from('stock_units').select('id,photo_1,photo_2,photo_3,photo_4,photo_5').in('id',ids);
    if(!photos.error){
      const byId=Object.fromEntries((photos.data||[]).map(x=>[x.id,x]));
      inventoryStock=inventoryStock.map(x=>({...x,...(byId[x.id]||{})}));
    }else{
      console.warn('[HM] Foto stock tidak dapat dimuat:',photos.error);
    }
  }
}

function canViewInventoryDashboard(){const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');if(role==='ADMIN FINANCE MAJESTY CELL')return false;return !!profile?.is_management||role==='ADMIN FINANCE';}

async function loadWalkinApprovalCount(){
 const role=inventoryReviewerRole(), isDeveloper=role==='DEVELOPER'||role==='DEVELOPER APLIKASI', can=!!profile?.is_management||isDeveloper||role==='FASILITATOR';
 const btn=document.getElementById('walkinApprovalBtn');
 if(!can||!btn)return;
 const r=await sb.from('walkin_sale_approvals').select('id',{count:'exact',head:true}).eq('status','PENDING');
 if(!r.error)btn.textContent='🚶 Persetujuan Walk-In'+(r.count?' ('+r.count+')':'');
}
window.openWalkinApprovals=async function(){
 const role=inventoryReviewerRole();
 const isDeveloper=role==='DEVELOPER'||role==='DEVELOPER APLIKASI';
 const can=!!profile?.is_management||isDeveloper||role==='FASILITATOR';
 if(!can)return alert('Persetujuan Walk-In hanya dapat dilakukan Management, Developer, atau Fasilitator.');
 const a=await sb.from('walkin_sale_approvals').select('id,stock_unit_id,requested_by,requested_at,sale_price,status').eq('status','PENDING').order('requested_at',{ascending:false});
 if(a.error)return alert(a.error.message);
 const rows=a.data||[], ids=rows.map(x=>x.stock_unit_id);
 const s=ids.length?await sb.from('stock_units').select('id,product_id,outlet,color,imei_1,cost,asking_price,status').in('id',ids):{data:[]};
 const stocks=s.data||[], pids=[...new Set(stocks.map(x=>x.product_id).filter(Boolean))];
 const pr=pids.length?await sb.from('product_master').select('id,product,variant').in('id',pids):{data:[]};
 const products=Object.fromEntries((pr.data||[]).map(x=>[x.id,x]));
 const u=rows.length?await sb.from('team_profiles').select('user_id,name,role').in('user_id',rows.map(x=>x.requested_by)):{data:[]};
 const users=Object.fromEntries((u.data||[]).map(x=>[x.user_id,x]));
 const title=document.getElementById('hmMenuPanelTitle'), panel=document.getElementById('hmMenuPanel'), body=document.getElementById('hmMenuPanelBody');
 const mt=document.getElementById('mt'),mb=document.getElementById('mb'),modal=document.getElementById('modal');
 const heading='🚶 Persetujuan Walk-In ('+rows.length+')';
 if(title)title.textContent=heading;
 if(!rows.length){
   const html='<div class="box" style="text-align:center"><div style="font-size:28px">✅</div><b>Tidak ada Walk-In yang menunggu verifikasi.</b><div class="small" style="margin-top:6px">Semua pengajuan sudah diproses atau belum ada pengajuan baru.</div></div>';
   if(body){body.innerHTML=html;panel?.classList.remove('hidden');panel?.scrollIntoView({behavior:'smooth',block:'start'});}
   else if(mt&&mb){mt.textContent=heading;mb.innerHTML=html;modal?.classList.remove('hidden');}
   return;
 }
 const html=rows.map((a,i)=>{
   const st=stocks.find(x=>x.id===a.stock_unit_id)||{}, p=products[st.product_id]||{}, rq=users[a.requested_by]||{};
   const canReview=(!!profile?.is_management||role==='DEVELOPER'||role==='DEVELOPER APLIKASI'||role==='FASILITATOR')&&String(rq.user_id||'')!==String(profile?.user_id||'');
   return '<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+esc(p.product||'Produk')+(p.variant?' — '+esc(p.variant):'')+'</b><div class="small">📍 Outlet: <b>'+esc(st.outlet||'-')+'</b><br>🕒 Diajukan: <b>'+new Date(a.requested_at).toLocaleString('id-ID')+'</b><br>👤 Diinput oleh: <b>'+esc(rq.name||'User')+'</b></div><div>Harga Walk-In: <b>Rp'+Number(a.sale_price||0).toLocaleString('id-ID')+'</b> • Modal: Rp'+Number(st.cost||0).toLocaleString('id-ID')+'</div><div class="small">Status: MENUNGGU VERIFIKASI</div>'+(canReview?'<div class="row" style="margin-top:8px"><button class="success" onclick="reviewWalkinSale(\''+a.id+'\',\'APPROVE\')">✓ Setujui & SOLD</button><button class="danger" onclick="reviewWalkinSale(\''+a.id+'\',\'REJECT\')">✕ Tolak</button></div>':'<div class="small" style="margin-top:8px">⏳ Menunggu verifikasi Fasilitator.</div>')+'</div>';
 }).join('');
 if(mt)mt.textContent=heading;
 if(body){
   body.innerHTML=html;
   panel?.classList.remove('hidden');
   panel?.scrollIntoView({behavior:'smooth',block:'start'});
 }else if(mb){
   mb.innerHTML=html;
   modal?.classList.remove('hidden');
 }
 if(modal)modal.classList.add('hidden');
}
async function reviewWalkinSale(id,action){
 let note=null;
 if(action==='REJECT'){note=prompt('Alasan penolakan Walk-In:')||'';if(!note.trim())return alert('Alasan wajib diisi.');}
 const r=await sb.rpc('review_walkin_sale_approval',{p_approval_id:id,p_action:action,p_note:note});
 if(r.error)return alert('Verifikasi Walk-In gagal: '+r.error.message);
 alert(action==='APPROVE'?'Walk-In disetujui dan transaksi menjadi SOLD.':'Walk-In ditolak.');
 closeModal(); await renderInventory();
}

function canReceiveStock(source=null){const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');if(!!profile?.is_management||inventoryCanFacilitator||role==='FASILITATOR')return true;if(role==='ADMIN FINANCE MAJESTY CELL')return source===null||source==='MAJESTY_CELL';return false;}
function inventoryReviewerRole(){return String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ')}
function canReviewInventoryReceive(requesterRole,isCell,requestedBy){const me=inventoryReviewerRole();const self=String(profile?.user_id||'')===String(requestedBy||'');const developer=me==='DEVELOPER'||me==='DEVELOPER APLIKASI';const management=!!profile?.is_management;return (developer||management||me==='FASILITATOR'||me==='ADMIN FINANCE MAJESTY CELL')&&!self;}
async function loadInventoryApprovalCount(){const me=inventoryReviewerRole();const canApprove=!!profile?.is_management||me==='DEVELOPER'||me==='DEVELOPER APLIKASI'||me==='FASILITATOR'||me==='ADMIN FINANCE MAJESTY CELL';const btn=document.getElementById('inventoryApprovalBtn');if(!canApprove||!btn)return;const r=await sb.from('inventory_receive_approvals').select('id',{count:'exact',head:true}).eq('status','PENDING');if(!r.error)btn.textContent='🔔 Persetujuan Barang Masuk'+(r.count?' ('+r.count+')':'');}
window.openInventoryApprovals=async function(){const me=inventoryReviewerRole(); console.log('[HM] openInventoryApprovals loaded v20261006-approval4');const canApprove=!!profile?.is_management||me==='DEVELOPER'||me==='DEVELOPER APLIKASI'||me==='FASILITATOR'||me==='ADMIN FINANCE MAJESTY CELL';if(!canApprove)return alert('Persetujuan Barang Masuk hanya dapat dilakukan Developer, Management, Fasilitator, atau Admin Finance Majesty Cell.');const a=await sb.from('inventory_receive_approvals').select('id,stock_unit_id,requested_by,requested_at,status,review_note').eq('status','PENDING').order('requested_at',{ascending:false});if(a.error)return alert(a.error.message);const rows=a.data||[];$('mt').textContent='🔔 Persetujuan Barang Masuk ('+rows.length+')';if(!rows.length){$('mb').innerHTML='<div class="box" style="text-align:center"><div style="font-size:28px">✅</div><b>Tidak ada Barang Masuk yang menunggu verifikasi.</b><div class="small" style="margin-top:6px">Semua pengajuan sudah diproses atau belum ada pengajuan baru.</div></div>';const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');if(panel&&body){if(title)title.textContent=$('mt').textContent;body.replaceChildren(...Array.from($('mb').childNodes));panel.classList.remove('hidden');panel.scrollIntoView({behavior:'smooth',block:'start'});}else $('modal').classList.remove('hidden');return;}const ids=rows.map(x=>x.stock_unit_id);const s=await sb.from('stock_units').select('id,product_id,outlet,imei_1,cost,asking_price,partner_name,source_type,status').in('id',ids);if(s.error)return alert(s.error.message);const stocks=s.data||[];const pids=[...new Set(stocks.map(x=>x.product_id).filter(Boolean))];const pr=pids.length?await sb.from('product_master').select('id,product,variant').in('id',pids):{data:[]};const products=Object.fromEntries((pr.data||[]).map(x=>[x.id,x]));const u=await sb.from('team_profiles').select('user_id,name,role,is_management').in('user_id',rows.map(x=>x.requested_by));const users=Object.fromEntries((u.data||[]).map(x=>[x.user_id,x]));$('mb').innerHTML=rows.map((a,i)=>{const s=stocks.find(x=>x.id===a.stock_unit_id)||{},p=products[s.product_id]||{},rq=users[a.requested_by]||{},rqRole=String(rq.role||'').trim().toUpperCase().replace(/_/g,' '),isCell=String(s.source_type||'').toUpperCase()==='MAJESTY_CELL'||String(s.partner_name||'').toUpperCase()==='MAJESTY CELL',canReview=canReviewInventoryReceive(rqRole,isCell,a.requested_by);return '<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+esc(p.product||'Produk')+(p.variant?' — '+esc(p.variant):'')+'</b><div class="small">📍 Outlet: <b>'+esc(s.outlet||'-')+'</b><br>🕒 Diinput: <b>'+new Date(a.requested_at).toLocaleString('id-ID')+'</b><br>👤 Diinput oleh: <b>'+esc(rq.name||'User')+'</b></div><div>IMEI: '+esc(canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1))+' • Modal: <b>Rp'+Number(s.cost||0).toLocaleString('id-ID')+'</b> • Jual: Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+'</div><div class="small">Partner: '+esc(s.partner_name||'-')+' • Status: MENUNGGU PERSETUJUAN</div>'+(canReview?'<div class="row" style="margin-top:8px"><button class="success" onclick="reviewInventoryReceive(\''+a.stock_unit_id+'\',\'APPROVE\')">✓ Setujui & Masukkan ke Stock</button><button class="secondary" onclick="reviewInventoryReceive(\''+a.stock_unit_id+'\',\'CHANGES_REQUESTED\')">✎ Minta Koreksi</button><button class="danger" onclick="reviewInventoryReceive(\''+a.stock_unit_id+'\',\'REJECT\')">✕ Tolak</button></div>':'<div class="small" style="margin-top:8px;font-weight:700">⏳ Menunggu verifikasi dari pihak yang berwenang.</div>')+'</div>';}).join('');const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');if(panel&&body){if(title)title.textContent=$('mt').textContent||'🔔 Persetujuan Barang Masuk';body.replaceChildren(...Array.from($('mb').childNodes));panel.classList.remove('hidden');panel.scrollIntoView({behavior:'smooth',block:'start'});}else $('modal').classList.remove('hidden');}
async function reviewInventoryReceive(stockId,action){const label=action==='APPROVE'?'Setujui':action==='REJECT'?'Tolak':'Minta koreksi';let note='';if(action!=='APPROVE'){note=prompt(label+' Barang Masuk. Catatan wajib diisi:')||'';if(!note.trim())return alert('Catatan wajib diisi.');}const r=await sb.rpc('review_inventory_receive',{p_stock_unit_id:stockId,p_action:action,p_note:note||null});if(r.error)return alert(r.error.message);alert(action==='APPROVE'?'Barang Masuk disetujui dan menjadi Stock READY.':action==='REJECT'?'Barang Masuk ditolak.':'Barang Masuk dikembalikan untuk koreksi.');closeModal();await renderInventory();}
function sendInventoryApprovalWA(stockId){const msg='🔔 *PERMOHONAN PERSETUJUAN BARANG MASUK*\\n\\nAda Barang Masuk *Majesty Cell* yang menunggu persetujuan Management/Facilitator.\\n\\nMohon cek aplikasi Hello Majesty → Product & Stock → Persetujuan Barang Masuk.\\n\\nStatus: *MENUNGGU PERSETUJUAN*';window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');}
async function openMyInventoryReceiveStatus(){const a=await sb.from('inventory_receive_approvals').select('stock_unit_id,requested_at,status,reviewed_at,review_note').eq('requested_by',profile.user_id).order('requested_at',{ascending:false}).limit(20);if(a.error)return alert(a.error.message);const ids=(a.data||[]).map(x=>x.stock_unit_id);const s=ids.length?await sb.from('stock_units').select('id,product_id,status,imei_1').in('id',ids):{data:[]};const pids=[...new Set((s.data||[]).map(x=>x.product_id).filter(Boolean))];const pr=pids.length?await sb.from('product_master').select('id,product,variant').in('id',pids):{data:[]};const pm=Object.fromEntries((pr.data||[]).map(x=>[x.id,x]));$('mt').textContent='📦 Status Barang Masuk Saya';$('mb').innerHTML=(a.data||[]).map(x=>{const st=(s.data||[]).find(y=>y.id===x.stock_unit_id)||{},p=pm[st.product_id]||{};return '<div class="lead"><b>'+esc(p.product||'Produk')+(p.variant?' — '+esc(p.variant):'')+'</b><div class="small">'+new Date(x.requested_at).toLocaleString('id-ID')+' • '+esc(x.status)+'</div>'+(x.review_note?'<div>Catatan: '+esc(x.review_note)+'</div>':'')+'</div>';}).join('')||'<div class="small">Belum ada pengajuan.</div>';$('modal').classList.remove('hidden');}


async function renderStandaloneHunterStock(){
 const section=document.getElementById('hunterStockSection'),panel=document.getElementById('hunterStockPanel');
 if(!section||!panel)return;
 section.classList.remove('hidden');section.setAttribute('aria-hidden','false');
 panel.className='box';
 panel.innerHTML='<div class="small">⏳ Memuat Stock Hunter...</div>';
 try{
  const r=await sb.rpc('get_hunter_stock_catalog');
  if(r.error)throw r.error;
  const rows=r.data||[];
  panel.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">🧑‍💼 STOCK HUNTER</h2><div class="small">Barang Hunter yang masih READY dan belum laku.</div></div><button class="secondary" type="button" onclick="renderStandaloneHunterStock()">↻ Refresh</button></div>'+
   '<div class="small" style="margin-top:10px">Data modal, laba, dan IMEI tidak ditampilkan.</div>'+
   (rows.length?'<div style="margin-top:12px">'+rows.map((x,i)=>{
      const photos=[x.photo_1,x.photo_2,x.photo_3,x.photo_4,x.photo_5].filter(Boolean);
      const img=photos[0]?'<img src="'+esc(photos[0])+'" alt="Foto '+esc(x.product||'Produk')+'" style="width:100%;max-height:190px;object-fit:contain;border-radius:10px;background:#f3f4f6;margin-bottom:8px">':'';
      const age=x.received_at?Math.max(0,Math.floor((Date.now()-new Date(x.received_at).getTime())/86400000)):null;
      return '<div class="lead" style="margin-bottom:12px">'+img+
       '<b>'+String(i+1).padStart(2,'0')+'. '+esc(x.product||'Produk')+(x.variant?' — '+esc(x.variant):'')+'</b>'+
       '<div class="small">'+esc(x.color||'-')+(x.grade?' • Grade '+esc(x.grade):'')+(x.battery_health!=null?' • BH '+esc(x.battery_health)+'%':'')+'</div>'+
       '<div style="margin-top:5px">Harga jual: <b>Rp'+Number(x.asking_price||0).toLocaleString('id-ID')+'</b></div>'+
       '<div class="small">📍 '+esc(x.outlet||'-')+(age!==null?' • '+age+' hari di stock':'')+'</div>'+
       '<div class="small" style="margin-top:5px">🟢 READY — belum laku</div></div>';
    }).join('')+'</div>':'<div class="box" style="text-align:center;margin-top:12px"><b>Belum ada stock Hunter yang menunggu closing.</b><div class="small" style="margin-top:5px">Saat barang Hunter terjual, unit ini otomatis tidak muncul lagi di daftar ini.</div></div>');
 }catch(e){
  console.error('[HM] Standalone Hunter Stock error',e);
  panel.innerHTML='<div class="box" style="color:#b42318"><b>Stock Hunter gagal dimuat.</b><div style="margin-top:6px">'+esc(e?.message||e)+'</div></div>';
 }
}
async function openHunterStock(){
 const section=document.getElementById('hunterStockSection');
 if(!section)return;
 const oldSection=document.getElementById('inventorySection'),dashSection=document.getElementById('inventoryDashboardSection');
 if(oldSection)oldSection.classList.add('hidden');
 if(dashSection)dashSection.classList.add('hidden');
 inventoryDashboardLock=false;
 section.classList.remove('hidden');section.setAttribute('aria-hidden','false');
 await renderStandaloneHunterStock();
}

async function renderInventory(){
  const host=document.getElementById('inventoryPanel')||document.createElement('div');
  host.innerHTML='<div class="small">⏳ Memuat Product & Stock...</div>';
  host.id='inventoryPanel';host.className='box';
  const dash=document.getElementById('dashboard'),stats=document.getElementById('stats');
  if(dash&&!dash.contains(host))dash.insertBefore(host,stats||null);
  try{await loadInventoryData();}catch(e){
    console.error('[HM] Inventory load error',e);
    host.innerHTML='<h2 style="margin:0">📦 PRODUCT & STOCK</h2><p class="small" style="margin-top:10px">Product & Stock gagal memuat data.</p><div class="box"><b>Error:</b> '+esc(e?.message||e)+'</div><button class="secondary" onclick="refreshInventory(this)">↻ Coba Lagi</button>';
    return;
  }
  const ready=inventoryStock.filter(x=>x.status==='READY').length;
  const sold=inventoryStock.filter(x=>x.status==='SOLD'&&x.sold_at).length;
  const reserved=inventoryStock.filter(x=>x.status==='RESERVED').length;
  const returned=inventoryStock.filter(x=>x.status==='RETURN').length;
  const canManage=!!profile?.is_management || inventoryCanFacilitator || String(profile?.role||'').toUpperCase()==='FASILITATOR' || (Array.isArray(window.hmRoles) && window.hmRoles.some(r=>String(r).toUpperCase()==='FASILITATOR'));
  const isCellFinance=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ')==='ADMIN FINANCE MAJESTY CELL';
  if(isCellFinance) inventoryView='stock';
  host.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">📦 PRODUCT & STOCK</h2><div class="small">Stok READY yang tersedia per outlet</div></div><div class="row"><button class="secondary" onclick="refreshInventory(this)">↻ Refresh</button></div></div>'+
  '<div class="stats" style="margin-top:10px">'+
  invStat('🟢 Ready',ready)+invStat('🔴 Terjual',sold)+invStat('↩️ Retur',returned)+'</div>'+
  '<div class="row" style="margin-top:12px"><button class="'+(inventoryView==='stock'?'':'secondary')+'" id="invStockTab" type="button" data-inventory-view="stock">Stock</button>'+(inventoryCanHunter?'<button class="secondary" onclick="openHunterStock()">🧑‍💼 Stock Hunter</button>':'')+'</div>'+
  '<div id="inventoryViewDebug" class="small" style="margin-top:8px;font-weight:700"></div><div id="inventoryBody" style="margin-top:10px"></div>';
  host.onclick=(e)=>{const tab=e.target.closest('[data-inventory-view]');if(tab){e.preventDefault();setInventoryView(tab.dataset.inventoryView)}};
  renderInventoryBody();
  loadInventoryApprovalCount().catch(()=>{}); loadWalkinApprovalCount().catch(()=>{});
  const topStats=host.querySelectorAll('.stats[style*="margin-top:10px"] .stat');
  const bindTop=(needle,fn,title)=>{const el=[...topStats].find(x=>String(x.textContent||'').includes(needle));if(el){el.style.cursor='pointer';el.title=title;el.onclick=fn;}};
  bindTop('🟢 Ready',()=>{inventoryView='stock';renderInventoryBody();},'Klik untuk membuka stock READY');
  bindTop('🔴 Terjual',()=>openInventorySoldDetail(), 'Klik untuk melihat rincian barang terjual');
  bindTop('↩️ Retur',()=>openInventoryReturnDetail(), 'Klik untuk melihat rincian retur');
}
async function renderStandaloneInventoryDashboard(){
 const section=document.getElementById('inventoryDashboardSection'),panel=document.getElementById('inventoryDashboardPanel');
 if(!section||!panel)return;
 section.classList.remove('hidden');section.setAttribute('aria-hidden','false');
 panel.className='box';
 panel.innerHTML='<div class="small">⏳ Memuat Dashboard Inventory...</div>';
 try{
   await loadInventoryData();
   panel.innerHTML='<div id="inventoryBody"></div>';
   inventoryView='dashboard';
   renderInventoryDashboardBody();
 }catch(e){
   console.error('[HM] Standalone Inventory Dashboard error',e);
   panel.innerHTML='<div class="box" style="color:#b42318"><b>Dashboard Inventory gagal memuat data.</b><div style="margin-top:6px">'+esc(e?.message||e)+'</div></div>';
 }
}
async function openInventoryDashboard(){
 if(!canViewInventoryDashboard()){alert('Dashboard Inventory hanya dapat diakses Management dan Admin Finance.');return;}
 inventoryDashboardLock=true;
 const oldSection=document.getElementById('inventorySection'),dashSection=document.getElementById('inventoryDashboardSection');
 if(oldSection)oldSection.classList.add('hidden');
 if(dashSection){dashSection.classList.remove('hidden');dashSection.setAttribute('aria-hidden','false');}
 try{await renderStandaloneInventoryDashboard();}catch(e){console.error('[HM] Inventory dashboard open error',e);}
}
window.refreshHunterLauncher=async function(){
  const btn=document.getElementById('inventoryHunterBtn');
  if(!btn)return;
  btn.classList.add('hidden');
  if(profile?.is_management){btn.classList.remove('hidden');return;}
  try{
    const r=await sb.rpc('has_hunter_inventory_access');
    if(!r.error && r.data===true)btn.classList.remove('hidden');
  }catch(e){console.warn('[HM] Hunter launcher access check',e);}
};
function renderMasterProductView(){
 const panel=document.getElementById('inventoryPanel');
 if(!panel)return;
 const canManage=!!profile?.is_management || inventoryCanFacilitator;
 const management=!!profile?.is_management;
 const q=String(document.getElementById('hmMasterProductSearch')?.value||'').trim().toLowerCase();
 const cat=String(document.getElementById('hmMasterProductCategory')?.value||'');
 const rows=inventoryProducts.filter(p=>{
   const hay=[p.product,p.variant,p.color,p.category,invCategory(p.category)].join(' ').toLowerCase();
   return (!cat||p.category===cat)&&(!q||searchHaystack(hay,q));
 });
 panel.className='box';
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><h2 style="margin:0">🧾 MASTER PRODUK</h2><div class="small">Database produk dan data master</div></div><div class="row">'+
   '<button class="secondary" type="button" onclick="refreshMasterProductView(this)">↻ Refresh</button>'+
   (canManage?'<button class="success" type="button" onclick="openAddProduct()">＋ Tambah Produk</button>':'')+
   '</div></div>'+
   '<div class="row" style="margin-top:12px"><input id="hmMasterProductSearch" placeholder="🔎 Cari produk / varian / kategori / warna" value="'+esc(q)+'" oninput="renderMasterProductView()">'+
   '<select id="hmMasterProductCategory" onchange="renderMasterProductView()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select></div>'+
   '<div class="small" style="margin-top:10px">Menampilkan '+rows.length+' produk master</div>'+
   '<div style="margin-top:10px">'+(rows.length?rows.map(p=>'<div class="lead"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>'+esc(masterProductLabel(p))+'</b><div class="small">'+esc(invCategory(p.category))+'</div></div><div class="row">'+(canManage?'<button class="secondary" type="button" onclick="openEditProduct(\''+p.id+'\')">✏️ Edit</button>':'')+(management?'<button class="danger" type="button" onclick="deactivateProduct(\''+p.id+'\')">Hapus</button>':'')+'</div></div></div>').join(''):'<div class="small">Tidak ada produk yang sesuai.</div>')+'</div>';
 const sel=document.getElementById('hmMasterProductCategory'); if(sel)sel.value=cat;
 const input=document.getElementById('hmMasterProductSearch'); if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}
}
async function refreshMasterProductView(btn){
 if(btn?.disabled)return;
 try{
  if(btn){btn.disabled=true;btn.textContent='⏳ Loading...';}
  await loadInventoryData();
  renderMasterProductView();
 }catch(e){console.error('[HM] Master Produk refresh error',e);alert('Refresh Master Produk gagal: '+(e?.message||e));}
 finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh';}}
}
window.renderMasterProductView=renderMasterProductView;
async function openInventorySection(view){
 const dashSection=document.getElementById('inventoryDashboardSection');
 if(dashSection){dashSection.classList.add('hidden');dashSection.setAttribute('aria-hidden','true');}
 inventoryDashboardLock=false;
 const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
 if(role==='ADMIN FINANCE MAJESTY CELL' && (view==='dashboard'||view==='sales')){alert('Bagian ini tidak termasuk akses Finance Majesty Cell.');return;}
 const panel=$('inventoryPanel'),btn=$('inventoryDashboardBtn');if(!panel)return;
 const open=!panel.classList.contains('hidden');
 if(open && inventoryView===view){panel.classList.add('hidden');if(btn)btn.textContent='📊 Dashboard Inventory';return;}
 panel.classList.remove('hidden');
 if(view==='sales'){
   // Laporan Penjualan berdiri sendiri: jangan render ulang Product & Stock.
   inventoryView='sales';
   panel.className='box';
   panel.innerHTML='<div id="inventoryBody"></div>';
   if(btn)btn.textContent='✖ Tutup Laporan Penjualan';
   try{await openSalesReport();}catch(e){console.error('[HM] Sales report error',e);alert(e?.message||e);}
   return;
 }
 if(view==='products'){
   inventoryView='products';
   if(btn)btn.textContent='✖ Tutup Master Produk';
   try{
     await loadInventoryData();
     renderMasterProductView();
   }catch(e){console.error('[HM] Master Produk error',e);alert(e?.message||e);}
   return;
 }
 if(btn)btn.textContent='✖ Tutup Product & Stock';
 const section=document.getElementById('inventorySection');if(section)section.classList.remove('hidden');
 try{
   await renderInventory();
   setInventoryView(view);
 }catch(e){console.error('[HM] Inventory section error',e);alert(e?.message||e);}
}
async function refreshInventory(btn){if(btn?.disabled)return;try{if(btn){btn.disabled=true;btn.textContent='⏳ Loading...'}await renderInventory()}catch(e){console.error(e);alert('Refresh Product & Stock error: '+(e?.message||e))}finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh'}}}
async function loadHunterDashboard(){const r=await sb.from('hunter_dashboard').select('*').order('total_commission',{ascending:false});if(r.error)throw r.error;hunterDashboard=r.data||[]}
function fmtRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID')}
async function markHunterCommissionPaid(id){if(!hasContentCreatorAccess())return alert('Akses Management atau Content Creator diperlukan.');const note=prompt('Catatan pembayaran (opsional):')||null;const r=await sb.from('sales_transactions').update({hunter_commission_paid_at:new Date().toISOString(),hunter_commission_paid_by:profile.user_id,hunter_commission_payment_note:note}).eq('id',id).is('hunter_commission_paid_at',null);if(r.error)return alert(r.error.message);openHunterCommission()}
async function openHunterCommission(){const r=await sb.from('sales_transactions').select('id,sold_at,hunter_user_id,hunter_commission,hunter_commission_paid_at,hunter_commission_payment_note,customer_name').not('hunter_user_id','is',null).order('sold_at',{ascending:false});if(r.error)return alert(r.error.message);const teams=await sb.from('team_directory').select('user_id,name');const names=Object.fromEntries((teams.data||[]).map(x=>[x.user_id,x.name]));const rows=r.data||[];$('mt').textContent='💸 Komisi Hunter';$('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi 10% dari profit unit Hunter yang SOLD. Pembayaran hanya dapat diubah oleh Management.</div>'+rows.map(x=>'<div class="lead"><b>🏹 '+esc(names[x.hunter_user_id]||'Unknown')+'</b><div>'+new Date(x.sold_at).toLocaleDateString('id-ID')+' • Komisi <b>'+fmtRp(x.hunter_commission)+'</b></div><div class="small">'+(x.hunter_commission_paid_at?'🟢 Dibayar '+new Date(x.hunter_commission_paid_at).toLocaleDateString('id-ID'):'🟡 Belum dibayar')+'</div>'+((profile?.is_management&&!x.hunter_commission_paid_at)?'<button class="success" style="margin-top:6px" onclick="markHunterCommissionPaid(\''+x.id+'\')">✓ Tandai Sudah Dibayar</button>':'')+'</div>').join('')||'<p class="small">Belum ada transaksi komisi Hunter.</p>';$('modal').classList.remove('hidden')}
async function openHunterDashboard(){try{await loadHunterDashboard()}catch(e){alert(e.message||e);return}$('mt').textContent='🏹 Dashboard Hunter';$('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi = 10% dari profit unit Hunter yang sudah SOLD.</div>'+hunterDashboard.map(h=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>🏹 '+esc(h.hunter_name)+'</b><span class="badge">'+h.sold_units+' SOLD</span></div><div style="margin-top:8px">📦 Total unit: <b>'+h.total_units+'</b> • 🟢 Ready: <b>'+h.ready_units+'</b> • 🔴 Sold: <b>'+h.sold_units+'</b></div><div style="margin-top:5px">💰 Profit: <b>'+fmtRp(h.total_profit)+'</b> • 🎯 Komisi: <b>'+fmtRp(h.total_commission)+'</b></div></div>').join('')||'<p class="small">Belum ada stock Hunter.</p>';$('modal').classList.remove('hidden')}
function inventoryNumber(v){
 const s0=String(v??'').trim();
 if(!s0)return 0;
 if(typeof v==='number')return Number.isFinite(v)?v:0;
 let s=s0.replace(/[^0-9,.-]/g,'');
 if(!s)return 0;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
 if(comma>-1&&dot>-1){
   s=comma>dot?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 }else if(comma>-1){
   const tail=s.slice(comma+1);
   s=tail.length<=2?s.replace(',','.'):s.replace(/,/g,'');
 }else if((s.match(/\./g)||[]).length>1){
   s=s.replace(/\./g,'');
 }
 const n=Number(s);
 return Number.isFinite(n)?n:0;
}
function invStat(label,val){
 const display=typeof val==='number'
  ? (Number.isFinite(val)?val:0).toLocaleString('id-ID')
  : String(val??'');
 return '<div class="stat"><div class="small">'+label+'</div><div class="num">'+display+'</div></div>';
}
function filterHunterOptions(){ const sel=$('sthunter'),outlet=String($('stoutlet')?.value||profile?.outlet||'').trim().toLowerCase(); if(!sel)return; [...sel.options].forEach(o=>{const ho=String(o.getAttribute('data-hunter-outlet')||'').trim().toLowerCase(); o.hidden=ho!==outlet;}); if(sel.selectedOptions[0]?.hidden)sel.value=''; }
function toggleHunterField(){const box=$('hunterBox'),source=$('stsource')?.value||'MANAGEMENT';if(box)box.classList.toggle('hidden',source!=='HUNTER');}
function togglePartnerFields(){const box=$('partnerBox'),source=$('stsource')?.value||'MANAGEMENT';if(box)box.classList.toggle('hidden',source!=='MAJESTY_CELL');}
function inventoryReceiveOutlet(){
 const sel=$('stoutlet');
 return profile?.is_management ? (sel?.value||'') : (profile?.outlet||'');
}
function hmRestoreStockCardActions(){
 const body=document.getElementById('inventoryBody');
 if(!body)return;
 body.querySelectorAll('button[onclick^="openProductDetail("]').forEach(detailBtn=>{
   if(detailBtn.parentElement?.querySelector('[data-hm-wa-action]'))return;
   const m=String(detailBtn.getAttribute('onclick')||'').match(/openProductDetail\(['\"]([^'\"]+)['\"]\)/);
   if(!m)return;
   const id=m[1];
   const wa=document.createElement('button');
   wa.type='button'; wa.className='secondary'; wa.setAttribute('data-hm-wa-action','1'); wa.textContent='📤 Kirim ke WA';
   wa.addEventListener('click',()=>{const s=inventoryStock.find(x=>x.id===id);if(s)shareProduct(s);});
   detailBtn.insertAdjacentElement('afterend',wa);
 });
}
function setInventoryView(view){if(inventoryDashboardLock&&view!=='dashboard')return;if(view==='dashboard'&&!canViewInventoryDashboard()){inventoryView='stock';inventoryDashboardLock=false;return;}inventoryView=view;if(view!=='dashboard')inventoryDashboardLock=false;if(view==='sales'){renderInventorySalesReport();}else renderInventoryBody();const dbg=document.getElementById('inventoryViewDebug');if(dbg)dbg.textContent='Mode: '+(view==='dashboard'?'DASHBOARD':view==='products'?'PRODUK':'STOCK');const panel=document.getElementById('inventoryPanel');if(panel){const buttons=panel.querySelectorAll('.row button');buttons.forEach(b=>{if(b.textContent.trim()==='Stock'||b.textContent.trim()==='Produk')b.classList.toggle('secondary',b.textContent.trim().toLowerCase()!==view)})}}
async function openInventorySoldDetail(){
 const outletSel=$('invDashOutlet')?.value||'',catSel=$('invDashCat')?.value||'';
 const rows=inventoryStock.filter(s=>s.status==='SOLD'&&(!outletSel||s.outlet===outletSel)&&(!catSel||s.category===catSel));
 const title=s=>[String(s.product||'').replace(/\\s+(NEW|SECOND)$/i,'').trim(),s.variant,s.color].filter(Boolean).join(' — ');
 $('mt').textContent='🔴 TERJUAL • '+rows.length+' UNIT';
 $('mb').innerHTML=rows.length?rows.map((s,i)=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+String(i+1).padStart(2,'0')+'. '+esc(title(s))+'</b><b>'+esc(s.outlet||'-')+'</b></div><div class="small">Status: TERJUAL</div><div>IMEI 1: '+esc(canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1))+' • Harga Jual: '+esc('Rp'+inventoryNumber(s.asking_price).toLocaleString('id-ID'))+'</div></div>').join(''):'<div class="small">Tidak ada stock yang berstatus TERJUAL untuk filter ini.</div>';
 $('modal').classList.remove('hidden');
}
async function openInventoryReturnDetail(){
 const outletSel=$('invDashOutlet')?.value||'',catSel=$('invDashCat')?.value||'';
 const rows=inventoryStock.filter(s=>s.status==='RETURN'&&(!outletSel||s.outlet===outletSel)&&(!catSel||s.category===catSel));
 const title=s=>[String(s.product||'').replace(/\\s+(NEW|SECOND)$/i,'').trim(),s.variant,s.color].filter(Boolean).join(' — ');
 $('mt').textContent='↩️ RETUR • '+rows.length+' UNIT';
 $('mb').innerHTML=rows.length?rows.map((s,i)=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+String(i+1).padStart(2,'0')+'. '+esc(title(s))+'</b><b>'+esc(s.outlet||'-')+'</b></div><div class="small">Status: RETUR • '+esc(s.return_reason||s.received_source_note||'-')+'</div><div>IMEI 1: '+esc(canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1))+' • Harga Jual: '+esc('Rp'+inventoryNumber(s.asking_price).toLocaleString('id-ID'))+'</div></div>').join(''):'<div class="small">Tidak ada stock yang berstatus RETUR untuk filter ini.</div>';
 $('modal').classList.remove('hidden');
}
function renderInventoryDashboardBody(){
 const body=document.getElementById('inventoryBody');if(!body)return;
 if(!canViewInventoryDashboard()){inventoryView='stock';renderInventoryBody();return;}
 const isManagement=!!profile?.is_management;
 const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' '),isAdminFinance=role==='ADMIN FINANCE';
 const canViewCost=isManagement||isAdminFinance;
 const outletSel=isAdminFinance?(profile?.outlet||''):($('invDashOutlet')?.value||''),catSel=$('invDashCat')?.value||'';
 const rows=inventoryStock.filter(s=>(!outletSel||s.outlet===outletSel)&&(!catSel||s.category===catSel));
 const ready=rows.filter(s=>s.status==='READY'),sold=rows.filter(s=>s.status==='SOLD'),reserved=rows.filter(s=>s.status==='RESERVED'),returned=rows.filter(s=>s.status==='RETURN'),missing=rows.filter(s=>s.status==='MISSING');
 const modal=ready.reduce((a,s)=>a+inventoryNumber(s.cost),0),jual=ready.reduce((a,s)=>a+inventoryNumber(s.asking_price),0),profit=jual-modal;
 const now=new Date(),sameDay=d=>{const x=new Date(d||0);return x.getFullYear()===now.getFullYear()&&x.getMonth()===now.getMonth()&&x.getDate()===now.getDate()};
 const age=s=>Math.max(0,Math.floor((Date.now()-new Date(s.received_at||s.created_at).getTime())/86400000));
 const receivedToday=ready.filter(s=>sameDay(s.received_at||s.created_at)).length,old30=ready.filter(s=>age(s)>30).length,old60=ready.filter(s=>age(s)>60).length;
 const outlets=[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean))].sort();
 const cats=['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND','STOCK_NEW_PUSAT','STOCK_SECOND_PUSAT'];
 const byCategory=cats.map(cat=>{const a=ready.filter(s=>s.category===cat);return {cat,units:a.length,cost:a.reduce((x,s)=>x+inventoryNumber(s.cost),0),jual:a.reduce((x,s)=>x+inventoryNumber(s.asking_price),0)}}).filter(x=>x.units);
 const byOutlet=outlets.map(o=>{const a=ready.filter(s=>s.outlet===o);return {o,units:a.length,cost:a.reduce((x,s)=>x+inventoryNumber(s.cost),0),jual:a.reduce((x,s)=>x+inventoryNumber(s.asking_price),0)}}).filter(x=>!outletSel||x.o===outletSel);
 const oldest=[...ready].sort((a,b)=>new Date(a.received_at||a.created_at)-new Date(b.received_at||b.created_at)).slice(0,8);
 const rp=n=>'Rp'+inventoryNumber(n).toLocaleString('id-ID'),pct=(a,b)=>b?Math.round(a/b*100)+'%':'0%';
 body.innerHTML=
  '<div class="box"><h3 style="margin:0">📊 DASHBOARD INVENTORY</h3><div class="small" style="margin-top:5px">Kontrol stock untuk keputusan pembelian, penjualan, dan pergerakan barang.</div>'+
  '<div class="row" style="margin-top:10px"><select id="invDashOutlet"'+(isAdminFinance?' disabled':'')+'>'+(isManagement?'<option value="">📍 Semua Outlet</option>':'')+outlets.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select><select id="invDashCat"><option value="">Semua Kategori</option>'+cats.map(x=>'<option value="'+x+'">'+invCategory(x)+'</option>').join('')+'</select></div></div>'+
  '<div class="stats inventory-dashboard-stats">'+invStat('💰 Modal READY',canViewCost?rp(modal):'—')+invStat('🏷️ Nilai Jual',canViewCost?rp(jual):'—')+invStat('📈 Potensi Laba',canViewCost?rp(profit):'—')+'</div>'+
  '<div class="row" style="margin-top:10px"><button class="secondary" onclick="openInventorySection(\'stock\')">📦 Lihat Stock</button>'+(canReceiveStock()?'<button class="success" onclick="openReceiveStock()">＋ Barang Masuk</button>':'')+'</div>'+
  '<div class="box"><h3 style="margin:0 0 8px">⚡ Perhatian</h3><div class="stats"><div class="stat"><div class="small">Barang masuk hari ini</div><div class="num">'+receivedToday+'</div></div><div class="stat"><div class="small">Stock >30 hari</div><div class="num">'+old30+'</div></div><div class="stat"><div class="small">Stock >60 hari</div><div class="num">'+old60+'</div></div></div></div>'+
  '<div class="box"><h3 style="margin:0 0 8px">🏪 Stock per Outlet</h3>'+(byOutlet.length?byOutlet.map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc(x.o)+'</b><b>'+x.units+' unit</b></div><div class="small">'+(canViewCost?'Modal '+rp(x.cost)+' • Jual '+rp(x.jual)+' • Potensi '+rp(x.jual-x.cost):'Nilai modal/jual khusus Management/Facilitator')+'</div></div>').join(''):'<div class="small">Tidak ada READY.</div>')+'</div>'+
  '<div class="box"><h3 style="margin:0 0 8px">📱 Stock per Kategori</h3>'+(byCategory.length?byCategory.map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+invCategory(x.cat)+'</b><b>'+x.units+' unit</b></div><div class="small">'+(canViewCost?'Modal '+rp(x.cost)+' • Jual '+rp(x.jual)+' • Margin '+pct(x.jual-x.cost,x.jual):'Nilai modal/jual khusus Management/Facilitator')+'</div></div>').join(''):'<div class="small">Tidak ada READY.</div>')+'</div>'+
  '<div class="box"><h3 style="margin:0 0 8px">⏳ Stock Terlama — READY</h3>'+(oldest.length?oldest.map(s=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc([s.product,s.variant,s.color].filter(Boolean).join(' — '))+'</b><span class="badge">'+age(s)+' hari</span></div><div class="small">'+esc(s.outlet||'-')+' • '+(s.grade?'Grade '+esc(s.grade)+' • ':'')+(s.battery_health!=null?'BH '+s.battery_health+'% • ':'')+(canViewCost?rp(s.cost):'Harga beli tersembunyi')+'</div></div>').join(''):'<div class="small">Belum ada stock READY.</div>')+'</div>';
 $('invDashOutlet').value=outletSel;$('invDashCat').value=catSel;
 $('invDashOutlet').onchange=()=>renderInventoryBody();$('invDashCat').onchange=()=>renderInventoryBody();
}
function renderInventoryBody(){const body=document.getElementById('inventoryBody');if(!body)return;if(inventoryView==='dashboard'&&!canViewInventoryDashboard()){inventoryView='stock';}if(inventoryView==='dashboard'){renderInventoryDashboardBody();return}if(inventoryView==='products'){body.innerHTML='<div class="row"><select id="invCat" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><input id="invSearch" placeholder="Cari produk / kategori / varian / warna" oninput="renderInventoryBody()"></div><div style="margin-top:10px">'+inventoryProducts.filter(p=>(!$('invCat')?.value||p.category===$('invCat').value)&&(!$('invSearch')?.value||[p.product,p.variant,p.color,p.category,invCategory(p.category)].join(' ').toLowerCase().includes($('invSearch').value.toLowerCase()))).map(p=>'<div class="lead"><b>'+esc(masterProductLabel(p))+'</b><div class="small">'+invCategory(p.category)+'</div></div>').join('')+'</div>';return}const q=($('stockSearch')?.value||'').toLowerCase(),st=($('stockStatus')?.value||'READY'),cat=($('stockCategory')?.value||''),isManagement=!!profile?.is_management,outlet=($('stockOutlet')?.value||'');const rows=inventoryStock.filter(s=>(!outlet||s.outlet===outlet)&&(!st||s.status===st)&&(!cat||s.category===cat)&&(!q||searchHaystack([s.product,s.variant,s.color,s.imei_1,s.imei_2,s.grade,s.condition,s.hunter_name,s.outlet,s.category,invCategory(s.category)].join(' '),q)));const outlets=[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean).concat(['Majesty Plaza iPhone','Majesty Refill Phone']))].sort();const groupByCategory=!isManagement&&!cat;const categoryOrder=['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND','STOCK_NEW_PUSAT','STOCK_SECOND_PUSAT'];const grouped=categoryOrder.map(k=>({key:k,rows:rows.filter(s=>s.category===k)})).filter(g=>g.rows.length);const unknown=rows.filter(s=>!categoryOrder.includes(s.category));if(unknown.length)grouped.push({key:'OTHER',rows:unknown});const stockHtml=groupByCategory?grouped.map(g=>'<div style="margin:16px 0 8px;font-size:16px;font-weight:800;border-bottom:1px solid #e5e7eb;padding-bottom:6px">'+(g.key==='OTHER'?'Lainnya':invCategory(g.key))+' <span class="small">('+g.rows.length+' unit)</span></div>'+g.rows.map(stockCard).join('')).join(''):rows.map(stockCard).join('');body.innerHTML='<div class="row"><input id="stockSearch" placeholder="Cari produk, IMEI, grade, warna, hunter..." value="'+esc(q)+'" oninput="renderInventoryBody()"><select id="stockStatus" onchange="renderInventoryBody()"><option value="">Semua Status</option><option>READY</option><option>RESERVED</option><option>SOLD</option><option>RETURN</option></select><select id="stockCategory" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select>'+(isManagement?'<select id="stockOutlet" onchange="renderInventoryBody()"><option value="">📍 Semua Outlet</option>'+outlets.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>':'')+'</div><div class="small" style="margin-top:8px">📍 '+(isManagement?(outlet||'Semua Outlet'):esc(profile?.outlet||'-'))+' • '+rows.length+' unit</div>'+'<div style="margin-top:10px"><div style="font-weight:800;margin-bottom:8px">📱 RINCIAN UNIT</div>'+(stockHtml||'<p class="small">Belum ada stock.</p>')+'</div>';if($('stockStatus'))$('stockStatus').value=st;if($('stockCategory'))$('stockCategory').value=cat;if($('stockOutlet'))$('stockOutlet').value=outlet;const si=$('stockSearch');if(si){si.focus();si.setSelectionRange(si.value.length,si.value.length)}}
function productShareText(s){const nl=String.fromCharCode(10),c=s.category;let raw=String(s.product||'').trim(),suffix=/(?:\s+)(NEW|SECOND)$/i.exec(raw)?.[1]?.toUpperCase()||'';raw=raw.replace(/\s+(NEW|SECOND)$/i,'').trim();let t='📱 '+[raw,s.variant,s.color,suffix].filter(Boolean).join(' — ')+nl;if(c==='IPHONE_SECOND')t+='Grade: '+(s.grade||'-')+nl+'Kondisi: '+(s.condition||'-')+nl+'Battery Health: '+(s.battery_health!=null?s.battery_health+'%':'-')+nl+'Kelengkapan: '+(s.completeness||'-')+nl+'Minus: '+(s.minus||'-')+nl;else if(c==='ANDROID_SECOND')t+='Warna: '+(s.color||'-')+nl+'Kondisi: '+(s.condition||'-')+nl+'Kelengkapan: '+(s.completeness||'-')+nl+'Minus: '+(s.minus||'-')+nl;else if(c==='ANDROID_NEW')t+='Warna: '+(s.color||'-')+nl;t+='IMEI: '+maskImei(s.imei_1)+nl+'Harga Jual: Rp'+inventoryNumber(s.asking_price).toLocaleString('id-ID')+nl+'Status: '+s.status+nl+nl+'Hello Majesty';return t}

async function shareProduct(s){
 const text=productShareText(s),urls=stockPhotoUrls(s);
 if(navigator.share){
  try{
   const files=[];
   for(let i=0;i<urls.length;i++){const r=await fetch(urls[i]);if(!r.ok)continue;const b=await r.blob();files.push(new File([b],`foto-${i+1}.webp`,{type:b.type||'image/webp'}))}
   if(files.length&&navigator.canShare?.({files})){await navigator.share({text,files});return}
   await navigator.share({text});return;
  }catch(e){if(e?.name==='AbortError')return}
 }
 try{await navigator.clipboard?.writeText(text)}catch(e){}
 alert(urls.length?'Info produk disalin. Foto tersedia di Detail Produk.':'Info produk sudah disalin. Silakan paste ke WhatsApp customer.');
}
function stockPhotoUrls(s){return [s?.photo_1,s?.photo_2,s?.photo_3,s?.photo_4,s?.photo_5].filter(Boolean)}
async function prepareStockPhoto(file){
 if(!file||!file.type?.startsWith('image/'))throw new Error('File harus berupa gambar.');
 const targetBytes=700*1024;
 const maxSide=1600;
 const img=await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Foto tidak dapat dibaca.'))};im.src=u});
 let side=Math.min(maxSide,Math.max(img.naturalWidth,img.naturalHeight));
 let blob=null;
 for(let pass=0;pass<5;pass++){
   const scale=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw new Error('Browser tidak mendukung pemrosesan foto.');
   ctx.imageSmoothingEnabled=true;
   ctx.imageSmoothingQuality='high';
   ctx.fillStyle='#fff';
   ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const quality of [.86,.80,.74,.68,.62]){
     blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Gagal menyiapkan foto.')),'image/jpeg',quality));
     if(blob.size<=targetBytes)return {blob,ext:'jpg',contentType:'image/jpeg'};
   }
   side=Math.max(1200,Math.round(side*.85));
 }
 if(!blob)throw new Error('Gagal menyiapkan foto.');
 return {blob,ext:'jpg',contentType:'image/jpeg'};
}
async function uploadStockPhoto(stockId,slot,file){
 if(!hasContentCreatorAccess())return alert('Akses Management atau Content Creator diperlukan.');
 if(!file)return;
 try{
  const btn=document.activeElement;
  if(btn&&btn.tagName==='INPUT')btn.disabled=true;
  let prepared;
  try{
   prepared=await prepareStockPhoto(file);
  }catch(prepErr){
   if(file.size>8*1024*1024)throw prepErr;
   prepared={blob:file,ext:(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'),contentType:file.type||'image/jpeg'};
  }
  const path=stockId+'/foto-'+slot+'.'+prepared.ext;
  const up=await sb.storage.from('stock-photos').upload(path,prepared.blob,{contentType:prepared.contentType,cacheControl:'31536000',upsert:true});
  if(up.error)throw up.error;
  const pub=sb.storage.from('stock-photos').getPublicUrl(path);
  const url=pub?.data?.publicUrl;
  if(!url)throw new Error('URL foto tidak berhasil dibuat.');
  const rpc=await sb.rpc('update_stock_photo',{p_stock_id:stockId,p_slot:Number(slot),p_photo_url:url});
  if(rpc.error)throw rpc.error;
  alert('✅ Foto '+slot+' berhasil diupload.');
  await renderInventory();
  openProductDetail(stockId);
 }catch(e){
  console.error('[HM] uploadStockPhoto',e);
  alert('Foto '+slot+' gagal diupload: '+(e?.message||e));
 }
}
async function deleteStockPhoto(stockId,slot){
 if(!hasContentCreatorAccess())return alert('Akses Management atau Content Creator diperlukan.');
 if(!confirm('Hapus Foto '+slot+' dari unit ini?'))return;
 const paths=['jpg','jpeg','png','webp'].map(ext=>`${stockId}/foto-${slot}.${ext}`);
 const rm=await sb.storage.from('stock-photos').remove(paths);if(rm.error)return alert(rm.error.message);
 const data={};data['photo_'+slot]=null;data.updated_at=new Date().toISOString();
 const db=await sb.from('stock_units').update(data).eq('id',stockId);if(db.error)return alert(db.error.message);
 await renderInventory();openProductDetail(stockId);
}
function stockPhotoGallery(s,editable=false){
 const urls=[s?.photo_1,s?.photo_2,s?.photo_3,s?.photo_4,s?.photo_5];
 return '<div style="margin-top:12px"><b>📷 Foto Unit</b><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:8px">'+urls.map((u,i)=>u?
 '<div><img src="'+esc(u)+'" alt="Foto '+(i+1)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:9px;border:1px solid #ddd;cursor:pointer" onclick="window.open(\''+esc(u)+'\',\'_blank\')">'+(editable?'<button class="danger" style="width:100%;margin-top:4px;font-size:11px" onclick="deleteStockPhoto(\''+s.id+'\','+(i+1)+')">Hapus</button>':'')+'</div>':
 (editable?'<label style="display:flex;align-items:center;justify-content:center;aspect-ratio:1;border:1px dashed #bbb;border-radius:9px;font-size:11px;text-align:center;cursor:pointer">＋ Foto '+(i+1)+'<input type="file" accept="image/*" style="display:none" onchange="uploadStockPhoto(\''+s.id+'\','+(i+1)+',this.files[0])"></label>':'<div style="aspect-ratio:1;border:1px dashed #ddd;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#98a2b3">Foto '+(i+1)+'</div>')
 ).join('')+'</div></div>';
}
function openProductDetail(id){const s=inventoryStock.find(x=>x.id===id);if(!s)return;const c=s.category;let d='';if(c==='IPHONE_SECOND')d='<b>Grade:</b> '+esc(s.grade||'-')+'<br><b>Kondisi:</b> '+esc(s.condition||'-')+'<br><b>Battery Health:</b> '+(s.battery_health!=null?s.battery_health+'%':'-')+'<br><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'<br><b>Minus:</b> '+esc(s.minus||'-')+'<br>';else if(c==='ANDROID_SECOND')d='<b>Warna:</b> '+esc(s.color||'-')+'<br><b>Kondisi:</b> '+esc(s.condition||'-')+'<br><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'<br><b>Minus:</b> '+esc(s.minus||'-')+'<br>';else if(c==='ANDROID_NEW')d='<b>Warna:</b> '+esc(s.color||'-')+'<br>';d+='<b>IMEI:</b> '+esc(canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1))+'<br><b>Harga Jual:</b> Rp'+inventoryNumber(s.asking_price).toLocaleString('id-ID');const html=`<div class="box"><h2 style="margin:0">${esc((()=>{let raw=String(s.product||'').trim(),suffix=/(?:\s+)(NEW|SECOND)$/i.exec(raw)?.[1]?.toUpperCase()||'';raw=raw.replace(/\s+(NEW|SECOND)$/i,'').trim();return [raw,s.variant,s.color,suffix].filter(Boolean).join(' — ')})())}</h2><div class="small">${invCategory(s.category)} • ${esc(s.status)}</div></div><div class="lead">${d}${stockPhotoGallery(s,false)}</div><div class="row"><button class="success" onclick="shareProduct(inventoryStock.find(x=>x.id===\'${id}\'))">📤 Kirim Info Customer</button>${profile?.role==='SALES'&&s.status==='READY'?'<button class="success" onclick="closeModal();openSellStock(\''+id+'\')">💰 Closing</button>':''}</div>`;$('mt').textContent='📱 Detail Produk';$('mb').innerHTML=html;$('modal').classList.remove('hidden')}
async function openSellStock(stockId){
 const s=(inventoryStock||[]).find(x=>x.id===stockId);
 if(!s||s.status!=='READY')return alert('Stock tidak tersedia untuk Closing.');
 if(profile?.role!=='SALES')return alert('Closing Stock Siap Jual hanya dapat diajukan oleh Sales.');
 if(typeof window.salesResult!=='function')return alert('Form Closing belum siap. Silakan refresh aplikasi.');
 const temp='STOCK-CLOSING-'+String(stockId).replace(/-/g,'').slice(0,12)+'-'+Date.now();
 window.hmStockClosingApprovalMode=true; window.hmStockClosingTempLeadId=temp;
 window.leads=window.leads||[];
 window.leads.push({lead_id:temp,customer:'Walk-In',whatsapp:'',outlet:profile?.outlet||s.outlet,product:[s.product,s.variant,s.color].filter(Boolean).join(' — '),status_lead:'HANDLE',sales_claimed_by:profile?.name||'',sales_result:'POTENSIAL'});
 try{
   await window.salesResult(temp);
   const sel=document.getElementById('ss');
   if(sel){sel.value=stockId;sel.dispatchEvent(new Event('change',{bubbles:true}));}
   const title=document.getElementById('mt'); if(title)title.textContent='💰 Closing Stock Siap Jual';
 }catch(e){
   window.hmStockClosingApprovalMode=false;window.hmStockClosingTempLeadId=null;
   window.leads=window.leads.filter(l=>String(l.lead_id)!==String(temp));throw e;
 }
}

function invCategory(c){return ({IPHONE_NEW:'iPhone New',IPHONE_SECOND:'iPhone Second',ANDROID_NEW:'Android New',ANDROID_SECOND:'Android Second',STOCK_NEW_PUSAT:'Stock New Pusat',STOCK_SECOND_PUSAT:'Stock Second Pusat'})[c]||c}
function masterProductLabel(p){const variant=String(p.variant||'').replace(/\s*GB\b/ig,'').trim();let product=String(p.product||'').trim();const suffix=/(?:\s+)(NEW|SECOND)$/i.exec(product)?.[1]?.toUpperCase()||'';if(suffix)product=product.replace(/\s+(NEW|SECOND)$/i,'').trim();return [product,variant,p.color,suffix].filter(Boolean).join(' — ')}
function stockCard(s){
 const management=!!profile?.is_management,facilitator=inventoryCanFacilitator,contentCreator=!!inventoryCanContentCreator || String(profile?.role||'').toUpperCase()==='CONTENT CREATOR' || String(profile?.role||'').toUpperCase()==='CONTENT_CREATOR',canViewCost=management||facilitator,ready=s.status==='READY',sales=profile?.role==='SALES',c=s.category,isSecond=c==='IPHONE_SECOND'||c==='ANDROID_SECOND';
 const rawTitle=String(s.product||'').trim(),suffix=/(?:\s+)(NEW|SECOND)$/i.exec(rawTitle)?.[1]?.toUpperCase()||'';
 const cleanProduct=rawTitle.replace(/\s+(NEW|SECOND)$/i,'').trim();
 const title=[cleanProduct,s.variant,s.color,suffix].filter(Boolean).join(' — ');
 const photo=s.photo_1?'<img src="'+esc(s.photo_1)+'" alt="Foto unit" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid #ddd;cursor:pointer" onclick="window.open(\''+esc(s.photo_1)+'\',\'_blank\')">':'<div style="width:72px;height:72px;border-radius:10px;border:1px dashed #d0d5dd;display:flex;align-items:center;justify-content:center;font-size:11px;color:#98a2b3">No Foto</div>';
 let meta=[];
 if(c==='IPHONE_SECOND'&&s.grade)meta.push('<b>Grade '+esc(s.grade)+'</b>');
 if(isSecond&&s.condition)meta.push(esc(s.condition));
 if(c==='IPHONE_SECOND'&&s.battery_health!=null)meta.push('BH '+s.battery_health+'%');
 const imei=canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1);
 let details='';
 if(isSecond){
   details='<div style="margin-top:8px;font-size:13px;line-height:1.55">'+
     '<div><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'</div>'+
     '<div><b>Minus:</b> '+esc(s.minus||'-')+'</div>'+
   '</div>';
 }
 const salePrice='<div style="margin-top:9px"><div style="font-size:12px;font-weight:600;color:#667085">Harga Jual</div><div style="font-size:21px;line-height:1.2;font-weight:800">Rp'+inventoryNumber(s.asking_price).toLocaleString('id-ID')+'</div></div>';
 const cost=canViewCost?'<div class="small" style="margin-top:6px"><b>Harga Beli:</b> Rp'+inventoryNumber(s.cost).toLocaleString('id-ID')+'</div>':'';
 return '<div class="lead" style="padding:14px;margin-bottom:10px">'+
   '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div style="display:flex;gap:10px;min-width:0"><div>'+photo+'</div><div><b style="font-size:18px;line-height:1.3">'+esc(title)+'</b></div></div><span class="badge">'+esc(s.status||'-')+'</span></div>'+
   '<div class="small" style="margin-top:8px">📍 Outlet: <b>'+esc(s.outlet||'-')+'</b>'+(s.status==='SOLD'?' • Terjual '+new Date(s.sold_at).toLocaleDateString('id-ID'):'')+'</div>'+
   '<div class="small" style="margin-top:6px;line-height:1.45">'+meta.join(' • ')+'</div>'+
   '<div class="small" style="margin-top:5px">IMEI: '+esc(imei)+'</div>'+
   cost+details+salePrice+
   '<div class="row" style="margin-top:10px"><button class="secondary" onclick="openProductDetail(\''+s.id+'\')">👁️ Detail</button><button class="secondary" onclick="openStockHistory(\''+s.id+'\')">🧾 Histori</button><button class="secondary" onclick="openStockAI(\''+s.id+'\')">🤖 Tanya AI</button>'+
   (ready&&sales?'<button class="success" onclick="openSellStock(\''+s.id+'\')">🔴 SOLD / CLOSING</button>':'')+((ready&&(management||facilitator))?'<button class="danger" onclick="openSupplierReturn(\''+s.id+'\')">↩️ Retur Supplier</button>':'')+
   (management||facilitator?'<button class="secondary" onclick="openEditStock(\''+s.id+'\')">Edit</button>':'')+(management||contentCreator?'<button class="secondary" onclick="openEditStockPhotos(\''+s.id+'\')">📷 Edit Foto</button>':'')+
   '</div></div>';
}
async function openSupplierReturn(id){
 const s=inventoryStock.find(x=>x.id===id);
 if(!s)return alert('Stock tidak ditemukan.');
 if(s.status!=='READY')return alert('Hanya stock READY yang dapat diretur.');
 if(!(profile?.is_management||inventoryCanFacilitator))return alert('Hanya Management atau Facilitator yang dapat melakukan retur supplier.');
 const label=[s.product,s.variant,s.color].filter(Boolean).join(' — ');
 $('mt').textContent='↩️ Retur Supplier';
 $('mb').innerHTML='<div class="notice"><b>Barang:</b> '+esc(label)+'<br><b>Outlet:</b> '+esc(s.outlet||'-')+'<br><b>IMEI:</b> '+esc(canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1))+'</div>'+
 '<label>Alasan Retur</label><textarea id="retReason" rows="3" placeholder="Contoh: Unit bermasalah / salah kirim / tidak sesuai kondisi"></textarea>'+
 '<label>Penyelesaian dengan Supplier</label><select id="retSettlement"><option value="CREDIT_SUPPLIER">Potong Hutang Supplier</option><option value="REFUND_CASH">Uang Dikembalikan Supplier</option><option value="EXCHANGE">Tukar Barang</option><option value="PENDING">Menunggu Penyelesaian</option></select>'+
 '<label>Catatan (opsional)</label><textarea id="retNotes" rows="2"></textarea>'+
 '<button class="danger" onclick="confirmSupplierReturn(\''+String(id).replace(/'/g,"\\'")+'\')">↩️ Konfirmasi Retur</button>';
 $('modal').classList.remove('hidden');
}
async function confirmSupplierReturn(id){
 const reason=String($('retReason')?.value||'').trim();
 if(!reason)return alert('Alasan retur wajib diisi.');
 const settlement=$('retSettlement')?.value||'CREDIT_SUPPLIER';
 const notes=String($('retNotes')?.value||'').trim()||null;
 if(!confirm('Yakin barang ini dikembalikan ke supplier? Stock akan berubah menjadi RETURN dan tidak dapat dijual lagi.'))return;
 const r=await sb.rpc('return_stock_to_supplier',{p_stock_id:id,p_reason:reason,p_settlement_type:settlement,p_actor_user_id:profile?.user_id||null,p_return_value:null,p_notes:notes});
 if(r.error)return alert('Retur gagal: '+r.error.message);
 alert('✅ Retur supplier berhasil dicatat.');
 closeModal();
 await renderInventory();
}
function openStockAI(id){
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 $('mt').textContent='🤖 Tanya AI — '+[s.product,s.variant,s.color].filter(Boolean).join(' — ');
 $('mb').innerHTML='<div class="notice"><b>Produk:</b> '+esc([s.product,s.variant,s.color].filter(Boolean).join(' — '))+'<br><b>Status:</b> '+esc(s.status||'-')+'<br><b>Harga Jual:</b> '+fmtRp(s.asking_price)+'</div><label>Pertanyaan</label><textarea id="stockAIQuestion" rows="4" placeholder="Contoh: Bagaimana cara menawarkan produk ini ke customer?"></textarea><div class="small" style="margin-top:6px">AI menggunakan Master Prompt Hello Majesty dan konteks produk ini. Harga beli/modal tidak dikirim untuk role yang tidak berwenang.</div><button id="stockAIAskBtn" class="success" style="margin-top:10px" onclick="askStockAI(' + JSON.stringify(s.id) + ')">🤖 Tanya AI</button><div id="stockAIAnswer" class="box hidden" style="white-space:pre-wrap;margin-top:12px"></div>';
 $('modal').classList.remove('hidden');setTimeout(()=>$('stockAIQuestion')?.focus(),50);
}
async function askStockAI(id){
 const q=String($('stockAIQuestion')?.value||'').trim();if(!q)return alert('Pertanyaan wajib diisi.');
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 const btn=$('stockAIAskBtn'),out=$('stockAIAnswer');if(btn)btn.disabled=true;if(out){out.classList.remove('hidden');out.textContent='AI sedang menganalisis produk...';}
 const canViewCost=!!profile?.is_management||!!inventoryCanFacilitator;
 const stock={id:s.id,category:s.category,product:s.product,variant:s.variant,color:s.color,grade:s.grade,battery_health:s.battery_health,condition:s.condition,completeness:s.completeness,minus:s.minus,status:s.status,asking_price:s.asking_price,outlet:s.outlet};
 if(canViewCost){stock.cost=s.cost;stock.imei_1=s.imei_1;stock.imei_2=s.imei_2;}
 try{
  const x=await sb.functions.invoke('hello-majesty-ai',{body:{question:q,profile:{name:profile?.name||'',role:profile?.role||'',outlet:profile?.outlet||'',is_management:!!profile?.is_management},stock}});
  if(x.error)throw x.error;
  if(out)out.textContent=x.data?.answer||'AI tidak memberikan jawaban.';
 }catch(e){if(out)out.textContent='AI belum dapat digunakan. Pastikan layanan AI sudah dikonfigurasi oleh Management.\n\n'+(e?.message||e)}
 finally{if(btn)btn.disabled=false}
}
function canMarkStockSold(){ const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' '); return !!profile?.is_management || !!inventoryCanFacilitator || role==='SALES' || role==='CS'; }
async function cleanupSoldStockPhotos(stockId){
 const paths=[];
 ['jpg','jpeg','png','webp'].forEach(ext=>{
  for(let slot=1;slot<=5;slot++)paths.push(stockId+'/foto-'+slot+'.'+ext);
 });
 const rm=await sb.storage.from('stock-photos').remove(paths);
 if(rm.error)throw rm.error;
 const db=await sb.from('stock_units').update({
  photo_1:null,photo_2:null,photo_3:null,photo_4:null,photo_5:null,
  updated_at:new Date().toISOString()
 }).eq('id',stockId);
 if(db.error)throw db.error;
 return true;
}
async function markStockSold(id){
 // SOLD tidak boleh melewati Form Hasil Sales/Closing dan persetujuan.
 if(typeof openSellStock==='function') return openSellStock(id);
 return alert('Form Closing belum siap. Silakan refresh aplikasi.');
}
function openProductMaster(){
 const canOpen=!!profile?.is_management || inventoryCanFacilitator;
 if(!canOpen)return;
 const management=!!profile?.is_management;
 $('mt').textContent='⚙️ Master Produk';
 $('mb').innerHTML='<button class="success" onclick="openAddProduct()">＋ Tambah Produk</button><div style="margin-top:10px">'+inventoryProducts.map(p=>'<div class="lead"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>'+esc(masterProductLabel(p))+'</b><div class="small">'+invCategory(p.category)+'</div></div><div class="row"><button class="secondary" onclick="openEditProduct(\''+p.id+'\')">✏️ Edit</button>'+(management?'<button class="danger" onclick="deactivateProduct(\''+p.id+'\')">Hapus</button>':'')+'</div></div></div>').join('')+'</div>';
 $('modal').classList.remove('hidden');
}
function openEditProduct(id){
 if(!(profile?.is_management||inventoryCanFacilitator))return alert('Akses Management atau Facilitator diperlukan.');
 const p=inventoryProducts.find(x=>x.id===id);if(!p)return;
 $('mt').textContent='✏️ Edit Master Produk';
 $('mb').innerHTML='<label>Kategori</label><select id="epmcat" onchange="toggleEditProductFields()"><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><label>Produk</label><input id="epmprod" value="'+esc(p.product||'')+'"><label>Varian</label><input id="epmvar" value="'+esc(p.variant||'')+'"><div id="epmcolorBox"><label>Warna</label><input id="epmcolor" value="'+esc(p.color||'')+'"></div><button class="success" onclick="saveEditProduct(\''+id+'\')">Simpan Perubahan</button>';
 $('epmcat').value=p.category||'ANDROID_NEW';toggleEditProductFields();$('modal').classList.remove('hidden');
}
function toggleEditProductFields(){
 const cat=$('epmcat')?.value||'',iphone=cat.startsWith('IPHONE');
 $('epmcolorBox')?.classList.toggle('hidden',!iphone);
}
async function saveEditProduct(id){
 if(!(profile?.is_management||inventoryCanFacilitator))return alert('Akses Management atau Facilitator diperlukan.');
 const cat=$('epmcat').value,isIphone=cat.startsWith('IPHONE'),rawProduct=$('epmprod').value.trim(),product=rawProduct.replace(/\s+(NEW|SECOND)$/i,'')+(cat.includes('SECOND')?' SECOND':(cat.includes('NEW')?' NEW':'')),variant=$('epmvar').value.trim();
 if(!product||!variant)return alert('Produk dan Storage wajib diisi.');
 const x=await sb.from('product_master').update({category:cat,product,variant,updated_at:new Date().toISOString()}).eq('id',id);
 if(x.error)return alert(x.error.message);closeModal();await renderInventory();
}
async function deactivateProduct(id){
 if(!profile?.is_management)return alert('Akses Management diperlukan.');
 const p=inventoryProducts.find(x=>x.id===id);if(!p)return;
 const chk=await sb.from('stock_units').select('id',{count:'exact',head:true}).eq('product_id',id);
 if(chk.error)return alert('Gagal mengecek stock: '+chk.error.message);
 if((chk.count||0)>0){
  return alert('Master Produk tidak bisa dihapus karena masih digunakan oleh '+chk.count+' stock unit. Selesaikan/pindahkan stock terlebih dahulu.');
 }
 if(!confirm('Hapus Master Produk "'+(p.product||'')+' '+(p.variant||'')+'"? Produk akan dinonaktifkan dan tidak dihapus dari histori.'))return;
 const x=await sb.from('product_master').update({active:false,updated_at:new Date().toISOString()}).eq('id',id);
 if(x.error)return alert(x.error.message);closeModal();await renderInventory();
}
function openAddProduct(){$('mt').textContent='＋ Master Produk';$('mb').innerHTML='<label>Kategori</label><select id="pmcat"><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><label>Produk</label><input id="pmprod" placeholder="Contoh: iPhone 17 Pro Max"><label>Varian</label><input id="pmvar" placeholder="256"><button class="success" onclick="saveProduct()">Simpan Produk</button>';$('modal').classList.remove('hidden')}
function toggleProductFields(){}
async function saveProduct(){const cat=$('pmcat').value,isIphone=cat.startsWith('IPHONE'),isSecond=cat.includes('SECOND'),rawProduct=$('pmprod').value.trim(),product=rawProduct.replace(/\s+(NEW|SECOND)$/i,'')+(cat.includes('SECOND')?' SECOND':(cat.includes('NEW')?' NEW':'')),variant=$('pmvar').value.trim();if(!product||!variant)return alert('Produk dan Storage wajib diisi.');const grade=null;const x=await sb.from('product_master').insert({category:cat,product,variant,grade});if(x.error)return alert(x.error.message);closeModal();await renderInventory();openProductMaster()}
function normalizeSearch(q){return String(q||'').toLowerCase().trim().replace(/\bip\s*(?=\d)/g,'iphone ').replace(/\biph\s*(?=\d)/g,'iphone ').replace(/\bpm\b/g,'pro max').replace(/\s+/g,' ')}
function searchHaystack(value,q){const hay=normalizeSearch(value),needle=normalizeSearch(q);if(!needle)return true;return hay.includes(needle)||hay.replace(/\s+/g,'').includes(needle.replace(/\s+/g,''))}
async function filterReceiveProducts(){const q=($('stprodsearch')?.value||'').trim().toLowerCase();const sel=$('stprod');if(!sel)return;const current=sel.value;Array.from(sel.options).forEach(o=>{const p=inventoryProducts.find(x=>x.id===o.value);if(!p){o.hidden=false;return;}const hay=[p.product,p.variant,p.color,p.category,invCategory(p.category)].join(' ').toLowerCase();o.hidden=!!q&&!searchHaystack(hay,q);});if(current&&!sel.querySelector('option[value="'+CSS.escape(current)+'"]')?.hidden)sel.value=current;toggleReceiveFields();}
async function openReceiveStock(){
 if(!canReceiveStock()){alert('Barang Masuk hanya dapat diakses Management, Fasilitator, dan Admin Finance Majesty Cell.');return;}
 const teams=await sb.from('team_directory').select('*').order('name');if(teams.error)return alert(teams.error.message);
 const products=inventoryProducts.map(p=>'<option value="'+p.id+'">'+esc(masterProductLabel(p))+'</option>').join('');
 const selected=inventoryProducts.find(p=>p.id===$('stprod')?.value);
 const isIphoneNew=selected?.category==='IPHONE_NEW',isIphoneSecond=selected?.category==='IPHONE_SECOND',isAndroidNew=selected?.category==='ANDROID_NEW';
 const teamRows=teams.data||[]; const profs=await sb.from('team_profiles').select('user_id,name,is_management'); if(profs.error)return alert(profs.error.message); const mgmtIds=new Set((profs.data||[]).filter(x=>x.is_management).map(x=>x.user_id)); const perm=await sb.from('team_permissions').select('name,outlet,can_hunter,active').eq('active',true).eq('can_hunter',true); if(perm.error)return alert(perm.error.message); const allowed=perm.data||[]; const hunters=teamRows.filter(t=>!mgmtIds.has(t.user_id)&&allowed.some(x=>String(x.name).trim().toLowerCase()===String(t.name).trim().toLowerCase()&&String(x.outlet).trim().toLowerCase()===String(t.outlet||'').trim().toLowerCase())).map(t=>'<option value="'+t.user_id+'" data-hunter-outlet="'+esc(t.outlet||'')+'">'+esc(t.name)+'</option>').join('');
 const isMgmt=!!profile?.is_management;const hunterOptions=hunters;
 $('mt').textContent='📦 Barang Masuk';
 $('mb').innerHTML=(isMgmt?'<label>Barang Masuk Ke</label><select id="stoutlet" onchange="filterHunterOptions()">'+[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean).concat(['Majesty Plaza iPhone','Majesty Refill Phone']))].sort().map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>':'<div class="small" style="margin-bottom:8px">📍 Barang masuk ke: <b>'+esc(profile?.outlet||'-')+'</b></div>')+
 '<label>Produk</label><input id="stprodsearch" placeholder="Cari: iPhone 15 / second / new / pusat / warna..." oninput="filterReceiveProducts()"><select id="stprod" onchange="toggleReceiveFields()">'+products+'</select><label>Varian / Storage</label><input id="stvariant" readonly placeholder="Otomatis dari Master Produk">'+
 '<div id="receiveSourceFields"><label>Sumber Barang</label><select id="stsource" onchange="toggleHunterField();togglePartnerFields()"><option value="MANAGEMENT">Management / Stok Sendiri</option><option value="MAJESTY_CELL">Majesty Cell</option><option value="GESERAN">Geseran</option><option value="HUNTER">Hunter</option></select><div id="partnerBox" class="hidden"><label>Partner</label><select id="stpartner"><option value="Majesty Cell">Majesty Cell</option></select><div class="small">Aturan partner mengikuti outlet tujuan.</div></div><div id="hunterBox" class="hidden"><label>Pilih Hunter</label><select id="sthunter">'+hunterOptions+'</select></div></div><div id="standardReceiveFields"><label>IMEI 1</label><input id="stimei1"><label>IMEI 2 (opsional)</label><input id="stimei2"><label>Kondisi</label><input id="stcondition" placeholder="Contoh: 95% / Mulus"><label>Battery Health</label><input id="stbh" type="number" min="0" max="100" placeholder="89"><label>Kelengkapan</label><input id="stcomplete" placeholder="Unit + Box + Cable"><label>Minus</label><textarea id="stminus"></textarea></div>'+
 '<div id="iphoneNewFields" class="hidden"><label>IMEI 1</label><input id="stimei1new"><label>IMEI 2 / EID (opsional)</label><input id="stimei2new"><label>Harga Beli</label><input id="stcostnew" type="number"><label>Harga Jual</label><input id="stpricenew" type="number"><label>Supplier / Dealer (opsional)</label><input id="stsupplier" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="stnotesnew"></textarea></div>'+
 '<div id="iphoneSecondFields" class="hidden"><label>IMEI 1</label><input id="stimei1second"><label>IMEI 2 / EID (opsional)</label><input id="stimei2second"><label>Grade</label><select id="stgradesecond"><option value="">Pilih Grade</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select><label>Battery Health</label><input id="stbhsecond" type="number" min="0" max="100" placeholder="89"><label>Kondisi</label><input id="stconditionsecond" placeholder="Contoh: Mulus / 95%"><label>Kelengkapan</label><input id="stcompletesecond" placeholder="Unit + Box + Cable"><label>Minus (opsional)</label><textarea id="stminusseconde"></textarea><label>Harga Beli</label><input id="stcostsecond" type="number"><label>Harga Jual</label><input id="stpricesec" type="number"><label>Supplier / Dealer (opsional)</label><input id="stsuppliersecond" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="stnotessecond"></textarea></div>'+
 '<div id="androidNewFields" class="hidden"><label>Warna</label><input id="standroidcolor" placeholder="Contoh: Violet"><label>IMEI 1</label><input id="standroidimei1"><label>IMEI 2 (opsional)</label><input id="standroidimei2"><label>Harga Beli</label><input id="standroidcost" type="number"><label>Harga Jual</label><input id="standroidprice" type="number"><label>Supplier / Dealer (opsional)</label><input id="standroidsupplier" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="standroidnotes"></textarea></div>'+
 '<div id="androidSecondFields" class="hidden"><label>Warna</label><input id="standroidsecondcolor" placeholder="Contoh: Black"><label>IMEI 1</label><input id="standroidsecondimei1"><label>IMEI 2 (opsional)</label><input id="standroidsecondimei2"><label>Kondisi</label><input id="standroidsecondcondition" placeholder="Contoh: Mulus / 90%"><label>Kelengkapan</label><input id="standroidsecondcomplete" placeholder="Unit + Box + Cable"><label>Minus (opsional)</label><textarea id="standroidsecondminus"></textarea><label>Harga Beli</label><input id="standroidsecondcost" type="number"><label>Harga Jual</label><input id="standroidsecondprice" type="number"><label>Supplier / Dealer (opsional)</label><input id="standroidsecondsupplier" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="standroidsecondnotes"></textarea></div><div id="standardPriceFields"><label>Harga Modal</label><input id="stcost" type="number"><label>Harga Jual</label><input id="stprice" type="number"><label>Referensi Barang Masuk</label><input id="stref" placeholder="Invoice / nota / kode hunter"><label>Catatan</label><textarea id="stnotes"></textarea></div><button class="success" onclick="saveStock()">Simpan Stock Ready</button>';
 toggleReceiveFields();
 $('modal').classList.remove('hidden');
 const receiveRole=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');if(receiveRole==='ADMIN FINANCE MAJESTY CELL'){if($('stsource')){$('stsource').value='MAJESTY_CELL';$('stsource').disabled=true;}if($('stpartner')){$('stpartner').value='Majesty Cell';$('stpartner').disabled=true;}togglePartnerFields();const saveBtn=$('mb').querySelector('button.success[onclick="saveStock()"]');if(saveBtn)saveBtn.textContent='Kirim untuk Persetujuan';$('mb').insertAdjacentHTML('afterbegin','<div class="notice"><b>Barang Masuk Majesty Cell</b><br>Setelah disimpan, barang akan <b>MENUNGGU PERSETUJUAN</b> Management/Facilitator sebelum menjadi Stock READY.</div><button class="secondary" style="margin-bottom:8px" onclick="openMyInventoryReceiveStatus()">📋 Status Pengajuan Saya</button>');}
 filterHunterOptions();
}
function toggleReceiveFields(){
 const p=inventoryProducts.find(x=>x.id===$('stprod')?.value),isNew=p?.category==='IPHONE_NEW',isSecond=p?.category==='IPHONE_SECOND',isAndroidNew=p?.category==='ANDROID_NEW',isAndroidSecond=p?.category==='ANDROID_SECOND';
 if($('stvariant'))$('stvariant').value=p?.variant||'';
 $('standardReceiveFields')?.classList.toggle('hidden',isNew||isSecond||isAndroidNew||isAndroidSecond);
 $('standardPriceFields')?.classList.toggle('hidden',isNew||isSecond||isAndroidNew||isAndroidSecond);
 $('iphoneNewFields')?.classList.toggle('hidden',!isNew);
 $('iphoneSecondFields')?.classList.toggle('hidden',!isSecond);
 $('androidNewFields')?.classList.toggle('hidden',!isAndroidNew);
 $('androidSecondFields')?.classList.toggle('hidden',!isAndroidSecond);
 const source=$('stsource');if(source)source.onchange=()=>{$('hunterBox')?.classList.toggle('hidden',source.value!=='HUNTER')};
}
async function saveStock(){
 const source=$('stsource')?.value||'MANAGEMENT';
 if(!canReceiveStock(source)){alert('Admin Finance Majesty Cell hanya dapat input Barang Masuk sumber Majesty Cell.');return;}
 const receiveOutlet=inventoryReceiveOutlet();
 const hunter=source==='HUNTER'?($('sthunter')?.value||''):null;
 const partnerName=$('stpartner')?.value||null;
 if(source==='HUNTER'&&!hunter)return alert('Hunter wajib dipilih.');
 if(source==='MAJESTY_CELL'&&!partnerName)return alert('Partner wajib dipilih.');
 if(!receiveOutlet)return alert('Outlet tujuan barang masuk wajib dipilih.');
 const selectedProduct=inventoryProducts.find(p=>p.id===$('stprod')?.value),isIphoneNew=selectedProduct?.category==='IPHONE_NEW',isIphoneSecond=selectedProduct?.category==='IPHONE_SECOND',isAndroidNew=selectedProduct?.category==='ANDROID_NEW',isAndroidSecond=selectedProduct?.category==='ANDROID_SECOND';
 let data;
 if(isIphoneNew){
  const imei1=$('stimei1new').value.trim(),cost=$('stcostnew').value,price=$('stpricenew').value;
  if(!imei1||cost===''||price==='')return alert('Untuk iPhone New, IMEI 1, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,imei_1:imei1,imei_2:$('stimei2new').value.trim()||null,grade:null,condition:null,battery_health:null,completeness:null,minus:null,source_type:source,hunter_user_id:hunter,partner_name:source==='MAJESTY_CELL'?partnerName:null,cost:Number(cost),asking_price:Number(price),supplier:$('stsupplier').value.trim()||null,notes:$('stnotesnew').value.trim()||null,receipt_ref:null,received_source_note:source==='MAJESTY_CELL'?'Majesty Cell':'Management',outlet:inventoryReceiveOutlet()};
 }else if(isIphoneSecond){
  const imei1=$('stimei1second').value.trim(),grade=$('stgradesecond').value,bh=$('stbhsecond').value,condition=$('stconditionsecond').value.trim(),complete=$('stcompletesecond').value.trim(),cost=$('stcostsecond').value,price=$('stpricesec').value;
  if(!imei1||!grade||bh===''||!condition||!complete||cost===''||price==='')return alert('Untuk iPhone Second, IMEI 1, Grade, Battery Health, Kondisi, Kelengkapan, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,imei_1:imei1,imei_2:$('stimei2second').value.trim()||null,grade,condition,battery_health:Number(bh),completeness:complete,minus:$('stminusseconde').value.trim()||null,source_type:source,hunter_user_id:hunter,partner_name:source==='MAJESTY_CELL'?partnerName:null,cost:Number(cost),asking_price:Number(price),supplier:$('stsuppliersecond').value.trim()||null,notes:$('stnotessecond').value.trim()||null,receipt_ref:null,received_source_note:source==='MAJESTY_CELL'?'Majesty Cell':'Management',outlet:inventoryReceiveOutlet()};
 }else if(isAndroidSecond){
  const color=$('standroidsecondcolor').value.trim(),imei1=$('standroidsecondimei1').value.trim(),condition=$('standroidsecondcondition').value.trim(),complete=$('standroidsecondcomplete').value.trim(),cost=$('standroidsecondcost').value,price=$('standroidsecondprice').value;
  if(!color||!imei1||!condition||!complete||cost===''||price==='')return alert('Untuk Android Second, Warna, IMEI 1, Kondisi, Kelengkapan, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,color,imei_1:imei1,imei_2:$('standroidsecondimei2').value.trim()||null,grade:null,condition,battery_health:null,completeness:complete,minus:$('standroidsecondminus').value.trim()||null,source_type:source,hunter_user_id:hunter,partner_name:source==='MAJESTY_CELL'?partnerName:null,cost:Number(cost),asking_price:Number(price),supplier:$('standroidsecondsupplier').value.trim()||null,notes:$('standroidsecondnotes').value.trim()||null,receipt_ref:null,received_source_note:source==='MAJESTY_CELL'?'Majesty Cell':'Management',outlet:inventoryReceiveOutlet()};
 }else if(isAndroidNew){
  const color=$('standroidcolor').value.trim(),imei1=$('standroidimei1').value.trim(),cost=$('standroidcost').value,price=$('standroidprice').value;
  if(!color||!imei1||cost===''||price==='')return alert('Untuk Android New, Warna, IMEI 1, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,color,imei_1:imei1,imei_2:$('standroidimei2').value.trim()||null,grade:null,condition:null,battery_health:null,completeness:null,minus:null,source_type:source,hunter_user_id:hunter,partner_name:source==='MAJESTY_CELL'?partnerName:null,cost:Number(cost),asking_price:Number(price),supplier:$('standroidsupplier').value.trim()||null,notes:$('standroidnotes').value.trim()||null,receipt_ref:null,received_source_note:source==='MAJESTY_CELL'?'Majesty Cell':'Management',outlet:inventoryReceiveOutlet()};
 }else{
  data={product_id:$('stprod').value,imei_1:$('stimei1').value.trim()||null,imei_2:$('stimei2').value.trim()||null,grade:selectedProduct?.grade||null,condition:$('stcondition').value.trim()||null,battery_health:$('stbh').value?Number($('stbh').value):null,completeness:$('stcomplete').value.trim()||null,minus:$('stminus').value.trim()||null,source_type:source,hunter_user_id:hunter,partner_name:source==='MAJESTY_CELL'?partnerName:null,cost:Number($('stcost').value||0),asking_price:Number($('stprice').value||0),notes:$('stnotes').value.trim()||null,receipt_ref:$('stref')?.value.trim()||null,received_source_note:source==='HUNTER'?'Hunter':'Management',outlet:inventoryReceiveOutlet()};
 }
 const x=await sb.from('stock_units').insert(data);
 if(x.error)return alert(x.error.message);
 const stockId=x.data?.[0]?.id;
 if(!stockId)return alert('Barang masuk tersimpan tetapi ID stock tidak ditemukan.');
 const ap=await sb.rpc('submit_inventory_receive_approval',{p_stock_unit_id:stockId});
 if(ap.error){
   await sb.from('stock_units').delete().eq('id',stockId);
   return alert('Barang masuk gagal dikirim untuk verifikasi: '+ap.error.message);
 }
 closeModal();
 alert('Barang Masuk tersimpan sebagai MENUNGGU VERIFIKASI. Hanya Fasilitator atau Admin Finance Majesty Cell yang dapat menyetujui.');
 await renderInventory();

}
async function openEditStockPhotos(id){if(!hasContentCreatorAccess())return alert('Akses Management atau Content Creator diperlukan.');const s=inventoryStock.find(x=>x.id===id);if(!s)return;$('mt').textContent='📷 Edit Foto Unit';$('mb').innerHTML=stockPhotoGallery(s,true)+'<div class="small" style="margin-top:8px">Maksimal 5 foto • otomatis dikompres maksimal ±700 KB/foto • resolusi hingga 1600 px.</div>';$('modal').classList.remove('hidden')}
function openEditStock(id){
 if(!(profile?.is_management||inventoryCanFacilitator))return alert('Akses Management atau Facilitator diperlukan.');
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 const c=s.category;
 let f='<div class="small">'+esc(s.product)+' • '+esc(s.variant||'')+' • IMEI 1: '+esc(s.imei_1||'-')+'</div>';
 const input=(label,id,value,type='text',extra='')=>'<label>'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value??'')+'" '+extra+'>';
 const area=(label,id,value)=>'<label>'+label+'</label><textarea id="'+id+'">'+esc(value||'')+'</textarea>';
 f+=input('IMEI 1','esimei1',s.imei_1||'','text','inputmode="numeric"');
 f+=input('IMEI 2','esimei2',s.imei_2||'','text','inputmode="numeric"');
 if(c==='IPHONE_SECOND'){
  f+='<label>Grade</label><select id="esgrade"><option value="">-</option><option '+(s.grade==='A'?'selected':'')+'>A</option><option '+(s.grade==='B'?'selected':'')+'>B</option><option '+(s.grade==='C'?'selected':'')+'>C</option></select>';
  f+=input('Kondisi','escondition',s.condition||'');
  f+=input('Battery Health','esbh',s.battery_health??'','number','min="0" max="100"');
  f+=input('Kelengkapan','escomplete',s.completeness||'');
  f+=area('Minus','esminus',s.minus||'');
 }else if(c==='ANDROID_SECOND'){
  f+=input('Warna','escolor',s.color||'');
  f+=input('Kondisi','escondition',s.condition||'');
  f+=input('Kelengkapan','escomplete',s.completeness||'');
  f+=area('Minus','esminus',s.minus||'');
 }else if(c==='ANDROID_NEW'){
  f+=input('Warna','escolor',s.color||'');
 }else if(c==='STOCK_SECOND_PUSAT'){
  f+='<label>Grade</label><select id="esgrade"><option value="">-</option><option '+(s.grade==='A'?'selected':'')+'>A</option><option '+(s.grade==='B'?'selected':'')+'>B</option><option '+(s.grade==='C'?'selected':'')+'>C</option></select>';
  f+=input('Kondisi','escondition',s.condition||'');
  f+=input('Battery Health','esbh',s.battery_health??'','number','min="0" max="100"');
  f+=input('Kelengkapan','escomplete',s.completeness||'');
  f+=area('Minus','esminus',s.minus||'');
 }
 f+=input('Harga Beli','escost',s.cost??0,'number','min="0"');
 f+=input('Harga Jual','esprice',s.asking_price??0,'number','min="0"');
 f+=input('Supplier','essupplier',s.supplier||'');
 f+=area('Catatan','esnotes',s.notes||'');
 f+=stockPhotoGallery(s,true)+'<div class="small" style="margin-top:8px">Maksimal 5 foto • otomatis dikompres maksimal ±700 KB/foto • resolusi hingga 1600 px.</div><button class="success" onclick="saveEditStock(\''+id+'\')">Simpan</button>';
 $('mt').textContent='Edit Stock';$('mb').innerHTML=f;$('modal').classList.remove('hidden');
}
async function saveEditStock(id){
 if(!(profile?.is_management||inventoryCanFacilitator))return alert('Akses Management atau Facilitator diperlukan.');
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 const c=s.category;
 const imei1=$('esimei1').value.trim(),imei2=$('esimei2').value.trim()||null;
 if(imei1&&!/^\d{15}$/.test(imei1))return alert('IMEI 1 harus berupa 15 digit angka.');
 if(imei2&&!/^\d{15}$/.test(imei2))return alert('IMEI 2 harus berupa 15 digit angka.');
 const data={imei_1:imei1||null,imei_2:imei2,asking_price:Number($('esprice').value||0),cost:Number($('escost').value||0),supplier:$('essupplier').value.trim()||null,notes:$('esnotes').value.trim()||null,updated_at:new Date().toISOString()};
 if(c==='IPHONE_SECOND'){
  data.grade=$('esgrade').value||null;
  data.condition=$('escondition').value.trim()||null;
  data.battery_health=$('esbh').value!==''?Number($('esbh').value):null;
  data.completeness=$('escomplete').value.trim()||null;
  data.minus=$('esminus').value.trim()||null;
 }else if(c==='ANDROID_SECOND'){
  data.color=$('escolor').value.trim()||null;
  data.condition=$('escondition').value.trim()||null;
  data.completeness=$('escomplete').value.trim()||null;
  data.minus=$('esminus').value.trim()||null;
 }else if(c==='ANDROID_NEW'){
  data.color=$('escolor').value.trim()||null;
 }else if(c==='STOCK_SECOND_PUSAT'){
  data.grade=$('esgrade').value||null;
  data.condition=$('escondition').value.trim()||null;
  data.battery_health=$('esbh').value!==''?Number($('esbh').value):null;
  data.completeness=$('escomplete').value.trim()||null;
  data.minus=$('esminus').value.trim()||null;
 }
 const x=await sb.from('stock_units').update(data).eq('id',id);
 if(x.error)return alert(x.error.message);
 closeModal();await renderInventory();
}async function openStockHistory(id){const x=await sb.from('stock_movements').select('*').eq('stock_unit_id',id).order('created_at',{ascending:false});if(x.error)return alert(x.error.message);$('mt').textContent='🧾 Histori Stock';$('mb').innerHTML=(x.data||[]).map(m=>'<div class="lead"><b>'+esc(m.movement_type)+'</b><div class="small">'+new Date(m.created_at).toLocaleString('id-ID')+' • '+esc(m.from_status||'-')+' → '+esc(m.to_status||'-')+'</div><div>'+esc(m.note||'')+'</div></div>').join('')||'<p class="small">Belum ada histori.</p>';$('modal').classList.remove('hidden')}
function hmNormalizePhone(v){return String(v||'').replace(/[^0-9]/g,'').replace(/^0+/,'');}
async function openSalesReport(){
 const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
 const isAdminFinance=role==='ADMIN FINANCE'||role==='ADMIN FINANCE MAJESTY CELL';
 const q=sb.from('sales_transactions').select('*').order('sold_at',{ascending:false});
 if(isAdminFinance&&profile?.outlet)q.eq('outlet',profile.outlet);
 const x=await q;
 if(x.error)return alert(x.error.message);
 const rows=x.data||[];
 const stockIds=[...new Set(rows.map(r=>r.stock_unit_id).filter(Boolean))];
 const salesIds=[...new Set(rows.map(r=>r.sales_user_id).filter(Boolean))];
 const phones=[...new Set(rows.map(r=>hmNormalizePhone(r.customer_phone)).filter(Boolean))];
 const [stockRes,peopleRes]=await Promise.all([
   stockIds.length?sb.from('stock_units').select('id,product_id,color,grade,battery_health').in('id',stockIds):Promise.resolve({data:[]}),
   rows.length?sb.rpc('get_sales_report_people',{p_transaction_ids:rows.map(r=>r.id).filter(Boolean)}):Promise.resolve({data:[]})
 ]);
 if(stockRes.error)return alert('Data produk penjualan gagal dimuat: '+stockRes.error.message);
 if(peopleRes.error)return alert('Data Sales gagal dimuat: '+peopleRes.error.message);
 const stocks=stockRes.data||[],peopleMap=Object.fromEntries((peopleRes.data||[]).map(p=>[p.transaction_id,p])),productIds=[...new Set(stocks.map(s=>s.product_id).filter(Boolean))];
 const productRes=productIds.length?await sb.from('product_master').select('id,product,variant').in('id',productIds):{data:[]};
 if(productRes.error)return alert('Master produk gagal dimuat: '+productRes.error.message);
 const leadRes=phones.length?await sb.from('leads').select('whatsapp,cs,cs_claimed_by,customer,updated_at').in('whatsapp',rows.map(r=>r.customer_phone).filter(Boolean)).order('updated_at',{ascending:false}):{data:[]};
 const stockMap=Object.fromEntries(stocks.map(s=>[s.id,s])),productMap=Object.fromEntries((productRes.data||[]).map(p=>[p.id,p]));
 const leadMap={};
 (leadRes.data||[]).forEach(l=>{const p=hmNormalizePhone(l.whatsapp);if(p&&!leadMap[p])leadMap[p]=l;});
 window.hmSalesReportRows=rows.map(r=>{
   const st=stockMap[r.stock_unit_id]||{},pm=productMap[st.product_id]||{},lead=leadMap[hmNormalizePhone(r.customer_phone)]||null;
   return {...r,display_product:[pm.product||'Produk tidak ditemukan',pm.variant].filter(Boolean).join(' — '),display_cs:r.customer_source==='WALK-IN'?'Walk-In':(peopleMap[r.id]?.cs_name||lead?.cs||lead?.cs_claimed_by||'-'),display_sales:peopleMap[r.id]?.sales_name||'-'};
 });
 window.hmSalesReportOutlets=[...new Set(rows.map(r=>String(r.outlet||'').trim()).filter(Boolean))].sort();
 window.hmSalesReportOutlet=isAdminFinance&&profile?.outlet?profile.outlet:(window.hmSalesReportOutlet||'ALL');
 if(window.hmSalesReportOutlet!=='ALL'&&!window.hmSalesReportOutlets.includes(window.hmSalesReportOutlet))window.hmSalesReportOutlet='ALL';
 window.hmSalesReportPeriod=window.hmSalesReportPeriod||'MONTH';
 inventoryView='sales';
 const panel=$('inventoryPanel');if(panel)panel.classList.remove('hidden');
 const btn=$('inventoryDashboardBtn');if(btn)btn.textContent='✖ Tutup Product & Stock';
 renderInventorySalesReport();
}
function buildSalesReportData(){
 const rows=window.hmSalesReportRows||[],outlet=window.hmSalesReportOutlet||'ALL';
 const filtered=outlet==='ALL'?rows:rows.filter(r=>String(r.outlet||'').trim()===outlet);
 const now=new Date(),y=now.getFullYear(),m=now.getMonth();
 const isToday=r=>{const z=new Date(r.sold_at);return z.getFullYear()===y&&z.getMonth()===m&&z.getDate()===now.getDate()};
 const isMonth=r=>{const z=new Date(r.sold_at);return z.getFullYear()===y&&z.getMonth()===m};
 const calc=list=>({rows:list,total:list.reduce((a,r)=>a+Number(r.sale_price||0)-Number(r.discount||0),0),profit:list.reduce((a,r)=>a+Number(r.gross_profit||0),0)});
 return {today:calc(filtered.filter(isToday)),month:calc(filtered.filter(isMonth))};
}
function renderInventorySalesReport(){
 let body=$('inventoryBody');
 if(!body){const panel=$('inventoryPanel');if(!panel)return;panel.innerHTML='<div id="inventoryBody"></div>';body=$('inventoryBody');}
 const d=buildSalesReportData();
 const period=window.hmSalesReportPeriod||'TODAY',x=d[period==='MONTH'?'month':'today'];
 const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
 const lockedOutlet=(role==='ADMIN FINANCE'||role==='ADMIN FINANCE MAJESTY CELL')&&profile?.outlet?String(profile.outlet):null;
 const outlets=window.hmSalesReportOutlets||[],available=lockedOutlet?[lockedOutlet]:['ALL',...outlets];
 const options=available.map(o=>'<option value="'+esc(o)+'" '+(o===(window.hmSalesReportOutlet||'ALL')?'selected':'')+'>'+esc(o==='ALL'?'Semua Outlet':o)+'</option>').join('');
 body.innerHTML='<div class="box"><h3 style="margin-top:0">📊 LAPORAN PENJUALAN</h3>'+
 '<label>Outlet</label><select id="hmSalesReportOutlet" '+(lockedOutlet?'disabled':'')+' onchange="changeSalesReportOutlet(this.value)">'+options+'</select>'+
 '<div class="row" style="margin:12px 0"><button class="'+(period==='TODAY'?'':'secondary')+'" onclick="showSalesReportPeriod(\'TODAY\')">📅 Hari Ini</button><button class="'+(period==='MONTH'?'':'secondary')+'" onclick="showSalesReportPeriod(\'MONTH\')">📆 Bulan Ini</button></div>'+
 '<div class="small">Outlet aktif: <b>'+esc(window.hmSalesReportOutlet==='ALL'?'Semua Outlet':window.hmSalesReportOutlet)+'</b></div>'+
 '<div class="stats" style="margin-top:8px">'+invStat('Omzet',x.total)+invStat('Laba',x.profit)+'</div>'+
 (x.rows.length?x.rows.map(r=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc(r.display_product||'-')+'</b><span>'+new Date(r.sold_at).toLocaleDateString('id-ID')+'</span></div><div class="small">CS: <b>'+esc(r.display_cs||'-')+'</b> • Sales: <b>'+esc(r.display_sales||'-')+'</b></div><div class="small">Sumber: '+(r.customer_source==='WALK-IN'?'🚶 WALK-IN':'📱 DIGITAL')+'</div><div>Jual Rp'+(Number(r.sale_price||0)-Number(r.discount||0)).toLocaleString('id-ID')+' • Laba Rp'+Number(r.gross_profit||0).toLocaleString('id-ID')+'</div></div>').join(''):'<p class="small">Belum ada penjualan pada periode ini.</p>')+'</div>';
}
function changeSalesReportOutlet(outlet){
 const role=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
 if((role==='ADMIN FINANCE'||role==='ADMIN FINANCE MAJESTY CELL')&&profile?.outlet)return;
 window.hmSalesReportOutlet=outlet||'ALL';renderInventorySalesReport();
}
function showSalesReportPeriod(period){
 window.hmSalesReportPeriod=period==='MONTH'?'MONTH':'TODAY';
 if(window.hmSalesReportRows)renderInventorySalesReport();
}
window.renderInventory=renderInventory;
window.refreshInventory=refreshInventory;


/* HM STOCK AI — contextual Tanya AI */
(function(){
  const _hmOriginalOpenProductDetail = window.openProductDetail;
  function stockAIContext(s){
    const canInternal = !!profile?.is_management || !!inventoryCanFacilitator || String(profile?.role||'').toUpperCase()==='FASILITATOR';
    return {
      stock_id:s?.id||'',
      product:s?.product||'',
      variant:s?.variant||'',
      color:s?.color||'',
      category:s?.category||'',
      status:s?.status||'',
      outlet:s?.outlet||'',
      grade:s?.grade||null,
      battery_health:s?.battery_health??null,
      condition:s?.condition||null,
      completeness:s?.completeness||null,
      minus:s?.minus||null,
      asking_price:s?.asking_price??null,
      cost:canInternal?(s?.cost??null):null,
      imei_1:canInternal?(s?.imei_1||null):null,
      imei_2:canInternal?(s?.imei_2||null):null
    };
  }
  window.openStockAI=function(stockId){
    const s=inventoryStock.find(x=>x.id===stockId);
    if(!s)return alert('Data stock tidak ditemukan.');
    const ctx=stockAIContext(s);
    $('mt').textContent='🤖 Tanya AI — '+[s.product,s.variant,s.color].filter(Boolean).join(' — ');
    $('mb').innerHTML=
      '<div class="notice"><b>Konteks Stock:</b> '+esc(s.product||'-')+' • '+esc(s.variant||'-')+' • '+esc(s.color||'-')+'<br><span class="small">'+esc(invCategory(s.category)||s.category||'-')+' • Status: '+esc(s.status||'-')+'</span></div>'+
      '<label>Pertanyaan</label>'+
      '<textarea id="stockAIQuestion" rows="4" placeholder="Contoh: Bagaimana cara menawarkan produk ini ke customer?"></textarea>'+
      '<div class="small" style="margin-top:6px">AI menggunakan konteks stock yang sedang dibuka dan mengikuti kewenangan role Anda.</div>'+
      '<button id="stockAIAskBtn" class="success" style="margin-top:10px" onclick="askStockAI(\''+String(stockId).replace(/'/g,"\\'")+'\')">🤖 Tanya AI</button>'+
      '<div id="stockAIAnswer" class="box hidden" style="white-space:pre-wrap;margin-top:12px"></div>';
    $('modal').classList.remove('hidden');
    setTimeout(()=>$('stockAIQuestion')?.focus(),50);
  };
  window.askStockAI=async function(stockId){
    const q=String($('stockAIQuestion')?.value||'').trim();
    if(!q)return alert('Pertanyaan wajib diisi.');
    const btn=$('stockAIAskBtn'),out=$('stockAIAnswer');
    if(btn)btn.disabled=true;
    if(out){out.classList.remove('hidden');out.textContent='AI sedang menganalisis...';}
    const s=inventoryStock.find(x=>x.id===stockId);
    if(!s){if(out)out.textContent='Stock tidak ditemukan.';if(btn)btn.disabled=false;return;}
    const ctx=stockAIContext(s);
    const contextText='KONTEKS STOCK HELLO MAJESTY (gunakan hanya untuk menjawab pertanyaan user): '+JSON.stringify(ctx)+'\n\nPERTANYAAN USER: '+q;
    const payload={
      question:contextText,
      profile:{name:profile?.name||'',role:profile?.role||'',outlet:profile?.outlet||'',is_management:!!profile?.is_management},
      lead:null
    };
    try{
      const x=await sb.functions.invoke('hello-majesty-ai-gemini',{body:payload});
      if(x.error){
        let detail=x.error?.message||String(x.error);
        try{if(x.error?.context){const t=await x.error.context.text();detail=t||detail;}}catch(_e){}
        throw new Error(detail);
      }
      const answer=x.data?.answer||'AI tidak memberikan jawaban.';
      if(out)out.textContent=answer;
      const input=$('stockAIQuestion');if(input)input.value='';
    }catch(e){
      if(out)out.textContent='AI belum dapat digunakan.\n\n'+(e?.message||e);
    }finally{if(btn)btn.disabled=false;}
  };
  window.openProductDetail=function(id){
    if(typeof _hmOriginalOpenProductDetail==='function')_hmOriginalOpenProductDetail(id);
    const s=inventoryStock.find(x=>x.id===id);
    const body=$('mb');
    if(!s||!body)return;
    const exists=body.querySelector('[data-hm-stock-ai]');
    if(exists)return;
    const box=document.createElement('div');
    box.setAttribute('data-hm-stock-ai','1');
    box.style.marginTop='12px';
    box.innerHTML='<button class="success" style="width:100%" type="button" onclick="openStockAI(\''+String(id).replace(/'/g,"\\'")+'\')">🤖 Tanya AI tentang Produk Ini</button>';
    body.appendChild(box);
  };
})();
/* HM GLOBAL INVENTORY API */
window.openInventoryDashboard=openInventoryDashboard;
window.openInventorySection=openInventorySection;
window.renderInventory=renderInventory;
window.openSalesReport=openSalesReport;

setInterval(hmRestoreStockCardActions,1500);