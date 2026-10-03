function hasContentCreatorAccess(){const r=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');return !!profile?.is_management||r==='CONTENT CREATOR'||!!inventoryCanContentCreator;}
/* HM_INVENTORY_STABLE_20260930_ANDROID_SECOND_3 */
/* Hello Majesty Inventory & Hunter */
let inventoryProducts=[], inventoryStock=[], inventoryView='stock';
let hunterDashboard=[]; let inventoryCanFacilitator=false; let inventoryCanContentCreator=false;
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
  inventoryCanContentCreator=!!profile?.is_management || String(profile?.role||'').toUpperCase()==='CONTENT CREATOR' || String(profile?.role||'').toUpperCase()==='CONTENT_CREATOR';
  if(!profile?.is_management){
    const perm=await sb.rpc('has_facilitator_inventory_access');
    if(!perm.error) inventoryCanFacilitator=!!perm.data;
  }
  if(!profile?.is_management && !inventoryCanContentCreator){const cc=await sb.from('team_permissions').select('can_content_creator').eq('name',profile?.name).eq('outlet',profile?.outlet).eq('active',true).maybeSingle();if(!cc.error)inventoryCanContentCreator=!!cc.data?.can_content_creator;}
  window.hmCanFacilitator=inventoryCanFacilitator; window.hmCanContentCreator=inventoryCanContentCreator;
  const stockView=profile?.is_management?'stock_management':(inventoryCanFacilitator?'stock_facilitator':'stock_catalog');
  let stockQuery=sb.from(stockView).select('*').order('status').order('received_at',{ascending:false});
  if(!profile?.is_management && profile?.outlet) stockQuery=stockQuery.eq('outlet',profile.outlet);
  const [p,s]=await Promise.all([
    sb.from('product_master').select('*').eq('active',true).order('category').order('product'),
    stockQuery
  ]);
  if(p.error) throw p.error; if(s.error) throw s.error;
  inventoryProducts=p.data||[]; inventoryStock=s.data||[];
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

function canViewInventoryDashboard(){return !!profile?.is_management;}
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
  const sold=inventoryStock.filter(x=>x.status==='SOLD').length;
  const reserved=inventoryStock.filter(x=>x.status==='RESERVED').length;
  const service=inventoryStock.filter(x=>x.status==='SERVICE').length;
  const canManage=!!profile?.is_management || inventoryCanFacilitator || String(profile?.role||'').toUpperCase()==='FASILITATOR' || (Array.isArray(window.hmRoles) && window.hmRoles.some(r=>String(r).toUpperCase()==='FASILITATOR'));
  host.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">📦 PRODUCT & STOCK</h2><div class="small">Database produk untuk CS/Sales + kontrol inventory Management</div></div><div class="row"><button class="secondary" onclick="refreshInventory(this)">↻ Refresh</button>'+(canManage?'<button class="secondary" onclick="openProductMaster()">⚙️ Master Produk</button>':'')+'<button class="success" onclick="openReceiveStock()">＋ BARANG MASUK</button></div></div>'+
  '<div class="stats" style="margin-top:10px">'+
  invStat('🟢 Ready',ready)+invStat('🔴 Terjual',sold)+invStat('🟡 Reserved',reserved)+invStat('🔧 Service',service)+invStat('📦 Total',inventoryStock.length)+'</div>'+
  '<div class="row" style="margin-top:12px">'+(canViewInventoryDashboard()?'<button class="'+(inventoryView==='dashboard'?'':'secondary')+'" id="invDashboardTab" type="button" data-inventory-view="dashboard">📊 Dashboard</button>':'')+'<button class="'+(inventoryView==='stock'?'':'secondary')+'" id="invStockTab" type="button" data-inventory-view="stock">Stock</button><button class="'+(inventoryView==='products'?'':'secondary')+'" id="invProductsTab" type="button" data-inventory-view="products">Produk</button><button class="secondary" onclick="openSalesReport()">Laporan Penjualan</button>'+'</div>'+
  '<div id="inventoryViewDebug" class="small" style="margin-top:8px;font-weight:700"></div><div id="inventoryBody" style="margin-top:10px"></div>';
  host.onclick=(e)=>{const tab=e.target.closest('[data-inventory-view]');if(tab){e.preventDefault();setInventoryView(tab.dataset.inventoryView)}};
  renderInventoryBody();
}
function openInventoryDashboard(){if(!canViewInventoryDashboard()){alert('Dashboard Inventory hanya dapat diakses Management.');return;}const panel=$('inventoryPanel'),btn=$('stockToggleBtn');if(!panel)return;panel.classList.remove('hidden');if(btn)btn.textContent='✖ Tutup Stock';inventoryView='dashboard';renderInventory().catch(e=>console.error('[HM] Inventory dashboard error',e));}
async function refreshInventory(btn){if(btn?.disabled)return;try{if(btn){btn.disabled=true;btn.textContent='⏳ Loading...'}await renderInventory()}catch(e){console.error(e);alert('Refresh Product & Stock error: '+(e?.message||e))}finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh'}}}
async function loadHunterDashboard(){const r=await sb.from('hunter_dashboard').select('*').order('total_commission',{ascending:false});if(r.error)throw r.error;hunterDashboard=r.data||[]}
function fmtRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID')}
async function markHunterCommissionPaid(id){if(!hasContentCreatorAccess())return alert('Akses Management atau Content Creator diperlukan.');const note=prompt('Catatan pembayaran (opsional):')||null;const r=await sb.from('sales_transactions').update({hunter_commission_paid_at:new Date().toISOString(),hunter_commission_paid_by:profile.user_id,hunter_commission_payment_note:note}).eq('id',id).is('hunter_commission_paid_at',null);if(r.error)return alert(r.error.message);openHunterCommission()}
async function openHunterCommission(){const r=await sb.from('sales_transactions').select('id,sold_at,hunter_user_id,hunter_commission,hunter_commission_paid_at,hunter_commission_payment_note,customer_name').not('hunter_user_id','is',null).order('sold_at',{ascending:false});if(r.error)return alert(r.error.message);const teams=await sb.from('team_directory').select('user_id,name');const names=Object.fromEntries((teams.data||[]).map(x=>[x.user_id,x.name]));const rows=r.data||[];$('mt').textContent='💸 Komisi Hunter';$('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi 10% dari profit unit Hunter yang SOLD. Pembayaran hanya dapat diubah oleh Management.</div>'+rows.map(x=>'<div class="lead"><b>🏹 '+esc(names[x.hunter_user_id]||'Unknown')+'</b><div>'+new Date(x.sold_at).toLocaleDateString('id-ID')+' • Komisi <b>'+fmtRp(x.hunter_commission)+'</b></div><div class="small">'+(x.hunter_commission_paid_at?'🟢 Dibayar '+new Date(x.hunter_commission_paid_at).toLocaleDateString('id-ID'):'🟡 Belum dibayar')+'</div>'+((profile?.is_management&&!x.hunter_commission_paid_at)?'<button class="success" style="margin-top:6px" onclick="markHunterCommissionPaid(\''+x.id+'\')">✓ Tandai Sudah Dibayar</button>':'')+'</div>').join('')||'<p class="small">Belum ada transaksi komisi Hunter.</p>';$('modal').classList.remove('hidden')}
async function openHunterDashboard(){try{await loadHunterDashboard()}catch(e){alert(e.message||e);return}$('mt').textContent='🏹 Dashboard Hunter';$('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi = 10% dari profit unit Hunter yang sudah SOLD.</div>'+hunterDashboard.map(h=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>🏹 '+esc(h.hunter_name)+'</b><span class="badge">'+h.sold_units+' SOLD</span></div><div style="margin-top:8px">📦 Total unit: <b>'+h.total_units+'</b> • 🟢 Ready: <b>'+h.ready_units+'</b> • 🔴 Sold: <b>'+h.sold_units+'</b></div><div style="margin-top:5px">💰 Profit: <b>'+fmtRp(h.total_profit)+'</b> • 🎯 Komisi: <b>'+fmtRp(h.total_commission)+'</b></div></div>').join('')||'<p class="small">Belum ada stock Hunter.</p>';$('modal').classList.remove('hidden')}
function invStat(label,val){return '<div class="stat"><div class="small">'+label+'</div><div class="num">'+Number(val||0).toLocaleString('id-ID')+'</div></div>'}
function filterHunterOptions(){ const sel=$('sthunter'),outlet=String($('stoutlet')?.value||profile?.outlet||'').trim().toLowerCase(); if(!sel)return; [...sel.options].forEach(o=>{const ho=String(o.getAttribute('data-hunter-outlet')||'').trim().toLowerCase(); o.hidden=ho!==outlet;}); if(sel.selectedOptions[0]?.hidden)sel.value=''; }
function toggleHunterField(){const box=$('hunterBox'),source=$('stsource')?.value||'MANAGEMENT';if(box)box.classList.toggle('hidden',source!=='HUNTER');}
function inventoryReceiveOutlet(){
 const sel=$('stoutlet');
 return profile?.is_management ? (sel?.value||'') : (profile?.outlet||'');
}
function setInventoryView(view){if(view==='dashboard'&&!canViewInventoryDashboard()){inventoryView='stock';return;}inventoryView=view;renderInventoryBody();const dbg=document.getElementById('inventoryViewDebug');if(dbg)dbg.textContent='Mode: '+(view==='products'?'PRODUK':'STOCK');const panel=document.getElementById('inventoryPanel');if(panel){const buttons=panel.querySelectorAll('.row button');buttons.forEach(b=>{if(b.textContent.trim()==='Stock'||b.textContent.trim()==='Produk')b.classList.toggle('secondary',b.textContent.trim().toLowerCase()!==view)})}}
async function renderInventoryDashboardBody(){
 const body=document.getElementById('inventoryBody');if(!body)return;
 if(!canViewInventoryDashboard()){inventoryView='stock';renderInventoryBody();return;}
 const isManagement=!!profile?.is_management,canViewCost=isManagement;
 const outletSel=$('invDashOutlet')?.value||'',catSel=$('invDashCat')?.value||'';
 const rows=inventoryStock.filter(s=>(!outletSel||s.outlet===outletSel)&&(!catSel||s.category===catSel));
 const ready=rows.filter(s=>s.status==='READY'),reserved=rows.filter(s=>s.status==='RESERVED'),service=rows.filter(s=>s.status==='SERVICE'),returned=rows.filter(s=>s.status==='RETURN'),missing=rows.filter(s=>s.status==='MISSING');
 const modal=ready.reduce((a,s)=>a+Number(s.cost||0),0),jual=ready.reduce((a,s)=>a+Number(s.asking_price||0),0),profit=jual-modal;
 const now=new Date(),sameDay=d=>{const x=new Date(d||0);return x.getFullYear()===now.getFullYear()&&x.getMonth()===now.getMonth()&&x.getDate()===now.getDate()};
 const age=s=>Math.max(0,Math.floor((Date.now()-new Date(s.received_at||s.created_at).getTime())/86400000));
 const receivedToday=ready.filter(s=>sameDay(s.received_at||s.created_at)).length,old30=ready.filter(s=>age(s)>30).length,old60=ready.filter(s=>age(s)>60).length;
 const outlets=[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean))].sort();
 const cats=['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND','STOCK_NEW_PUSAT','STOCK_SECOND_PUSAT'];
 const byCategory=cats.map(cat=>{const a=ready.filter(s=>s.category===cat);return {cat,units:a.length,cost:a.reduce((x,s)=>x+Number(s.cost||0),0),jual:a.reduce((x,s)=>x+Number(s.asking_price||0),0)}}).filter(x=>x.units);
 const byOutlet=outlets.map(o=>{const a=ready.filter(s=>s.outlet===o);return {o,units:a.length,cost:a.reduce((x,s)=>x+Number(s.cost||0),0),jual:a.reduce((x,s)=>x+Number(s.asking_price||0),0)}}).filter(x=>!outletSel||x.o===outletSel);
 const oldest=[...ready].sort((a,b)=>new Date(a.received_at||a.created_at)-new Date(b.received_at||b.created_at)).slice(0,8);
 const rp=n=>'Rp'+Number(n||0).toLocaleString('id-ID'),pct=(a,b)=>b?Math.round(a/b*100)+'%':'0%';
 body.innerHTML=
  '<div class="box"><h3 style="margin:0">📊 DASHBOARD INVENTORY</h3><div class="small" style="margin-top:5px">Kontrol stock untuk keputusan pembelian, penjualan, dan pergerakan barang.</div>'+
  '<div class="row" style="margin-top:10px"><select id="invDashOutlet">'+(isManagement?'<option value="">📍 Semua Outlet</option>':'')+outlets.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select><select id="invDashCat"><option value="">Semua Kategori</option>'+cats.map(x=>'<option value="'+x+'">'+invCategory(x)+'</option>').join('')+'</select></div></div>'+
  '<div class="stats">'+invStat('🟢 READY',ready.length)+invStat('💰 Modal READY',canViewCost?rp(modal):'—')+invStat('🏷️ Nilai Jual',canViewCost?rp(jual):'—')+invStat('📈 Potensi Laba',canViewCost?rp(profit):'—')+invStat('🟡 Reserved',reserved.length)+invStat('🔧 Service',service.length)+invStat('↩️ Return',returned.length)+invStat('⚠️ Missing',missing.length)+'</div>'+
  '<div class="row" style="margin-top:10px"><button class="secondary" onclick="inventoryView=\'stock\';renderInventoryBody()">📦 Lihat Stock</button><button class="success" onclick="openReceiveStock()">＋ Barang Masuk</button></div>'+
  '<div class="box"><h3 style="margin:0 0 8px">⚡ Perhatian</h3><div class="stats"><div class="stat"><div class="small">Barang masuk hari ini</div><div class="num">'+receivedToday+'</div></div><div class="stat"><div class="small">Stock >30 hari</div><div class="num">'+old30+'</div></div><div class="stat"><div class="small">Stock >60 hari</div><div class="num">'+old60+'</div></div></div></div>'+
  '<div class="box"><h3 style="margin:0 0 8px">🏪 Stock per Outlet</h3>'+(byOutlet.length?byOutlet.map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc(x.o)+'</b><b>'+x.units+' unit</b></div><div class="small">'+(canViewCost?'Modal '+rp(x.cost)+' • Jual '+rp(x.jual)+' • Potensi '+rp(x.jual-x.cost):'Nilai modal/jual khusus Management/Facilitator')+'</div></div>').join(''):'<div class="small">Tidak ada READY.</div>')+'</div>'+
  '<div class="box"><h3 style="margin:0 0 8px">📱 Stock per Kategori</h3>'+(byCategory.length?byCategory.map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+invCategory(x.cat)+'</b><b>'+x.units+' unit</b></div><div class="small">'+(canViewCost?'Modal '+rp(x.cost)+' • Jual '+rp(x.jual)+' • Margin '+pct(x.jual-x.cost,x.jual):'Nilai modal/jual khusus Management/Facilitator')+'</div></div>').join(''):'<div class="small">Tidak ada READY.</div>')+'</div>'+
  '<div class="box"><h3 style="margin:0 0 8px">⏳ Stock Terlama — READY</h3>'+(oldest.length?oldest.map(s=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc([s.product,s.variant,s.color].filter(Boolean).join(' — '))+'</b><span class="badge">'+age(s)+' hari</span></div><div class="small">'+esc(s.outlet||'-')+' • '+(s.grade?'Grade '+esc(s.grade)+' • ':'')+(s.battery_health!=null?'BH '+s.battery_health+'% • ':'')+(canViewCost?rp(s.cost):'Harga beli tersembunyi')+'</div></div>').join(''):'<div class="small">Belum ada stock READY.</div>')+'</div>';
 $('invDashOutlet').value=outletSel;$('invDashCat').value=catSel;
 $('invDashOutlet').onchange=()=>renderInventoryBody();$('invDashCat').onchange=()=>renderInventoryBody();
}
function renderInventoryBody(){const body=document.getElementById('inventoryBody');if(!body)return;if(inventoryView==='dashboard'&&!canViewInventoryDashboard()){inventoryView='stock';}if(inventoryView==='dashboard'){renderInventoryDashboardBody();return}if(inventoryView==='products'){body.innerHTML='<div class="row"><select id="invCat" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><input id="invSearch" placeholder="Cari produk / kategori / varian / warna" oninput="renderInventoryBody()"></div><div style="margin-top:10px">'+inventoryProducts.filter(p=>(!$('invCat')?.value||p.category===$('invCat').value)&&(!$('invSearch')?.value||[p.product,p.variant,p.color,p.category,invCategory(p.category)].join(' ').toLowerCase().includes($('invSearch').value.toLowerCase()))).map(p=>'<div class="lead"><b>'+esc(masterProductLabel(p))+'</b><div class="small">'+invCategory(p.category)+'</div></div>').join('')+'</div>';return}const q=($('stockSearch')?.value||'').toLowerCase(),st=($('stockStatus')?.value||'READY'),cat=($('stockCategory')?.value||''),isManagement=!!profile?.is_management,outlet=($('stockOutlet')?.value||'');const rows=inventoryStock.filter(s=>(!outlet||s.outlet===outlet)&&(!st||s.status===st)&&(!cat||s.category===cat)&&(!q||searchHaystack([s.product,s.variant,s.color,s.imei_1,s.imei_2,s.grade,s.condition,s.hunter_name,s.outlet,s.category,invCategory(s.category)].join(' '),q)));const outlets=[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean).concat(['Majesty Plaza iPhone','Majesty Refill Phone']))].sort();const groupByCategory=!isManagement&&!cat;const categoryOrder=['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND','STOCK_NEW_PUSAT','STOCK_SECOND_PUSAT'];const grouped=categoryOrder.map(k=>({key:k,rows:rows.filter(s=>s.category===k)})).filter(g=>g.rows.length);const unknown=rows.filter(s=>!categoryOrder.includes(s.category));if(unknown.length)grouped.push({key:'OTHER',rows:unknown});const stockHtml=groupByCategory?grouped.map(g=>'<div style="margin:16px 0 8px;font-size:16px;font-weight:800;border-bottom:1px solid #e5e7eb;padding-bottom:6px">'+(g.key==='OTHER'?'Lainnya':invCategory(g.key))+' <span class="small">('+g.rows.length+' unit)</span></div>'+g.rows.map(stockCard).join('')).join(''):rows.map(stockCard).join('');body.innerHTML='<div class="row"><input id="stockSearch" placeholder="Cari produk, IMEI, grade, warna, hunter..." value="'+esc(q)+'" oninput="renderInventoryBody()"><select id="stockStatus" onchange="renderInventoryBody()"><option value="">Semua Status</option><option>READY</option><option>RESERVED</option><option>SOLD</option><option>SERVICE</option><option>RETURN</option></select><select id="stockCategory" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select>'+(isManagement?'<select id="stockOutlet" onchange="renderInventoryBody()"><option value="">📍 Semua Outlet</option>'+outlets.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>':'')+'</div><div class="small" style="margin-top:8px">📍 '+(isManagement?(outlet||'Semua Outlet'):esc(profile?.outlet||'-'))+' • '+rows.length+' unit</div><div style="margin-top:10px">'+(stockHtml||'<p class="small">Belum ada stock.</p>')+'</div>';if($('stockStatus'))$('stockStatus').value=st;if($('stockCategory'))$('stockCategory').value=cat;if($('stockOutlet'))$('stockOutlet').value=outlet;const si=$('stockSearch');if(si){si.focus();si.setSelectionRange(si.value.length,si.value.length)}}
function productShareText(s){const nl=String.fromCharCode(10),c=s.category;let raw=String(s.product||'').trim(),suffix=/(?:\s+)(NEW|SECOND)$/i.exec(raw)?.[1]?.toUpperCase()||'';raw=raw.replace(/\s+(NEW|SECOND)$/i,'').trim();let t='📱 '+[raw,s.variant,s.color,suffix].filter(Boolean).join(' — ')+nl;if(c==='IPHONE_SECOND')t+='Grade: '+(s.grade||'-')+nl+'Kondisi: '+(s.condition||'-')+nl+'Battery Health: '+(s.battery_health!=null?s.battery_health+'%':'-')+nl+'Kelengkapan: '+(s.completeness||'-')+nl+'Minus: '+(s.minus||'-')+nl;else if(c==='ANDROID_SECOND')t+='Warna: '+(s.color||'-')+nl+'Kondisi: '+(s.condition||'-')+nl+'Kelengkapan: '+(s.completeness||'-')+nl+'Minus: '+(s.minus||'-')+nl;else if(c==='ANDROID_NEW')t+='Warna: '+(s.color||'-')+nl;t+='IMEI: '+maskImei(s.imei_1)+nl+'Harga Jual: Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+nl+'Status: '+s.status+nl+nl+'Hello Majesty';return t}

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
function openProductDetail(id){const s=inventoryStock.find(x=>x.id===id);if(!s)return;const c=s.category;let d='';if(c==='IPHONE_SECOND')d='<b>Grade:</b> '+esc(s.grade||'-')+'<br><b>Kondisi:</b> '+esc(s.condition||'-')+'<br><b>Battery Health:</b> '+(s.battery_health!=null?s.battery_health+'%':'-')+'<br><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'<br><b>Minus:</b> '+esc(s.minus||'-')+'<br>';else if(c==='ANDROID_SECOND')d='<b>Warna:</b> '+esc(s.color||'-')+'<br><b>Kondisi:</b> '+esc(s.condition||'-')+'<br><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'<br><b>Minus:</b> '+esc(s.minus||'-')+'<br>';else if(c==='ANDROID_NEW')d='<b>Warna:</b> '+esc(s.color||'-')+'<br>';d+='<b>IMEI:</b> '+esc(canViewFullImei()?(s.imei_1||'-'):maskImei(s.imei_1))+'<br><b>Harga Jual:</b> Rp'+Number(s.asking_price||0).toLocaleString('id-ID');const html=`<div class="box"><h2 style="margin:0">${esc((()=>{let raw=String(s.product||'').trim(),suffix=/(?:\s+)(NEW|SECOND)$/i.exec(raw)?.[1]?.toUpperCase()||'';raw=raw.replace(/\s+(NEW|SECOND)$/i,'').trim();return [raw,s.variant,s.color,suffix].filter(Boolean).join(' — ')})())}</h2><div class="small">${invCategory(s.category)} • ${esc(s.status)}</div></div><div class="lead">${d}${stockPhotoGallery(s,false)}</div><div class="row"><button class="success" onclick="shareProduct(inventoryStock.find(x=>x.id===\'${id}\'))">📤 Kirim Info Customer</button>${profile?.role==='SALES'&&s.status==='READY'?'<button class="success" onclick="closeModal();openSellStock(\''+id+'\')">💰 Closing</button>':''}</div>`;$('mt').textContent='📱 Detail Produk';$('mb').innerHTML=html;$('modal').classList.remove('hidden')}
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
 const salePrice='<div style="margin-top:9px"><div style="font-size:12px;font-weight:600;color:#667085">Harga Jual</div><div style="font-size:21px;line-height:1.2;font-weight:800">Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+'</div></div>';
 const cost=canViewCost?'<div class="small" style="margin-top:6px"><b>Harga Beli:</b> Rp'+Number(s.cost||0).toLocaleString('id-ID')+'</div>':'';
 return '<div class="lead" style="padding:14px;margin-bottom:10px">'+
   '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div style="display:flex;gap:10px;min-width:0"><div>'+photo+'</div><div><b style="font-size:18px;line-height:1.3">'+esc(title)+'</b></div></div><span class="badge">'+esc(s.status||'-')+'</span></div>'+
   '<div class="small" style="margin-top:8px">📍 Outlet: <b>'+esc(s.outlet||'-')+'</b>'+(s.status==='SOLD'?' • Terjual '+new Date(s.sold_at).toLocaleDateString('id-ID'):'')+'</div>'+
   '<div class="small" style="margin-top:6px;line-height:1.45">'+meta.join(' • ')+'</div>'+
   '<div class="small" style="margin-top:5px">IMEI: '+esc(imei)+'</div>'+
   cost+details+salePrice+
   '<div class="row" style="margin-top:10px"><button class="secondary" onclick="openProductDetail(\''+s.id+'\')">👁️ Detail</button><button class="secondary" onclick="openStockHistory(\''+s.id+'\')">🧾 Histori</button><button class="secondary" onclick="openStockAI(\''+s.id+'\')">🤖 Tanya AI</button>'+
   (ready&&canMarkStockSold()?'<button class="danger" onclick="markStockSold(\''+s.id+'\')">🔴 SOLD</button>':'')+(ready&&sales?'<button class="success" onclick="openSellStock(\''+s.id+'\')">💰 Jual / Closing</button>':'')+((ready&&(management||facilitator))?'<button class="danger" onclick="openSupplierReturn(\''+s.id+'\')">↩️ Retur Supplier</button>':'')+
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
function canMarkStockSold(){ return !!profile?.is_management || !!inventoryCanFacilitator; }
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
 if(!(profile?.is_management||inventoryCanFacilitator))return alert('Hanya Management atau Facilitator yang dapat menandai stock SOLD.');
 const s=inventoryStock.find(x=>x.id===id);if(!s||s.status!=='READY')return;
 const name=[s.product,s.variant,s.color].filter(Boolean).join(' — ');
 const input=prompt('Masukkan Harga Jual Aktual untuk '+name+'\\n\\nHarga List: Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+'\\n\\nHarga transaksi customer:',String(s.asking_price||''));
 if(input===null)return;
 const salePrice=Number(String(input).replace(/[^0-9]/g,''));
 if(!salePrice||salePrice<=0)return alert('Harga Jual Aktual wajib diisi.');
 if(!confirm('Tandai stock sebagai SOLD?\\n\\n'+name+'\\nHarga Jual Aktual: Rp'+salePrice.toLocaleString('id-ID')))return;
 const x=await sb.rpc('mark_stock_sold',{p_stock_id:id,p_sale_price:salePrice});
 if(x.error)return alert('Gagal menandai SOLD: '+x.error.message);
 try{
  await cleanupSoldStockPhotos(id);
 }catch(e){
  console.error('[HM] SOLD photo cleanup error',e);
  alert('Stock sudah SOLD, tetapi foto belum berhasil dibersihkan. Coba lagi dari unit tersebut.\\n\\n'+(e?.message||e));
 }
 await renderInventory();
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
 const teams=await sb.from('team_directory').select('*').order('name');if(teams.error)return alert(teams.error.message);
 const products=inventoryProducts.map(p=>'<option value="'+p.id+'">'+esc(masterProductLabel(p))+'</option>').join('');
 const selected=inventoryProducts.find(p=>p.id===$('stprod')?.value);
 const isIphoneNew=selected?.category==='IPHONE_NEW',isIphoneSecond=selected?.category==='IPHONE_SECOND',isAndroidNew=selected?.category==='ANDROID_NEW';
 const teamRows=teams.data||[]; const profs=await sb.from('team_profiles').select('user_id,name,is_management'); if(profs.error)return alert(profs.error.message); const mgmtIds=new Set((profs.data||[]).filter(x=>x.is_management).map(x=>x.user_id)); const perm=await sb.from('team_permissions').select('name,outlet,can_hunter,active').eq('active',true).eq('can_hunter',true); if(perm.error)return alert(perm.error.message); const allowed=perm.data||[]; const hunters=teamRows.filter(t=>!mgmtIds.has(t.user_id)&&allowed.some(x=>String(x.name).trim().toLowerCase()===String(t.name).trim().toLowerCase()&&String(x.outlet).trim().toLowerCase()===String(t.outlet||'').trim().toLowerCase())).map(t=>'<option value="'+t.user_id+'" data-hunter-outlet="'+esc(t.outlet||'')+'">'+esc(t.name)+'</option>').join('');
 const isMgmt=!!profile?.is_management;const hunterOptions=hunters;
 $('mt').textContent='📦 Barang Masuk';
 $('mb').innerHTML=(isMgmt?'<label>Barang Masuk Ke</label><select id="stoutlet" onchange="filterHunterOptions()">'+[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean).concat(['Majesty Plaza iPhone','Majesty Refill Phone']))].sort().map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>':'<div class="small" style="margin-bottom:8px">📍 Barang masuk ke: <b>'+esc(profile?.outlet||'-')+'</b></div>')+
 '<label>Produk</label><input id="stprodsearch" placeholder="Cari: iPhone 15 / second / new / pusat / warna..." oninput="filterReceiveProducts()"><select id="stprod" onchange="toggleReceiveFields()">'+products+'</select><label>Varian / Storage</label><input id="stvariant" readonly placeholder="Otomatis dari Master Produk">'+
 '<div id="receiveSourceFields"><label>Sumber Barang</label><select id="stsource" onchange="toggleHunterField()"><option value="MANAGEMENT">Management</option><option value="GESERAN">Geseran</option><option value="HUNTER">Hunter</option></select><div id="hunterBox" class="hidden"><label>Pilih Hunter</label><select id="sthunter">'+hunterOptions+'</select></div></div><div id="standardReceiveFields"><label>IMEI 1</label><input id="stimei1"><label>IMEI 2 (opsional)</label><input id="stimei2"><label>Kondisi</label><input id="stcondition" placeholder="Contoh: 95% / Mulus"><label>Battery Health</label><input id="stbh" type="number" min="0" max="100" placeholder="89"><label>Kelengkapan</label><input id="stcomplete" placeholder="Unit + Box + Cable"><label>Minus</label><textarea id="stminus"></textarea></div>'+
 '<div id="iphoneNewFields" class="hidden"><label>IMEI 1</label><input id="stimei1new"><label>IMEI 2 / EID (opsional)</label><input id="stimei2new"><label>Harga Beli</label><input id="stcostnew" type="number"><label>Harga Jual</label><input id="stpricenew" type="number"><label>Supplier / Dealer (opsional)</label><input id="stsupplier" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="stnotesnew"></textarea></div>'+
 '<div id="iphoneSecondFields" class="hidden"><label>IMEI 1</label><input id="stimei1second"><label>IMEI 2 / EID (opsional)</label><input id="stimei2second"><label>Grade</label><select id="stgradesecond"><option value="">Pilih Grade</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select><label>Battery Health</label><input id="stbhsecond" type="number" min="0" max="100" placeholder="89"><label>Kondisi</label><input id="stconditionsecond" placeholder="Contoh: Mulus / 95%"><label>Kelengkapan</label><input id="stcompletesecond" placeholder="Unit + Box + Cable"><label>Minus (opsional)</label><textarea id="stminusseconde"></textarea><label>Harga Beli</label><input id="stcostsecond" type="number"><label>Harga Jual</label><input id="stpricesec" type="number"><label>Supplier / Dealer (opsional)</label><input id="stsuppliersecond" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="stnotessecond"></textarea></div>'+
 '<div id="androidNewFields" class="hidden"><label>Warna</label><input id="standroidcolor" placeholder="Contoh: Violet"><label>IMEI 1</label><input id="standroidimei1"><label>IMEI 2 (opsional)</label><input id="standroidimei2"><label>Harga Beli</label><input id="standroidcost" type="number"><label>Harga Jual</label><input id="standroidprice" type="number"><label>Supplier / Dealer (opsional)</label><input id="standroidsupplier" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="standroidnotes"></textarea></div>'+
 '<div id="androidSecondFields" class="hidden"><label>Warna</label><input id="standroidsecondcolor" placeholder="Contoh: Black"><label>IMEI 1</label><input id="standroidsecondimei1"><label>IMEI 2 (opsional)</label><input id="standroidsecondimei2"><label>Kondisi</label><input id="standroidsecondcondition" placeholder="Contoh: Mulus / 90%"><label>Kelengkapan</label><input id="standroidsecondcomplete" placeholder="Unit + Box + Cable"><label>Minus (opsional)</label><textarea id="standroidsecondminus"></textarea><label>Harga Beli</label><input id="standroidsecondcost" type="number"><label>Harga Jual</label><input id="standroidsecondprice" type="number"><label>Supplier / Dealer (opsional)</label><input id="standroidsecondsupplier" placeholder="Nama dealer / supplier"><label>Catatan (opsional)</label><textarea id="standroidsecondnotes"></textarea></div><div id="standardPriceFields"><label>Harga Modal</label><input id="stcost" type="number"><label>Harga Jual</label><input id="stprice" type="number"><label>Referensi Barang Masuk</label><input id="stref" placeholder="Invoice / nota / kode hunter"><label>Catatan</label><textarea id="stnotes"></textarea></div><button class="success" onclick="saveStock()">Simpan Stock Ready</button>';
 toggleReceiveFields();
 $('modal').classList.remove('hidden');
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
 const receiveOutlet=inventoryReceiveOutlet();
 const source=$('stsource')?.value||'MANAGEMENT';
 const hunter=source==='HUNTER'?($('sthunter')?.value||''):null;
 if(source==='HUNTER'&&!hunter)return alert('Hunter wajib dipilih.');
 if(!receiveOutlet)return alert('Outlet tujuan barang masuk wajib dipilih.');
 const selectedProduct=inventoryProducts.find(p=>p.id===$('stprod')?.value),isIphoneNew=selectedProduct?.category==='IPHONE_NEW',isIphoneSecond=selectedProduct?.category==='IPHONE_SECOND',isAndroidNew=selectedProduct?.category==='ANDROID_NEW',isAndroidSecond=selectedProduct?.category==='ANDROID_SECOND';
 let data;
 if(isIphoneNew){
  const imei1=$('stimei1new').value.trim(),cost=$('stcostnew').value,price=$('stpricenew').value;
  if(!imei1||cost===''||price==='')return alert('Untuk iPhone New, IMEI 1, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,imei_1:imei1,imei_2:$('stimei2new').value.trim()||null,grade:null,condition:null,battery_health:null,completeness:null,minus:null,source_type:source,hunter_user_id:hunter,cost:Number(cost),asking_price:Number(price),supplier:$('stsupplier').value.trim()||null,notes:$('stnotesnew').value.trim()||null,receipt_ref:null,received_source_note:'Management',outlet:inventoryReceiveOutlet()};
 }else if(isIphoneSecond){
  const imei1=$('stimei1second').value.trim(),grade=$('stgradesecond').value,bh=$('stbhsecond').value,condition=$('stconditionsecond').value.trim(),complete=$('stcompletesecond').value.trim(),cost=$('stcostsecond').value,price=$('stpricesec').value;
  if(!imei1||!grade||bh===''||!condition||!complete||cost===''||price==='')return alert('Untuk iPhone Second, IMEI 1, Grade, Battery Health, Kondisi, Kelengkapan, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,imei_1:imei1,imei_2:$('stimei2second').value.trim()||null,grade,condition,battery_health:Number(bh),completeness:complete,minus:$('stminusseconde').value.trim()||null,source_type:source,hunter_user_id:hunter,cost:Number(cost),asking_price:Number(price),supplier:$('stsuppliersecond').value.trim()||null,notes:$('stnotessecond').value.trim()||null,receipt_ref:null,received_source_note:'Management',outlet:inventoryReceiveOutlet()};
 }else if(isAndroidSecond){
  const color=$('standroidsecondcolor').value.trim(),imei1=$('standroidsecondimei1').value.trim(),condition=$('standroidsecondcondition').value.trim(),complete=$('standroidsecondcomplete').value.trim(),cost=$('standroidsecondcost').value,price=$('standroidsecondprice').value;
  if(!color||!imei1||!condition||!complete||cost===''||price==='')return alert('Untuk Android Second, Warna, IMEI 1, Kondisi, Kelengkapan, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,color,imei_1:imei1,imei_2:$('standroidsecondimei2').value.trim()||null,grade:null,condition,battery_health:null,completeness:complete,minus:$('standroidsecondminus').value.trim()||null,source_type:source,hunter_user_id:hunter,cost:Number(cost),asking_price:Number(price),supplier:$('standroidsecondsupplier').value.trim()||null,notes:$('standroidsecondnotes').value.trim()||null,receipt_ref:null,received_source_note:'Management',outlet:inventoryReceiveOutlet()};
 }else if(isAndroidNew){
  const color=$('standroidcolor').value.trim(),imei1=$('standroidimei1').value.trim(),cost=$('standroidcost').value,price=$('standroidprice').value;
  if(!color||!imei1||cost===''||price==='')return alert('Untuk Android New, Warna, IMEI 1, Harga Beli dan Harga Jual wajib diisi.');
  data={product_id:$('stprod').value,color,imei_1:imei1,imei_2:$('standroidimei2').value.trim()||null,grade:null,condition:null,battery_health:null,completeness:null,minus:null,source_type:source,hunter_user_id:hunter,cost:Number(cost),asking_price:Number(price),supplier:$('standroidsupplier').value.trim()||null,notes:$('standroidnotes').value.trim()||null,receipt_ref:null,received_source_note:'Management',outlet:inventoryReceiveOutlet()};
 }else{
  data={product_id:$('stprod').value,imei_1:$('stimei1').value.trim()||null,imei_2:$('stimei2').value.trim()||null,grade:selectedProduct?.grade||null,condition:$('stcondition').value.trim()||null,battery_health:$('stbh').value?Number($('stbh').value):null,completeness:$('stcomplete').value.trim()||null,minus:$('stminus').value.trim()||null,source_type:source,hunter_user_id:hunter,cost:Number($('stcost').value||0),asking_price:Number($('stprice').value||0),notes:$('stnotes').value.trim()||null,receipt_ref:$('stref')?.value.trim()||null,received_source_note:source==='HUNTER'?'Hunter':'Management',outlet:inventoryReceiveOutlet()};
 }
 const x=await sb.from('stock_units').insert(data);if(x.error)return alert(x.error.message);closeModal();await renderInventory();
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
async function openSalesReport(){
 const x=await sb.from('sales_transactions').select('*').order('sold_at',{ascending:false});
 if(x.error)return alert(x.error.message);
 const rows=x.data||[];
 const now=new Date();
 const y=now.getFullYear(),m=now.getMonth(),d=now.getDate();
 const isToday=r=>{const z=new Date(r.sold_at);return z.getFullYear()===y&&z.getMonth()===m&&z.getDate()===d};
 const isMonth=r=>{const z=new Date(r.sold_at);return z.getFullYear()===y&&z.getMonth()===m};
 const calc=list=>({rows:list,total:list.reduce((a,r)=>a+Number(r.sale_price||0)-Number(r.discount||0),0),profit:list.reduce((a,r)=>a+Number(r.gross_profit||0),0)});
 const today=calc(rows.filter(isToday)),month=calc(rows.filter(isMonth));
 const detail=list=>list.map(r=>'<div class="lead"><b>'+new Date(r.sold_at).toLocaleDateString('id-ID')+'</b><div class="small">Sumber: '+(r.customer_source==='WALK-IN'?'🚶 WALK-IN':'📱 DIGITAL')+' • Sales: '+esc(r.sales_user_id||'-')+'</div><div>Jual Rp'+Number(r.sale_price||0)-Number(r.discount||0).toLocaleString('id-ID')+' • Laba Rp'+Number(r.gross_profit||0).toLocaleString('id-ID')+'</div></div>').join('')||'<p class="small">Belum ada penjualan pada periode ini.</p>';
 $('mt').textContent='📊 Laporan Penjualan';
 $('mb').innerHTML='<div class="row" style="margin-bottom:10px"><button class="success" onclick="showSalesReportPeriod(\'TODAY\')">📅 Hari Ini</button><button class="secondary" onclick="showSalesReportPeriod(\'MONTH\')">📆 Bulan Ini</button></div><div id="salesReportBody"></div>';
 window.hmSalesReport={today,month}; showSalesReportPeriod('TODAY'); $('modal').classList.remove('hidden');
}
function showSalesReportPeriod(period){
 const d=window.hmSalesReport?.[period==='MONTH'?'month':'today']; if(!d)return;
 $('salesReportBody').innerHTML='<div class="small" style="margin-bottom:8px">'+(period==='MONTH'?'📆 Bulan '+new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'}):'📅 '+new Date().toLocaleDateString('id-ID'))+'</div><div class="stats">'+invStat('Omzet',d.total)+invStat('Laba',d.profit)+'</div>'+d.rows.map(r=>'<div class="lead"><b>'+new Date(r.sold_at).toLocaleDateString('id-ID')+'</b><div class="small">Sumber: '+(r.customer_source==='WALK-IN'?'🚶 WALK-IN':'📱 DIGITAL')+' • Sales: '+esc(r.sales_user_id||'-')+'</div><div>Jual Rp'+(Number(r.sale_price||0)-Number(r.discount||0)).toLocaleString('id-ID')+' • Laba Rp'+Number(r.gross_profit||0).toLocaleString('id-ID')+'</div></div>').join('')||'<p class="small">Belum ada penjualan pada periode ini.</p>';
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
