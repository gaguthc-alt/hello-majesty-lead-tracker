/* HM_INVENTORY_STABLE_20260930_ANDROID_SECOND_3 */
/* Hello Majesty Inventory & Hunter */
let inventoryProducts=[], inventoryStock=[], inventoryView='stock';
let hunterDashboard=[]; let inventoryCanFacilitator=false;
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
  if(!profile?.is_management){
    const perm=await sb.rpc('has_facilitator_inventory_access');
    if(!perm.error) inventoryCanFacilitator=!!perm.data;
  }
  window.hmCanFacilitator=inventoryCanFacilitator;
  const stockView=profile?.is_management?'stock_management':(inventoryCanFacilitator?'stock_facilitator':'stock_catalog');
  let stockQuery=sb.from(stockView).select('*').order('status').order('received_at',{ascending:false});
  if(!profile?.is_management && profile?.outlet) stockQuery=stockQuery.eq('outlet',profile.outlet);
  const [p,s]=await Promise.all([
    sb.from('product_master').select('*').eq('active',true).order('category').order('product'),
    stockQuery
  ]);
  if(p.error) throw p.error; if(s.error) throw s.error;
  inventoryProducts=p.data||[]; inventoryStock=s.data||[];
}

async function renderInventory(){
  const host=document.getElementById('inventoryPanel')||document.createElement('div');
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
  '<div class="row" style="margin-top:12px"><button class="'+(inventoryView==='stock'?'':'secondary')+'" id="invStockTab" type="button" data-inventory-view="stock">Stock</button><button class="'+(inventoryView==='products'?'':'secondary')+'" id="invProductsTab" type="button" data-inventory-view="products">Produk</button><button class="secondary" onclick="openSalesReport()">Laporan Penjualan</button>'+'</div>'+
  '<div id="inventoryViewDebug" class="small" style="margin-top:8px;font-weight:700"></div><div id="inventoryBody" style="margin-top:10px"></div>';
  host.onclick=(e)=>{const tab=e.target.closest('[data-inventory-view]');if(tab){e.preventDefault();setInventoryView(tab.dataset.inventoryView)}};
  renderInventoryBody();
}
async function refreshInventory(btn){if(btn?.disabled)return;try{if(btn){btn.disabled=true;btn.textContent='⏳ Loading...'}await renderInventory()}catch(e){console.error(e);alert('Refresh Product & Stock error: '+(e?.message||e))}finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh'}}}
async function loadHunterDashboard(){const r=await sb.from('hunter_dashboard').select('*').order('total_commission',{ascending:false});if(r.error)throw r.error;hunterDashboard=r.data||[]}
function fmtRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID')}
async function markHunterCommissionPaid(id){if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');const note=prompt('Catatan pembayaran (opsional):')||null;const r=await sb.from('sales_transactions').update({hunter_commission_paid_at:new Date().toISOString(),hunter_commission_paid_by:profile.user_id,hunter_commission_payment_note:note}).eq('id',id).is('hunter_commission_paid_at',null);if(r.error)return alert(r.error.message);openHunterCommission()}
async function openHunterCommission(){const r=await sb.from('sales_transactions').select('id,sold_at,hunter_user_id,hunter_commission,hunter_commission_paid_at,hunter_commission_payment_note,customer_name').not('hunter_user_id','is',null).order('sold_at',{ascending:false});if(r.error)return alert(r.error.message);const teams=await sb.from('team_directory').select('user_id,name');const names=Object.fromEntries((teams.data||[]).map(x=>[x.user_id,x.name]));const rows=r.data||[];$('mt').textContent='💸 Komisi Hunter';$('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi 10% dari profit unit Hunter yang SOLD. Pembayaran hanya dapat diubah oleh Management.</div>'+rows.map(x=>'<div class="lead"><b>🏹 '+esc(names[x.hunter_user_id]||'Unknown')+'</b><div>'+new Date(x.sold_at).toLocaleDateString('id-ID')+' • Komisi <b>'+fmtRp(x.hunter_commission)+'</b></div><div class="small">'+(x.hunter_commission_paid_at?'🟢 Dibayar '+new Date(x.hunter_commission_paid_at).toLocaleDateString('id-ID'):'🟡 Belum dibayar')+'</div>'+((profile?.is_management&&!x.hunter_commission_paid_at)?'<button class="success" style="margin-top:6px" onclick="markHunterCommissionPaid(\''+x.id+'\')">✓ Tandai Sudah Dibayar</button>':'')+'</div>').join('')||'<p class="small">Belum ada transaksi komisi Hunter.</p>';$('modal').classList.remove('hidden')}
async function openHunterDashboard(){try{await loadHunterDashboard()}catch(e){alert(e.message||e);return}$('mt').textContent='🏹 Dashboard Hunter';$('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi = 10% dari profit unit Hunter yang sudah SOLD.</div>'+hunterDashboard.map(h=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>🏹 '+esc(h.hunter_name)+'</b><span class="badge">'+h.sold_units+' SOLD</span></div><div style="margin-top:8px">📦 Total unit: <b>'+h.total_units+'</b> • 🟢 Ready: <b>'+h.ready_units+'</b> • 🔴 Sold: <b>'+h.sold_units+'</b></div><div style="margin-top:5px">💰 Profit: <b>'+fmtRp(h.total_profit)+'</b> • 🎯 Komisi: <b>'+fmtRp(h.total_commission)+'</b></div></div>').join('')||'<p class="small">Belum ada stock Hunter.</p>';$('modal').classList.remove('hidden')}
function invStat(label,val){return '<div class="stat"><div class="small">'+label+'</div><div class="num">'+Number(val||0).toLocaleString('id-ID')+'</div></div>'}
function filterHunterOptions(){ const sel=$('sthunter'),outlet=String($('stoutlet')?.value||profile?.outlet||'').trim().toLowerCase(); if(!sel)return; [...sel.options].forEach(o=>{const ho=String(o.getAttribute('data-hunter-outlet')||'').trim().toLowerCase(); o.hidden=ho!==outlet;}); if(sel.selectedOptions[0]?.hidden)sel.value=''; }
function toggleHunterField(){const box=$('hunterBox'),source=$('stsource')?.value||'MANAGEMENT';if(box)box.classList.toggle('hidden',source!=='HUNTER');}
function inventoryReceiveOutlet(){
 const sel=$('stoutlet');
 return profile?.is_management ? (sel?.value||'') : (profile?.outlet||'');
}
function setInventoryView(view){inventoryView=view;renderInventoryBody();const dbg=document.getElementById('inventoryViewDebug');if(dbg)dbg.textContent='Mode: '+(view==='products'?'PRODUK':'STOCK');const panel=document.getElementById('inventoryPanel');if(panel){const buttons=panel.querySelectorAll('.row button');buttons.forEach(b=>{if(b.textContent.trim()==='Stock'||b.textContent.trim()==='Produk')b.classList.toggle('secondary',b.textContent.trim().toLowerCase()!==view)})}}
function renderInventoryBody(){const body=document.getElementById('inventoryBody');if(!body)return;if(inventoryView==='products'){body.innerHTML='<div class="row"><select id="invCat" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><input id="invSearch" placeholder="Cari produk / kategori / varian / warna" oninput="renderInventoryBody()"></div><div style="margin-top:10px">'+inventoryProducts.filter(p=>(!$('invCat')?.value||p.category===$('invCat').value)&&(!$('invSearch')?.value||[p.product,p.variant,p.color,p.category,invCategory(p.category)].join(' ').toLowerCase().includes($('invSearch').value.toLowerCase()))).map(p=>'<div class="lead"><b>'+esc(masterProductLabel(p))+'</b><div class="small">'+invCategory(p.category)+'</div></div>').join('')+'</div>';return}const q=($('stockSearch')?.value||'').toLowerCase(),st=($('stockStatus')?.value||'READY'),cat=($('stockCategory')?.value||''),isManagement=!!profile?.is_management,outlet=($('stockOutlet')?.value||'');const rows=inventoryStock.filter(s=>(!outlet||s.outlet===outlet)&&(!st||s.status===st)&&(!cat||s.category===cat)&&(!q||[s.product,s.variant,s.color,s.imei_1,s.imei_2,s.grade,s.condition,s.hunter_name,s.outlet,s.category,invCategory(s.category)].join(' ').toLowerCase().includes(q)));const outlets=[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean).concat(['Majesty Plaza iPhone','Majesty Refill Phone']))].sort();body.innerHTML='<div class="row"><input id="stockSearch" placeholder="Cari produk, IMEI, grade, warna, hunter..." value="'+esc(q)+'" oninput="renderInventoryBody()"><select id="stockStatus" onchange="renderInventoryBody()"><option value="">Semua Status</option><option>READY</option><option>RESERVED</option><option>SOLD</option><option>SERVICE</option><option>RETURN</option></select><select id="stockCategory" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select>'+(isManagement?'<select id="stockOutlet" onchange="renderInventoryBody()"><option value="">📍 Semua Outlet</option>'+outlets.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>':'')+'</div><div class="small" style="margin-top:8px">📍 '+(isManagement?(outlet||'Semua Outlet'):esc(profile?.outlet||'-'))+' • '+rows.length+' unit</div><div style="margin-top:10px">'+(rows.map(stockCard).join('')||'<p class="small">Belum ada stock.</p>')+'</div>';if($('stockStatus'))$('stockStatus').value=st;if($('stockCategory'))$('stockCategory').value=cat;if($('stockOutlet'))$('stockOutlet').value=outlet;const si=$('stockSearch');if(si){si.focus();si.setSelectionRange(si.value.length,si.value.length)}}
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
async function compressStockPhoto(file){
 if(!file||!file.type?.startsWith('image/'))throw new Error('File harus berupa gambar.');
 const max=1600,quality=.78;
 const img=await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Foto tidak dapat dibaca.'))};im.src=u});
 const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Gagal kompres foto.')),'image/webp',quality));
}
async function uploadStockPhoto(stockId,slot,file){
 if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');
 try{
  const blob=await compressStockPhoto(file);if(blob.size>1048576)throw new Error('Foto masih lebih dari 1 MB setelah kompresi.');
  const path=`${stockId}/foto-${slot}.webp`;
  const up=await sb.storage.from('stock-photos').upload(path,blob,{contentType:'image/webp',cacheControl:'31536000',upsert:true});if(up.error)throw up.error;
  const pub=sb.storage.from('stock-photos').getPublicUrl(path);
  const data={};data['photo_'+slot]=pub.data.publicUrl;data.updated_at=new Date().toISOString();
  const db=await sb.from('stock_units').update(data).eq('id',stockId);if(db.error)throw db.error;
  await renderInventory();openProductDetail(stockId);
 }catch(e){alert('Foto '+slot+' gagal diupload: '+(e?.message||e))}
}
async function deleteStockPhoto(stockId,slot){
 if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');
 if(!confirm('Hapus Foto '+slot+' dari unit ini?'))return;
 const path=`${stockId}/foto-${slot}.webp`;const rm=await sb.storage.from('stock-photos').remove([path]);if(rm.error)return alert(rm.error.message);
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
 const management=!!profile?.is_management,facilitator=inventoryCanFacilitator,canViewCost=management||facilitator,ready=s.status==='READY',sales=profile?.role==='SALES',c=s.category,isSecond=c==='IPHONE_SECOND'||c==='ANDROID_SECOND';
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
   '<div class="row" style="margin-top:10px"><button class="secondary" onclick="openProductDetail(\''+s.id+'\')">👁️ Detail</button><button class="secondary" onclick="openStockHistory(\''+s.id+'\')">🧾 Histori</button>'+
   (ready&&sales?'<button class="success" onclick="openSellStock(\''+s.id+'\')">💰 Jual / Closing</button>':'')+
   (management||profile?.role==='CONTENT_CREATOR'?'<button class="secondary" onclick="openEditStock(\''+s.id+'\')">Edit</button>':'')+
   '</div></div>';
}
function openProductMaster(){
 const canOpen=!!profile?.is_management || inventoryCanFacilitator;
 if(!canOpen)return;
 const management=!!profile?.is_management;
 $('mt').textContent='⚙️ Master Produk';
 $('mb').innerHTML=(canOpen?'<button class="success" onclick="openAddProduct()">＋ Tambah Produk</button>':'')+
 '<div style="margin-top:10px">'+inventoryProducts.map(p=>'<div class="lead"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>'+esc(masterProductLabel(p))+'</b><div class="small">'+invCategory(p.category)+'</div></div>'+(management?'<div class="row"><button class="secondary" onclick="openEditProduct(\''+p.id+'\')">Edit</button><button class="danger" onclick="deactivateProduct(\''+p.id+'\')">Hapus</button></div>':'')+'</div></div>').join('')+'</div>';
 $('modal').classList.remove('hidden');
}
function openEditProduct(id){
 if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');
 const p=inventoryProducts.find(x=>x.id===id);if(!p)return;
 const iphone=String(p.category||'').startsWith('IPHONE'),second=String(p.category||'').includes('SECOND');
 $('mt').textContent='✏️ Edit Master Produk';
 $('mb').innerHTML='<label>Kategori</label><select id="epmcat"><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><label>Produk</label><input id="epmprod" value="'+esc(p.product||'')+'"><label>Varian</label><input id="epmvar" value="'+esc(p.variant||'')+'"><div id="epmcolorBox"><label>Warna</label><input id="epmcolor" value="'+esc(p.color||'')+'"></div><button class="success" onclick="saveEditProduct(\''+id+'\')">Simpan Perubahan</button>';
 $('epmcat').value=p.category||'ANDROID_NEW';
 toggleEditProductFields();$('modal').classList.remove('hidden');
}
function toggleEditProductFields(){
 const cat=$('epmcat')?.value||'',second=cat.includes('SECOND'),iphone=cat.startsWith('IPHONE');
 $('epmcolorBox')?.classList.toggle('hidden',!iphone);
}
async function saveEditProduct(id){
 if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');
 const cat=$('epmcat').value,isIphone=cat.startsWith('IPHONE'),isSecond=cat.includes('SECOND'),rawProduct=$('epmprod').value.trim(),product=rawProduct.replace(/\s+(NEW|SECOND)$/i,'')+(cat.includes('SECOND')?' SECOND':(cat.includes('NEW')?' NEW':'')),variant=$('epmvar').value.trim();
 if(!product||!variant)return alert('Produk dan Storage wajib diisi.');
 const grade=(isIphone&&isSecond)?($('epmgrade').value||'-'):null;
 const x=await sb.from('product_master').update({category:cat,product,variant,color:isIphone?($('epmcolor').value.trim()||null):null,grade,updated_at:new Date().toISOString()}).eq('id',id);
 if(x.error)return alert(x.error.message);closeModal();await renderInventory();
}
async function deactivateProduct(id){
 if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');
 const p=inventoryProducts.find(x=>x.id===id);if(!p)return;
 if(!confirm('Hapus Master Produk "'+(p.product||'')+' '+(p.variant||'')+'"? Produk akan dinonaktifkan dan tidak dihapus dari histori stock.'))return;
 const x=await sb.from('product_master').update({active:false,updated_at:new Date().toISOString()}).eq('id',id);
 if(x.error)return alert(x.error.message);closeModal();await renderInventory();
}
function openAddProduct(){$('mt').textContent='＋ Master Produk';$('mb').innerHTML='<label>Kategori</label><select id="pmcat" onchange="toggleProductFields()"><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option><option value="STOCK_NEW_PUSAT">Stock New Pusat</option><option value="STOCK_SECOND_PUSAT">Stock Second Pusat</option></select><label>Produk</label><input id="pmprod" placeholder="Contoh: iPhone 17 Pro Max"><label>Varian</label><input id="pmvar" placeholder="256"><div id="pmcolorBox"><label>Warna</label><input id="pmcolor" placeholder="Black"></div><button class="success" onclick="saveProduct()">Simpan Produk</button>';toggleProductFields();$('modal').classList.remove('hidden')}
function toggleProductFields(){const cat=$('pmcat')?.value||'',iphone=cat.startsWith('IPHONE');$('pmcolorBox')?.classList.toggle('hidden',!iphone)}
async function saveProduct(){const cat=$('pmcat').value,isIphone=cat.startsWith('IPHONE'),isSecond=cat.includes('SECOND'),rawProduct=$('pmprod').value.trim(),product=rawProduct.replace(/\s+(NEW|SECOND)$/i,'')+(cat.includes('SECOND')?' SECOND':(cat.includes('NEW')?' NEW':'')),variant=$('pmvar').value.trim();if(!product||!variant)return alert('Produk dan Storage wajib diisi.');const grade=null;const x=await sb.from('product_master').insert({category:cat,product,variant,color:isIphone?($('pmcolor').value.trim()||null):null,grade});if(x.error)return alert(x.error.message);closeModal();await renderInventory();openProductMaster()}
async function filterReceiveProducts(){const q=($('stprodsearch')?.value||'').trim().toLowerCase();const sel=$('stprod');if(!sel)return;const current=sel.value;Array.from(sel.options).forEach(o=>{const p=inventoryProducts.find(x=>x.id===o.value);if(!p){o.hidden=false;return;}const hay=[p.product,p.variant,p.color,p.category,invCategory(p.category)].join(' ').toLowerCase();o.hidden=!!q&&!hay.includes(q);});if(current&&!sel.querySelector('option[value="'+CSS.escape(current)+'"]')?.hidden)sel.value=current;toggleReceiveFields();}
async function openReceiveStock(){
 const teams=await sb.from('team_directory').select('*').order('name');if(teams.error)return alert(teams.error.message);
 const products=inventoryProducts.map(p=>'<option value="'+p.id+'">'+esc(masterProductLabel(p))+'</option>').join('');
 const selected=inventoryProducts.find(p=>p.id===$('stprod')?.value);
 const isIphoneNew=selected?.category==='IPHONE_NEW',isIphoneSecond=selected?.category==='IPHONE_SECOND',isAndroidNew=selected?.category==='ANDROID_NEW';
 const teamRows=teams.data||[]; const profs=await sb.from('team_profiles').select('user_id,name,is_management'); if(profs.error)return alert(profs.error.message); const mgmtIds=new Set((profs.data||[]).filter(x=>x.is_management).map(x=>x.user_id)); const perm=await sb.from('team_permissions').select('name,outlet,can_hunter,active').eq('active',true).eq('can_hunter',true); if(perm.error)return alert(perm.error.message); const allowed=perm.data||[]; const hunters=teamRows.filter(t=>!mgmtIds.has(t.user_id)&&allowed.some(x=>String(x.name).trim().toLowerCase()===String(t.name).trim().toLowerCase()&&String(x.outlet).trim().toLowerCase()===String(t.outlet||'').trim().toLowerCase())).map(t=>'<option value="'+t.user_id+'" data-hunter-outlet="'+esc(t.outlet||'')+'">'+esc(t.name)+'</option>').join('');
 const isMgmt=!!profile?.is_management;const hunterOptions=hunters;
 $('mt').textContent='📦 Barang Masuk';
 $('mb').innerHTML=(isMgmt?'<label>Barang Masuk Ke</label><select id="stoutlet" onchange="filterHunterOptions()">'+[...new Set(inventoryStock.map(s=>s.outlet).filter(Boolean).concat(['Majesty Plaza iPhone','Majesty Refill Phone']))].sort().map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>':'<div class="small" style="margin-bottom:8px">📍 Barang masuk ke: <b>'+esc(profile?.outlet||'-')+'</b></div>')+
 '<label>Produk</label><input id="stprodsearch" placeholder="Cari: iPhone 15 / second / new / pusat / warna..." oninput="filterReceiveProducts()"><select id="stprod" onchange="toggleReceiveFields()">'+products+'</select>'+
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
async function openEditStock(id){if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');const s=inventoryStock.find(x=>x.id===id);if(!s)return;const c=s.category;let f=`<div class="small">${esc(s.product)} • IMEI 1: ${esc(s.imei_1||'-')}</div>`;if(c==='IPHONE_SECOND')f+=`<label>Grade</label><select id="esgrade"><option value="-">-</option><option ${s.grade==='A'?'selected':''}>A</option><option ${s.grade==='B'?'selected':''}>B</option><option ${s.grade==='C'?'selected':''}>C</option></select><label>Kondisi</label><input id="escondition" value="${esc(s.condition||'')}"><label>Battery Health</label><input id="esbh" type="number" min="0" max="100" value="${s.battery_health??''}"><label>Kelengkapan</label><input id="escomplete" value="${esc(s.completeness||'')}"><label>Minus</label><textarea id="esminus">${esc(s.minus||'')}</textarea>`;else if(c==='ANDROID_SECOND')f+=`<label>Warna</label><input id="escolor" value="${esc(s.color||'')}"><label>Kondisi</label><input id="escondition" value="${esc(s.condition||'')}"><label>Kelengkapan</label><input id="escomplete" value="${esc(s.completeness||'')}"><label>Minus</label><textarea id="esminus">${esc(s.minus||'')}</textarea>`;else if(c==='ANDROID_NEW')f+=`<label>Warna</label><input id="escolor" value="${esc(s.color||'')}">`;f+=`<label>Harga Jual</label><input id="esprice" type="number" value="${Number(s.asking_price||0)}">${stockPhotoGallery(s,true)}<div class="small" style="margin-top:8px">Maksimal 5 foto • otomatis dikompres ke WebP • target &lt; 1 MB/foto.</div><button class="success" onclick="saveEditStock('${id}')">Simpan</button>`;$('mt').textContent='Edit Stock';$('mb').innerHTML=f;$('modal').classList.remove('hidden')}
async function saveEditStock(id){if(!(profile?.is_management||profile?.role==='CONTENT_CREATOR'))return alert('Akses Management atau Content Creator diperlukan.');const s=inventoryStock.find(x=>x.id===id);if(!s)return;const c=s.category,data={asking_price:Number($('esprice').value||0),updated_at:new Date().toISOString()};if(c==='IPHONE_SECOND'){data.grade=$('esgrade').value||'-';data.condition=$('escondition').value.trim()||null;data.battery_health=$('esbh').value!==''?Number($('esbh').value):null;data.completeness=$('escomplete').value.trim()||null;data.minus=$('esminus').value.trim()||null}else if(c==='ANDROID_SECOND'){data.color=$('escolor').value.trim()||null;data.condition=$('escondition').value.trim()||null;data.completeness=$('escomplete').value.trim()||null;data.minus=$('esminus').value.trim()||null}else if(c==='ANDROID_NEW'){data.color=$('escolor').value.trim()||null}const x=await sb.from('stock_units').update(data).eq('id',id);if(x.error)return alert(x.error.message);closeModal();await renderInventory()}
async function openStockHistory(id){const x=await sb.from('stock_movements').select('*').eq('stock_unit_id',id).order('created_at',{ascending:false});if(x.error)return alert(x.error.message);$('mt').textContent='🧾 Histori Stock';$('mb').innerHTML=(x.data||[]).map(m=>'<div class="lead"><b>'+esc(m.movement_type)+'</b><div class="small">'+new Date(m.created_at).toLocaleString('id-ID')+' • '+esc(m.from_status||'-')+' → '+esc(m.to_status||'-')+'</div><div>'+esc(m.note||'')+'</div></div>').join('')||'<p class="small">Belum ada histori.</p>';$('modal').classList.remove('hidden')}
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