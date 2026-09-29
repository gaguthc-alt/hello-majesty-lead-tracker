/* Hello Majesty Inventory & Hunter */
let inventoryProducts=[], inventoryStock=[], inventoryView='stock';
let hunterDashboard=[];

async function loadInventoryData(){
  const [p,s]=await Promise.all([
    sb.from('product_master').select('*').eq('active',true).order('category').order('product'),
    sb.from(profile?.is_management?'stock_management':'stock_catalog').select('*').order('status').order('received_at',{ascending:false})
  ]);
  if(p.error) throw p.error; if(s.error) throw s.error;
  inventoryProducts=p.data||[]; inventoryStock=s.data||[];
}

async function renderInventory(){
  try{await loadInventoryData();}catch(e){alert(e.message||e);return}
  const host=document.getElementById('inventoryPanel')||document.createElement('div');
  host.id='inventoryPanel';host.className='box';
  const ready=inventoryStock.filter(x=>x.status==='READY').length;
  const sold=inventoryStock.filter(x=>x.status==='SOLD').length;
  const reserved=inventoryStock.filter(x=>x.status==='RESERVED').length;
  const service=inventoryStock.filter(x=>x.status==='SERVICE').length;
  const canManage=!!profile?.is_management;
  host.innerHTML='<div class="row" style="justify-content:space-between;align-items:center"><div><h2 style="margin:0">📦 PRODUCT & STOCK</h2><div class="small">Database produk untuk CS/Sales + kontrol inventory Management</div></div><div class="row"><button class="secondary" onclick="refreshInventory(this)">↻ Refresh</button>'+(canManage?'<button class="secondary" onclick="openProductMaster()">⚙️ Master Produk</button>':'')+'<button class="success" onclick="openReceiveStock()">＋ Barang Masuk</button></div></div>'+
  '<div class="stats" style="margin-top:10px">'+
  invStat('🟢 Ready',ready)+invStat('🔴 Terjual',sold)+invStat('🟡 Reserved',reserved)+invStat('🔧 Service',service)+invStat('📦 Total',inventoryStock.length)+'</div>'+
  '<div class="row" style="margin-top:12px"><button class="'+(inventoryView==='stock'?'':'secondary')+'" id="invStockTab" type="button" data-inventory-view="stock">Stock</button><button class="'+(inventoryView==='products'?'':'secondary')+'" id="invProductsTab" type="button" data-inventory-view="products">Produk</button><button class="secondary" onclick="openSalesReport()">Penjualan</button><button class="secondary" onclick="openHunterDashboard()">🏹 Hunter</button><button class="secondary" onclick="openHunterCommission()">💸 Komisi</button></div>'+
  '<div id="inventoryViewDebug" class="small" style="margin-top:8px;font-weight:700"></div><div id="inventoryBody" style="margin-top:10px"></div>';
  const dash=document.getElementById('dashboard'),stats=document.getElementById('stats');if(!dash.contains(host))dash.insertBefore(host,stats);
  host.onclick=(e)=>{const tab=e.target.closest('[data-inventory-view]');if(tab){e.preventDefault();setInventoryView(tab.dataset.inventoryView)}};
  renderInventoryBody();
}
async function refreshInventory(btn){if(btn?.disabled)return;try{if(btn){btn.disabled=true;btn.textContent='⏳ Loading...';}await renderInventory();}catch(e){console.error(e);alert('Refresh Product & Stock error: '+(e?.message||e));}finally{if(btn){btn.disabled=false;btn.textContent='↻ Refresh';}}}
async function loadHunterDashboard(){
 const r=await sb.from('hunter_dashboard').select('*').order('total_commission',{ascending:false});
 if(r.error) throw r.error; hunterDashboard=r.data||[];
}
function fmtRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID')}
async function markHunterCommissionPaid(id){
 if(!profile?.is_management)return alert('Akses Management diperlukan.');
 const note=prompt('Catatan pembayaran (opsional):')||null;
 const r=await sb.from('sales_transactions').update({hunter_commission_paid_at:new Date().toISOString(),hunter_commission_paid_by:profile.user_id,hunter_commission_payment_note:note}).eq('id',id).is('hunter_commission_paid_at',null);
 if(r.error)return alert(r.error.message);
 openHunterCommission();
}
async function openHunterCommission(){
 const r=await sb.from('sales_transactions').select('id,sold_at,hunter_user_id,hunter_commission,hunter_commission_paid_at,hunter_commission_payment_note,customer_name').not('hunter_user_id','is',null).order('sold_at',{ascending:false});
 if(r.error)return alert(r.error.message);
 const teams=await sb.from('team_directory').select('user_id,name'); const names=Object.fromEntries((teams.data||[]).map(x=>[x.user_id,x.name]));
 const rows=r.data||[];
 $('mt').textContent='💸 Komisi Hunter';
 $('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi 10% dari profit unit Hunter yang SOLD. Pembayaran hanya dapat diubah oleh Management.</div>'+
 rows.map(x=>'<div class="lead"><b>🏹 '+esc(names[x.hunter_user_id]||'Unknown')+'</b><div>'+new Date(x.sold_at).toLocaleDateString('id-ID')+' • Komisi <b>'+fmtRp(x.hunter_commission)+'</b></div><div class="small">'+(x.hunter_commission_paid_at?'🟢 Dibayar '+new Date(x.hunter_commission_paid_at).toLocaleDateString('id-ID'):'🟡 Belum dibayar')+'</div>'+((profile?.is_management&&!x.hunter_commission_paid_at)?'<button class="success" style="margin-top:6px" onclick="markHunterCommissionPaid(\''+x.id+'\')">✓ Tandai Sudah Dibayar</button>':'')+'</div>').join('')||'<p class="small">Belum ada transaksi komisi Hunter.</p>';
 $('modal').classList.remove('hidden');
}
async function openHunterDashboard(){
 try{await loadHunterDashboard();}catch(e){alert(e.message||e);return}
 $('mt').textContent='🏹 Dashboard Hunter';
 $('mb').innerHTML='<div class="small" style="margin-bottom:10px">Komisi = 10% dari profit unit Hunter yang sudah SOLD.</div>'+
 hunterDashboard.map(h=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>🏹 '+esc(h.hunter_name)+'</b><span class="badge">'+h.sold_units+' SOLD</span></div>'+
 '<div style="margin-top:8px">📦 Total unit: <b>'+h.total_units+'</b> • 🟢 Ready: <b>'+h.ready_units+'</b> • 🔴 Sold: <b>'+h.sold_units+'</b></div>'+
 '<div style="margin-top:5px">💰 Profit: <b>'+fmtRp(h.total_profit)+'</b> • 🎯 Komisi: <b>'+fmtRp(h.total_commission)+'</b></div></div>').join('')||'<p class="small">Belum ada stock Hunter.</p>';
 $('modal').classList.remove('hidden');
}
function invStat(label,val){return '<div class="stat"><div class="small">'+label+'</div><div class="num">'+Number(val||0).toLocaleString('id-ID')+'</div></div>'}
function setInventoryView(view){
  inventoryView=view;
  renderInventoryBody();
  const dbg=document.getElementById('inventoryViewDebug');if(dbg)dbg.textContent='Mode: '+(view==='products'?'PRODUK':'STOCK');
  const panel=document.getElementById('inventoryPanel');
  if(panel){
    const buttons=panel.querySelectorAll('.row button');
    buttons.forEach(b=>{
      if(b.textContent.trim()==='Stock' || b.textContent.trim()==='Produk'){
        b.classList.toggle('secondary',b.textContent.trim().toLowerCase()!==view);
      }
    });
  }
}
function renderInventoryBody(){
 const body=document.getElementById('inventoryBody');if(!body)return;
 if(inventoryView==='products'){
   body.innerHTML='<div class="row"><select id="invCat" onchange="renderInventoryBody()"><option value="">Semua Kategori</option><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option></select><input id="invSearch" placeholder="Cari produk / varian / warna" oninput="renderInventoryBody()"></div>'+
   '<div style="margin-top:10px">'+inventoryProducts.filter(p=>(!$('invCat')?.value||p.category===$('invCat').value)&&(!$('invSearch')?.value||[p.product,p.variant,p.color].join(' ').toLowerCase().includes($('invSearch').value.toLowerCase()))).map(p=>'<div class="lead"><b>'+esc(p.product)+'</b><div class="small">'+invCategory(p.category)+' • '+esc(p.variant||'-')+' • '+esc(p.color||'-')+'</div></div>').join('')+'</div>';
   return;
 }
 const q=($('stockSearch')?.value||'').toLowerCase(), st=$('stockStatus')?.value||'READY';
 const rows=inventoryStock.filter(s=>(!st||s.status===st)&&(!q||[s.product,s.variant,s.color,s.imei_1,s.imei_2,s.grade,s.condition,s.hunter_name].join(' ').toLowerCase().includes(q)));
 body.innerHTML='<div class="row"><input id="stockSearch" placeholder="Cari produk, IMEI, grade, warna, hunter..." value="'+esc(q)+'" oninput="renderInventoryBody()"><select id="stockStatus" onchange="renderInventoryBody()"><option value="">Semua Status</option><option>READY</option><option>RESERVED</option><option>SOLD</option><option>SERVICE</option><option>RETURN</option></select></div>'+
 '<div style="margin-top:10px">'+(rows.map(stockCard).join('')||'<p class="small">Belum ada stock.</p>')+'</div>';
 if($('stockStatus'))$('stockStatus').value=st;
}
function productShareText(s){
 return '📱 '+[s.product,s.variant,s.color].filter(Boolean).join(' • ')+'\\n'+
 'Grade: '+(s.grade||'-')+'\\nKondisi: '+(s.condition||'-')+'\\n'+
 (s.battery_health!=null?'Battery Health: '+s.battery_health+'%\\n':'')+
 'Kelengkapan: '+(s.completeness||'-')+'\\nMinus: '+(s.minus||'Tidak ada info')+
 '\\nHarga: Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+'\\nStatus: READY\\n\\nHello Majesty';
}
function shareProduct(s){
 const text=productShareText(s);
 if(navigator.share){navigator.share({text}).catch(()=>{})}
 else {navigator.clipboard?.writeText(text);alert('Info produk sudah disalin. Silakan paste ke WhatsApp customer.');}
}
function openProductDetail(id){
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 $('mt').textContent='📱 Detail Produk';
 $('mb').innerHTML='<div class="box"><h2 style="margin:0">'+esc([s.product,s.variant,s.color].filter(Boolean).join(' • '))+'</h2><div class="small">'+invCategory(s.category)+' • '+esc(s.status)+'</div></div>'+
 '<div class="lead"><b>Grade:</b> '+esc(s.grade||'-')+'<br><b>Kondisi:</b> '+esc(s.condition||'-')+'<br><b>Battery Health:</b> '+(s.battery_health!=null?s.battery_health+'%':'-')+'<br><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'<br><b>Minus:</b> '+esc(s.minus||'-')+'<br><b>Harga:</b> Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+'<br><b>IMEI:</b> '+esc(s.imei_1||'-')+'</div>'+
 '<div class="row"><button class="success" onclick="shareProduct(inventoryStock.find(x=>x.id===\''+id+'\'))">📤 Kirim Info Customer</button>'+(profile?.role==='SALES'&&s.status==='READY'?'<button class="success" onclick="closeModal();openSellStock(\''+id+'\')">💰 Closing</button>':'')+'</div>';
 $('modal').classList.remove('hidden');
}
function invCategory(c){return ({IPHONE_NEW:'iPhone New',IPHONE_SECOND:'iPhone Second',ANDROID_NEW:'Android New',ANDROID_SECOND:'Android Second'})[c]||c}
function stockCard(s){
 const management=!!profile?.is_management,ready=s.status==='READY', sales=profile?.role==='SALES';
 const title=s.product+(s.variant?' '+s.variant:'')+(s.color?' • '+s.color:'');
 return '<div class="lead"><div class="row" style="justify-content:space-between"><h3 style="margin:0">'+esc(title)+'</h3><span class="badge">'+esc(s.status)+'</span></div>'+
 '<div class="small">'+invCategory(s.category)+' • '+(s.grade?'Grade '+esc(s.grade)+' • ':'')+(s.condition?esc(s.condition)+' • ':'')+(s.battery_health!=null?'BH '+s.battery_health+'% • ':'')+'IMEI '+esc(s.imei_1||'-')+'</div>'+
 '<div style="margin-top:8px"><b>Kelengkapan:</b> '+esc(s.completeness||'-')+'<br><b>Minus:</b> '+esc(s.minus||'-')+'<br><b>Harga:</b> Rp'+Number(s.asking_price||0).toLocaleString('id-ID')+'</div>'+
 '<div class="small" style="margin-top:6px">Sumber: '+(s.source_type==='HUNTER'?'🏹 Hunter — '+esc(s.hunter_name||'-'):'🏢 Management')+(s.status==='SOLD'?' • Terjual '+new Date(s.sold_at).toLocaleDateString('id-ID'):'')+'</div>'+
 (management?'<div class="small" style="margin-top:6px">Modal: Rp'+Number(s.cost||0).toLocaleString('id-ID')+' • Harga jual: Rp'+Number(s.sold_price||0).toLocaleString('id-ID')+'</div>':'')+
 '<div class="row" style="margin-top:8px"><button class="secondary" onclick="openProductDetail(\''+s.id+'\')">👁️ Detail</button><button class="secondary" onclick="openStockHistory(\'${s.id}\')">🧾 Histori</button>'+(ready&&sales?'<button class="success" onclick="openSellStock(\''+s.id+'\')">💰 Jual / Closing</button>':'')+(management?'<button class="secondary" onclick="openEditStock(\''+s.id+'\')">Edit</button>':'')+'</div></div>';
}
function openProductMaster(){
 $('mt').textContent='⚙️ Master Produk';$('mb').innerHTML='<button class="success" onclick="openAddProduct()">＋ Tambah Produk</button><div style="margin-top:10px">'+inventoryProducts.map(p=>'<div class="lead"><b>'+esc(p.product)+'</b><div class="small">'+invCategory(p.category)+' • '+esc(p.variant||'-')+' • '+esc(p.color||'-')+'</div></div>').join('')+'</div>';$('modal').classList.remove('hidden');
}
function openAddProduct(){
 $('mt').textContent='＋ Master Produk';$('mb').innerHTML='<label>Kategori</label><select id="pmcat"><option value="IPHONE_NEW">iPhone New</option><option value="IPHONE_SECOND">iPhone Second</option><option value="ANDROID_NEW">Android New</option><option value="ANDROID_SECOND">Android Second</option></select><label>Produk</label><input id="pmprod" placeholder="Contoh: iPhone 17 Pro Max"><label>Varian</label><input id="pmvar" placeholder="256GB"><label>Warna</label><input id="pmcolor" placeholder="Black"><button class="success" onclick="saveProduct()">Simpan Produk</button>';$('modal').classList.remove('hidden');
}
async function saveProduct(){
 const x=await sb.from('product_master').insert({category:$('pmcat').value,product:$('pmprod').value.trim(),variant:$('pmvar').value.trim()||null,color:$('pmcolor').value.trim()||null});
 if(x.error)return alert(x.error.message);closeModal();await renderInventory();openProductMaster();
}
async function openReceiveStock(){
 const teams=await sb.from('team_directory').select('*').order('name');if(teams.error)return alert(teams.error.message);
 const products=inventoryProducts.map(p=>'<option value="'+p.id+'">'+esc(p.product+(p.variant?' '+p.variant:'')+(p.color?' • '+p.color:''))+'</option>').join('');
 const hunters=(teams.data||[]).map(t=>'<option value="'+t.user_id+'">'+esc(t.name)+(t.role?' • '+esc(t.role):'')+'</option>').join('');
 const isMgmt=!!profile?.is_management; const hunterOptions=isMgmt?hunters:'<option value="'+profile.user_id+'">'+esc(profile.name||'Saya')+' • Hunter</option>';
 $('mt').textContent='📦 Barang Masuk';$('mb').innerHTML='<label>Produk</label><select id="stprod">'+products+'</select><label>Sumber</label><select id="stsource"><option value="MANAGEMENT">Management</option><option value="HUNTER">Hunter</option></select><div id="hunterBox" class="hidden"><label>Hunter</label><select id="sthunter" '+(isMgmt?'':'disabled')+'>'+hunterOptions+'</select></div><label>IMEI 1</label><input id="stimei1"><label>IMEI 2 (opsional)</label><input id="stimei2"><label>Grade (untuk second)</label><select id="stgrade"><option value="">—</option><option>A</option><option>B</option><option>C</option></select><label>Kondisi</label><input id="stcondition" placeholder="Contoh: 95% / Mulus"><label>Battery Health</label><input id="stbh" type="number" min="0" max="100" placeholder="89"><label>Kelengkapan</label><input id="stcomplete" placeholder="Unit + Box + Cable"><label>Minus</label><textarea id="stminus"></textarea><label>Harga Modal</label><input id="stcost" type="number"><label>Harga Jual</label><input id="stprice" type="number"><label>Referensi Barang Masuk</label><input id="stref" placeholder="Invoice / nota / kode hunter"><label>Catatan</label><textarea id="stnotes"></textarea><button class="success" onclick="saveStock()">Simpan Stock Ready</button>';
 $('stsource').onchange=()=>{ $('hunterBox').classList.toggle('hidden',$('stsource').value!=='HUNTER')};$('modal').classList.remove('hidden');
}
async function saveStock(){
 const source=$('stsource').value,hunter=source==='HUNTER'?$('sthunter').value:null;
 if(source==='HUNTER'&&!hunter)return alert('Hunter wajib dipilih.');
 const data={product_id:$('stprod').value,imei_1:$('stimei1').value.trim()||null,imei_2:$('stimei2').value.trim()||null,grade:$('stgrade').value||null,condition:$('stcondition').value.trim()||null,battery_health:$('stbh').value?Number($('stbh').value):null,completeness:$('stcomplete').value.trim()||null,minus:$('stminus').value.trim()||null,source_type:source,hunter_user_id:hunter,cost:Number($('stcost').value||0),asking_price:Number($('stprice').value||0),notes:$('stnotes').value.trim()||null,receipt_ref:$('stref')?.value.trim()||null,received_source_note:source==='HUNTER'?'Hunter':'Management',outlet:profile?.outlet||null};
 if(source==='HUNTER'&&!profile.is_management){data.hunter_user_id=profile.user_id}
 const x=await sb.from('stock_units').insert(data);if(x.error)return alert(x.error.message);closeModal();await renderInventory();
}
async function openSellStock(id){
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 $('mt').textContent='💰 Closing — '+s.product;$('mb').innerHTML='<div class="box"><b>'+esc(s.product)+' '+esc(s.variant||'')+'</b><div class="small">IMEI '+esc(s.imei_1||'-')+' • '+(s.grade?'Grade '+s.grade+' • ':'')+(s.battery_health!=null?'BH '+s.battery_health+'%':'')+'</div></div><label>Sumber Customer</label><select id="saleSource"><option value="DIGITAL">📱 DIGITAL — dari funnel</option><option value="WALK-IN">🚶 WALK-IN — datang langsung</option></select><label>Harga Jual</label><input id="salePrice" type="number" value="'+Number(s.asking_price||0)+'"><label>Diskon</label><input id="saleDiscount" type="number" value="0"><label>Nama Customer (opsional)</label><input id="saleCustomer"><label>WhatsApp Customer (opsional)</label><input id="salePhone"><label>Catatan</label><textarea id="saleNotes"></textarea><button class="success" onclick="saveSale(\''+id+'\')">✓ Closing & Kurangi Stock</button>';$('modal').classList.remove('hidden');
}
async function saveSale(id){
 const s=inventoryStock.find(x=>x.id===id),price=Number($('salePrice').value||0),discount=Number($('saleDiscount').value||0),customerSource=$('saleSource')?.value||'DIGITAL';
 if(!s||price<=0)return alert('Harga jual wajib diisi.');
 const gross=Math.max(price-discount-Number(s.cost||0),0),commission=s.source_type==='HUNTER'?gross*.10:0;
 const stock=await sb.from('stock_units').update({status:'SOLD',sold_at:new Date().toISOString(),sold_price:price,sold_by_user_id:profile.user_id,updated_at:new Date().toISOString()}).eq('id',id).eq('status','READY').select('id');
 if(stock.error)return alert(stock.error.message);
 if(!stock.data?.length)return alert('Unit sudah berubah status. Refresh stock lalu coba lagi.');
 const tx=await sb.from('sales_transactions').insert({stock_unit_id:id,outlet:profile.outlet,sales_user_id:profile.user_id,sale_price:price,discount,cost:Number(s.cost||0),hunter_user_id:s.source_type==='HUNTER'?s.hunter_user_id:null,customer_name:$('saleCustomer').value.trim()||null,customer_phone:$('salePhone').value.trim()||null,customer_source:customerSource,notes:$('saleNotes').value.trim()||null});
 if(tx.error){
   await sb.from('stock_units').update({status:'READY',sold_at:null,sold_price:null,sold_by_user_id:null}).eq('id',id);
   return alert(tx.error.message);
 }
 closeModal();await renderInventory();alert('Closing berhasil.\nLaba kotor: Rp'+gross.toLocaleString('id-ID')+'\nKomisi Hunter: Rp'+commission.toLocaleString('id-ID'));
}
async function openEditStock(id){
 const s=inventoryStock.find(x=>x.id===id);if(!s)return;
 $('mt').textContent='Edit Stock';$('mb').innerHTML='<div class="small">'+esc(s.product)+' • IMEI '+esc(s.imei_1||'-')+'</div><label>Grade</label><select id="esgrade"><option value="">—</option><option '+(s.grade==='A'?'selected':'')+'>A</option><option '+(s.grade==='B'?'selected':'')+'>B</option><option '+(s.grade==='C'?'selected':'')+'>C</option></select><label>Kondisi</label><input id="escondition" value="'+esc(s.condition||'')+'"><label>Battery Health</label><input id="esbh" type="number" value="'+(s.battery_health??'')+'"><label>Kelengkapan</label><input id="escomplete" value="'+esc(s.completeness||'')+'"><label>Minus</label><textarea id="esminus">'+esc(s.minus||'')+'</textarea><label>Harga Jual</label><input id="esprice" type="number" value="'+Number(s.asking_price||0)+'"><button class="success" onclick="saveEditStock(\''+id+'\')">Simpan</button>';$('modal').classList.remove('hidden');
}
async function saveEditStock(id){
 const x=await sb.from('stock_units').update({grade:$('esgrade').value||null,condition:$('escondition').value.trim()||null,battery_health:$('esbh').value?Number($('esbh').value):null,completeness:$('escomplete').value.trim()||null,minus:$('esminus').value.trim()||null,asking_price:Number($('esprice').value||0),updated_at:new Date().toISOString()}).eq('id',id);
 if(x.error)return alert(x.error.message);closeModal();await renderInventory();
}
async function openStockHistory(id){
 const x=await sb.from('stock_movements').select('*').eq('stock_unit_id',id).order('created_at',{ascending:false});
 if(x.error)return alert(x.error.message);
 $('mt').textContent='🧾 Histori Stock';
 $('mb').innerHTML=(x.data||[]).map(m=>'<div class="lead"><b>'+esc(m.movement_type)+'</b><div class="small">'+new Date(m.created_at).toLocaleString('id-ID')+' • '+esc(m.from_status||'-')+' → '+esc(m.to_status||'-')+'</div><div>'+esc(m.note||'')+'</div></div>').join('')||'<p class="small">Belum ada histori.</p>';
 $('modal').classList.remove('hidden');
}
async function openSalesReport(){
 const x=await sb.from('sales_transactions').select('*').order('sold_at',{ascending:false});if(x.error)return alert(x.error.message);
 const rows=x.data||[];const total=rows.reduce((a,r)=>a+Number(r.sale_price-r.discount),0),profit=rows.reduce((a,r)=>a+Number(r.gross_profit),0),comm=rows.reduce((a,r)=>a+Number(r.hunter_commission),0);
 $('mt').textContent='📊 Laporan Penjualan';$('mb').innerHTML='<div class="stats">'+invStat('Omzet',total)+invStat('Laba',profit)+invStat('Komisi Hunter',comm)+'</div>'+rows.map(r=>'<div class="lead"><b>'+new Date(r.sold_at).toLocaleDateString('id-ID')+'</b><div class="small">Sumber: '+(r.customer_source==='WALK-IN'?'🚶 WALK-IN':'📱 DIGITAL')+' • Sales: '+esc(r.sales_user_id||'-')+' • Hunter: '+esc(r.hunter_user_id||'-')+'</div><div>Jual Rp'+Number(r.sale_price-r.discount).toLocaleString('id-ID')+' • Laba Rp'+Number(r.gross_profit).toLocaleString('id-ID')+' • Komisi Rp'+Number(r.hunter_commission).toLocaleString('id-ID')+'</div></div>').join('')||'<p class="small">Belum ada penjualan.</p>';$('modal').classList.remove('hidden');
}
