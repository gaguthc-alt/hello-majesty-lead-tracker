(function(){
function hmRp(v){const n=Number(v||0);return 'Rp'+(Number.isFinite(n)?Math.round(n):0).toLocaleString('id-ID');}
function hmFinNum(v){return 'font-size:clamp(18px,5.5vw,24px);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'}
window.hmRp=hmRp;
window.hmDateRange=hmDateRange;
function hmDateRange(mode){const d=new Date(),iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};if(mode==='today'){const s=new Date(d.getFullYear(),d.getMonth(),d.getDate());return[iso(s),iso(s)];}if(mode==='year')return[d.getFullYear()+'-01-01',d.getFullYear()+'-12-31'];return[iso(new Date(d.getFullYear(),d.getMonth(),1)),iso(new Date(d.getFullYear(),d.getMonth()+1,0))];}
window.hmEnsureCellReportStyles=window.hmEnsureCellReportStyles||function(){if(document.getElementById('hmCellReportStyles'))return;const s=document.createElement('style');s.id='hmCellReportStyles';s.textContent='.cell-report-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.cell-report-actions button{flex:1;min-width:110px}.cell-report-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin:10px 0}.cell-report-filters label{font-size:12px;font-weight:700;color:#334155;min-width:0}.cell-report-filters input,.cell-report-filters select{margin-top:5px;min-height:42px;background:#fff}.cell-report-filters .cell-report-outlet{grid-column:1/-1}.cell-report-body>.box{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#fff;box-shadow:0 4px 14px #0f172a0a}.cell-report-body h3{margin:0 0 12px;font-size:17px}.cell-report-body .fin-card{min-width:0;border-radius:14px;background:linear-gradient(145deg,#f8fbff,#edf4ff);border:1px solid #dbeafe}.cell-report-body .lead{border-radius:13px;border:1px solid #e5e7eb;padding:12px;margin:8px 0;overflow-wrap:anywhere}.cell-report-body .fin-summary-line{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 0;margin-bottom:8px;border-bottom:1px solid #e5e7eb}.cell-report-body details summary{padding:10px;background:#eff6ff;border-radius:10px}.cell-report-body .small{line-height:1.45}@media(max-width:520px){.cell-report-filters{grid-template-columns:1fr}.cell-report-filters .cell-report-outlet{grid-column:auto}.cell-report-body .fin-grid{grid-template-columns:1fr!important}.cell-report-body .fin-card{display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important}.cell-report-body .fin-card .small:last-child{grid-column:1/-1}}';document.head.appendChild(s);};
window.openCellFinanceReport=async function(){window.hmEnsureCellReportStyles();
  const gp=(typeof profile!=='undefined'&&profile&&typeof profile==='object')?profile:{},wp=window.profile&&typeof window.profile==='object'?window.profile:{},p={...gp,...wp};
  const role=String(wp.role||gp.role||p.team_role||p.position||'').trim().toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  const outlet=String(wp.outlet||gp.outlet||'').trim().toUpperCase();
  const isManagement=!!(wp.is_management||gp.is_management);
  const userName=String(wp.name||gp.name||p.full_name||'').trim().toLowerCase();
  // Pembatasan outlet khusus: Ifa hanya Plaza, Saka hanya Refill.
  const forcedFinanceOutlet=userName==='ifa'?'Majesty Plaza iPhone':userName==='saka'?'Majesty Refill Phone':null;
  const isCellStockist=role.includes('STOCKIST') && (!outlet || outlet==='MAJESTY CELL');
  const isCellFinance=role==='ADMIN FINANCE MAJESTY CELL';
  const isFacilitator=role==='FASILITATOR';
  if(!isManagement && !isCellStockist && !isCellFinance && !isFacilitator){alert('Akses laporan tidak diizinkan. Role terbaca: '+(role||'kosong')+' • Outlet: '+(outlet||'kosong')+'.');return;}
  const m=document.getElementById('modal');
  const inlinePanel=document.getElementById('hmMenuPanel'),inlineBody=document.getElementById('hmMenuPanelBody'),inlineTitle=document.getElementById('hmMenuPanelTitle');
  // Laporan Finance Cell selalu dibuka inline di bawah Menu Utama.
  // Modal lama ditutup agar tidak pernah muncul bersamaan dengan panel inline.
  if(m){m.classList.add('hidden');m.style.display='none';}
  if(!inlinePanel||!inlineBody)return;
  const target=inlineBody;
  if(inlineTitle)inlineTitle.textContent='📊 Laporan Finance Majesty Cell';
  inlinePanel.classList.remove('hidden');
  const d=new Date(),start=new Date(d.getFullYear(),d.getMonth(),1),end=d;
  const iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};
  const displayDate=x=>iso(x);
  target.innerHTML='<div class="cell-report-actions"><button class="secondary" type="button" onclick="hmCloseMainMenu()">✖ Tutup</button><button class="primary" type="button" onclick="window.loadCellFinanceReport()">🔄 Refresh</button></div>'+
    '<div class="cell-report-filters" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;padding:14px;border:1px solid #dbe3ef;border-radius:16px;background:#f8fafc;margin:10px 0">'+
    '<label>Periode Dari<input id="cellReportStart" type="date" value="'+displayDate(start)+'" autocomplete="off" style="width:100%;box-sizing:border-box"></label>'+
    '<label>Periode Sampai<input id="cellReportEnd" type="date" value="'+displayDate(end)+'" autocomplete="off" style="width:100%;box-sizing:border-box"></label>'+
    '<label>Outlet<select id="cellReportOutlet" '+(forcedFinanceOutlet?'disabled aria-label="Outlet sesuai akun"':'')+' style="width:100%;box-sizing:border-box">'+(forcedFinanceOutlet?'<option value="'+forcedFinanceOutlet+'" selected>'+forcedFinanceOutlet+'</option>':'<option value="ALL">Semua Outlet Cell</option><option value="Majesty Refill Phone">Majesty Refill Phone</option><option value="Majesty Plaza iPhone">Majesty Plaza iPhone</option>')+'</select></label>'+
    '<label>Kategori<select id="cellReportCategory" style="width:100%;box-sizing:border-box"><option value="ALL">Semua Kategori</option><option>iPhone New</option><option>iPhone Second</option><option>Android New</option><option>Android Second</option></select></label>'+
    '<label>Produk<input id="cellReportProduct" type="search" placeholder="Cari nama produk..." style="width:100%;box-sizing:border-box"></label>'+
    '<label>IMEI<input id="cellReportImei" type="search" inputmode="numeric" placeholder="Cari IMEI..." style="width:100%;box-sizing:border-box"></label>'+
    '<label>Status<select id="cellReportStatus" style="width:100%;box-sizing:border-box"><option value="ALL">Semua Status</option><option value="READY">READY</option><option value="SOLD">SOLD</option><option value="RETURN">RETURN</option></select></label>'+
    '<div style="display:flex;gap:8px;align-items:end"><button type="button" class="secondary" onclick="window.resetCellFinanceFilters()" style="flex:1">↺ Reset</button><button type="button" class="primary" onclick="window.loadCellFinanceReport()" style="flex:1">🔎 Tampilkan</button></div></div>'+
    '<div class="small" style="margin-top:6px">Pilih tanggal melalui kalender • Filter diterapkan pada ringkasan dan rincian stok/penjualan yang terkait.</div><div id="cellFinanceReportBody" class="cell-report-body">Memuat...</div>';
  await window.loadCellFinanceReport();
};
window.resetCellFinanceFilters=function(){
  const d=new Date(),start=new Date(d.getFullYear(),d.getMonth(),1);
  const fmt=x=>String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear();
  const cp=window.profile||{},un=String(cp.name||'').trim().toLowerCase(),forced=un==='ifa'?'Majesty Plaza iPhone':un==='saka'?'Majesty Refill Phone':null;
  const a=document.getElementById('cellReportStart'),b=document.getElementById('cellReportEnd'),o=document.getElementById('cellReportOutlet'),c=document.getElementById('cellReportCategory'),p=document.getElementById('cellReportProduct'),i=document.getElementById('cellReportImei'),s=document.getElementById('cellReportStatus');
  if(a)a.value=fmt(start);if(b)b.value=fmt(d);if(o)o.value=forced||'ALL';if(c)c.value='ALL';if(p)p.value='';if(i)i.value='';if(s)s.value='ALL';
  window.loadCellFinanceReport();
};
window.loadCellFinanceReport=async function(){
  const box=document.getElementById('cellFinanceReportBody'),sb=window.sb;if(!box||!sb)return;
  const parseDate=value=>{const v=String(value||'').trim();let m=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m){const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]),d=new Date(year,month-1,day);if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day)return null;return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?v:null;};
  const startInput=document.getElementById('cellReportStart')?.value,endInput=document.getElementById('cellReportEnd')?.value;
  const currentFinanceProfile=window.profile||{},currentFinanceName=String(currentFinanceProfile.name||'').trim().toLowerCase();
  const forcedFinanceOutlet=currentFinanceName==='ifa'?'Majesty Plaza iPhone':currentFinanceName==='saka'?'Majesty Refill Phone':null;
  // Terapkan pembatasan saat membaca data, bukan hanya menyembunyikan pilihan UI.
  const outlet=forcedFinanceOutlet||(document.getElementById('cellReportOutlet')?.value||'ALL');
  const categoryFilter=document.getElementById('cellReportCategory')?.value||'ALL',productFilter=String(document.getElementById('cellReportProduct')?.value||'').trim().toLowerCase(),imeiFilter=String(document.getElementById('cellReportImei')?.value||'').trim().toLowerCase(),statusFilter=document.getElementById('cellReportStatus')?.value||'ALL';
  const start=parseDate(startInput),end=parseDate(endInput);
  if(!start||!end){box.innerHTML='<div class="danger box">Format tanggal harus DD/MM/YYYY, contoh 01/10/2026.</div>';return;}
  if(start>end){box.innerHTML='<div class="danger box">Tanggal Dari tidak boleh melewati tanggal Sampai.</div>';return;}
  box.innerHTML='<div class="small">Memuat laporan Majesty Cell...</div>';
  const cellProfile=window.profile||{},cellRole=String(cellProfile.role||'').trim().toUpperCase().replace(/_/g,' '),isStockistPartner=!cellProfile.is_management&&(cellRole.includes('STOCKIST')||cellRole.startsWith('ADMIN FINANCE MAJESTY CELL')),isProfitShareMasked=isStockistPartner||(String(cellProfile.name||'').trim().toLowerCase()==='saka'||cellRole==='FASILITATOR');
  const outletFilter=outlet==='ALL'?null:outlet;
  const [stockRep,salesRep,receiptRep,historicalRep,settRep,productsRep,settItemsRep]=await Promise.all([
    sb.from('stock_units').select('*').eq('partner_name','Majesty Cell'),
    sb.from('sales_transactions').select('*').gte('sold_at',start+'T00:00:00').lte('sold_at',end+'T23:59:59'),
    sb.from('inventory_receive_approvals').select('*').gte('requested_at',start+'T00:00:00').lte('requested_at',end+'T23:59:59'),
    sb.from('partner_historical_stock_details').select('*').eq('partner_name','Majesty Cell'),
    sb.from('partner_settlements').select('*').eq('partner_name','Majesty Cell'),
    sb.from('product_master').select('*'),
     sb.from('partner_settlement_items').select('settlement_id,stock_unit_id,sales_transaction_id')
  ]);
  const err=[stockRep,salesRep,receiptRep,historicalRep,settRep,productsRep,settItemsRep].find(x=>x.error);
  if(err){box.innerHTML='<div class="danger box">Gagal memuat laporan Majesty Cell: '+esc(err.error.message||'kesalahan query')+'</div>';return;}
  const productMap=new Map((productsRep.data||[]).map(p=>[String(p.id),p])),formatVariant=value=>{const v=String(value||'').trim();if(!v)return '';return /^\d{2,4}$/.test(v)?v+'GB':v.replace(/\s*GB\b/gi,'GB');},allStock=(stockRep.data||[]).map(x=>{const master=productMap.get(String(x.product_id))||{};return {...x,product:master.product||x.product_name||'Produk tidak ditemukan',master_variant:master.variant,variant:[formatVariant(master.variant),x.color].filter(Boolean).map(v=>String(v).trim()).filter((v,i,a)=>a.indexOf(v)===i).join(' • ')};}),stockDetail=allStock.filter(x=>{
    if(outletFilter&&x.outlet!==outletFilter)return false;
    const master=productMap.get(String(x.product_id))||{},category=String(master.category||x.category||'').trim();
    if(categoryFilter!=='ALL'&&category.toLowerCase()!==categoryFilter.toLowerCase())return false;
    if(productFilter&&!String(x.product||'').toLowerCase().includes(productFilter)&&!String(x.variant||'').toLowerCase().includes(productFilter))return false;
    if(imeiFilter&&!String(x.imei_1||'').toLowerCase().includes(imeiFilter)&&!String(x.imei_2||'').toLowerCase().includes(imeiFilter))return false;
    if(statusFilter!=='ALL'&&String(x.status||'').toUpperCase()!==statusFilter)return false;
    return true;
  }),stockIds=new Set(stockDetail.map(x=>String(x.id)));
  const receivedSettlementIds=new Set((settRep.data||[]).filter(x=>['RECEIVED','PAID','COMPLETED'].includes(String(x.status||'').toUpperCase())).map(x=>String(x.id))),settledStockIds=new Set((settItemsRep.data||[]).filter(i=>receivedSettlementIds.has(String(i.settlement_id))).map(i=>String(i.stock_unit_id)).filter(Boolean)),settledSalesIds=new Set((settItemsRep.data||[]).filter(i=>receivedSettlementIds.has(String(i.settlement_id))).map(i=>String(i.sales_transaction_id)).filter(Boolean)); const allSales=salesRep.data||[],sales=allSales.filter(x=>stockIds.has(String(x.stock_unit_id))),allReceipts=receiptRep.data||[],receiptIds=new Set(allReceipts.map(x=>String(x.stock_unit_id))),rows=stockDetail.filter(x=>receiptIds.has(String(x.id))).map(x=>{const a=allReceipts.find(y=>String(y.stock_unit_id)===String(x.id))||{};return {...x,requested_at:a.requested_at,status:a.status,requester:a.requested_by,reviewer:a.reviewed_by,review_note:a.review_note};});
  const historicalSales=(historicalRep.data||[]).filter(x=>x.sold_status==='SOLD'&&(!outletFilter||x.outlet===outletFilter)&&new Date(x.sold_at||x.settled_at||x.created_at)>=new Date(start+'T00:00:00')&&new Date(x.sold_at||x.settled_at||x.created_at)<=new Date(end+'T23:59:59')).map(x=>({product:x.product_name,storage_gb:x.storage_gb,color:x.color,condition:x.condition||x.grade||'SECOND',variant:[x.storage_gb,x.color].filter(Boolean).join(' '),sold_at:x.sold_at||x.settled_at||x.created_at,capital_due:x.cost,sale_price:Number(x.sale_price||0)}));
  const historicalDue=(historicalRep.data||[]).filter(x=>x.sold_status==='SOLD'&&!x.settlement_id&&(!outletFilter||x.outlet===outletFilter)&&new Date(x.sold_at||x.settled_at||x.created_at)>=new Date(start+'T00:00:00')&&new Date(x.sold_at||x.settled_at||x.created_at)<=new Date(end+'T23:59:59')).map(x=>({product:x.product_name,storage_gb:x.storage_gb||null,color:x.color||null,condition:x.condition||x.grade||(/\bNEW\b/i.test(x.product_name||'')?'NEW':'SECOND'),variant:[x.storage_gb,x.color].filter(Boolean).join(' '),sold_at:x.sold_at||x.settled_at||x.created_at,capital_due:x.cost,imei:x.imei})).sort((a,b)=>new Date(b.sold_at||0)-new Date(a.sold_at||0));
  const d={outlet_filter:outlet,receipts:rows.map(x=>({...x,product:(productMap.get(String(x.product_id))||{}).product||x.product_name||'Produk tidak ditemukan',variant:[formatVariant((productMap.get(String(x.product_id))||{}).variant),x.color].filter(Boolean).map(v=>String(v).trim()).filter((v,i,a)=>a.indexOf(v)===i).join(' • ')})),sales:sales.map(x=>{const su=stockDetail.find(y=>String(y.id)===String(x.stock_unit_id))||{};return {...x,product:(productsRep.data||[]).find(p=>String(p.id)===String(su.product_id))?.product||su.product_name||su.notes||'Produk',variant:[formatVariant(su.storage_gb||(productMap.get(String(su.product_id))||{}).variant),su.color].filter(Boolean).join(' '),stock_unit_id:su.id,imei_1:su.imei_1};}),capital_due:sales.filter(x=>!x.capital_settled_at&&!settledStockIds.has(String(x.stock_unit_id))&&!settledSalesIds.has(String(x.id))).map(x=>{const su=stockDetail.find(y=>String(y.id)===String(x.stock_unit_id))||{};return { ...x,product:(productsRep.data||[]).find(p=>String(p.id)===String(su.product_id))?.product||su.product_name||su.notes||'Produk',variant:[formatVariant((productMap.get(String(su.product_id))||{}).variant),su.color].filter(Boolean).join(' '),capital_due:Number(su.cost||x.cost||0)};}),historical_sales:historicalSales,historical_capital_due:historicalDue,profit_sharing:[],settlements:(settRep.data||[]).filter(x=>{const so=String(x.outlet||'').trim().toLowerCase().replace(/\s+/g,' '),fo=String(outletFilter||'').trim().toLowerCase().replace(/\s+/g,' '),aliases=fo==='majesty plaza iphone'?['majesty plaza iphone','majesty plaza']:fo==='majesty refill phone'?['majesty refill phone','majesty refill']:fo?[fo]:[];const sd=String(x.settlement_date||x.created_at||'').slice(0,10);return (!outletFilter||aliases.includes(so))&&sd>=start&&sd<=end;}).map(x=>({type:x.settlement_type,date:x.settlement_date||x.created_at,status:x.status,amount:x.amount,note:x.note})),stock_totals:{ready_units:stockDetail.filter(x=>x.status==='READY').length,ready_cost:stockDetail.filter(x=>x.status==='READY').reduce((a,x)=>a+Number(x.cost||0),0),sold_units:stockDetail.filter(x=>x.status==='SOLD').length,sold_cost:stockDetail.filter(x=>x.status==='SOLD').reduce((a,x)=>a+Number(x.cost||0),0),return_units:stockDetail.filter(x=>x.status==='RETURN').length},stock_summary:['READY','SOLD','RETURN'].map(status=>({status,units:stockDetail.filter(x=>x.status===status).length,cost:stockDetail.filter(x=>x.status===status).reduce((a,x)=>a+Number(x.cost||0),0)}))};
  const tot=d.stock_totals||{},due=d.capital_due||[],profit=d.profit_sharing||[],sett=(d.settlements||[]).filter(x=>!isStockistPartner||!String(x.type||'').toUpperCase().includes('PROFIT')),money=v=>'Rp '+Number(v||0).toLocaleString('id-ID'),maskedMoney=v=>isProfitShareMasked?'xxxxxxxxxx':money(v),imeiMap=new Map(stockDetail.map(x=>[String(x.id),x.imei_1])); const soldDisplay=Number(tot.sold_units||0)+Number(historicalSales.length||0);
  const name=x=>esc(String(x||'-'));
  const stockOrder=['READY','RETURN','SOLD']; const stockHtml=stockOrder.map(st=>{const x=(d.stock_summary||[]).find(v=>String(v.status||'').toUpperCase()===st);return '<div class="fin-card"><div class="small">'+st+'</div><div class="fin-big">'+Number(x?.units||0)+' unit</div><div class="small">'+money(x?.cost||0)+'</div></div>';}).join('');
  const stockDetailHtml=stockDetail.map(x=>'<div class="lead"><div class="small"><b>'+name(x.outlet)+'</b></div><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">Status: '+name(x.status)+' • '+name(x.color)+(x.grade?' • Grade '+name(x.grade):'')+(x.battery_health!=null?' • BH '+Number(x.battery_health)+'%':'')+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.asking_price)+(x.sold_price!=null?' • Terjual: '+money(x.sold_price):'')+'</div></div>').join('')||'<div class="small">Belum ada stock Cell.</div>';
  const receiptHtml=rows.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.requested_at).toLocaleString('id-ID')+' • '+name(x.status)+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.asking_price)+'</div><div class="small">Input: '+name(x.requester)+' • Verifikasi: '+name(x.reviewer)+'</div>'+(x.review_note?'<div class="small">Catatan: '+name(x.review_note)+'</div>':'')+'</div>').join('')||'<div class="small">Tidak ada barang masuk pada periode ini.</div>';
  const normalizeProductLabel=(product,capacity,color,grade)=>{const raw=String(product||'Produk tidak ditemukan').trim();const rawCap=String(capacity||'').split(' • ')[0].trim();const capMatch=(rawCap.match(/\b\d+\s*\/\s*\d+\s*(?:GB)?\b/i)||raw.match(/\b\d+\s*\/\s*\d+\s*(?:GB)?\b/i)||[])[0]||'';const p=raw.replace(/\s*[-—]?\s*(NEW|SECOND)\b/ig,'').replace(/\s*[-—]?\s*\b\d+\s*\/\s*\d+\s*(?:GB)?\b/ig,'').replace(/\s+/g,' ').replace(/\s*[-—]+\s*$/,'').trim();let cap=rawCap.replace(/\s*[-—]?\s*\b\d+\s*\/\s*\d+\s*(?:GB)?\b/ig,'').trim();let formattedCap=capMatch?capMatch.replace(/\s+/g,'').toUpperCase():'';if(formattedCap&&!/GB$/i.test(formattedCap))formattedCap+='GB';const variant=[formattedCap|| (cap?formatVariant(cap):''),color].filter(Boolean).map(v=>String(v).trim()).filter((v,i,a)=>a.indexOf(v)===i).join(' ');const condition=String(grade||(/\bSECOND\b/i.test(raw)?'SECOND':/\bNEW\b/i.test(raw)?'NEW':'')).trim().toUpperCase();return p+(variant?' — '+variant:'')+(condition?' - '+condition:'');}; const combinedSales=[...sales.map(x=>({...x,_source:'active',_sortDate:new Date(x.sold_at||0).getTime()})),...historicalSales.map(x=>({...x,_source:'historical',_sortDate:new Date(x.sold_at||0).getTime()}))].sort((a,b)=>b._sortDate-a._sortDate); const combinedSalesHtml=combinedSales.map(x=>{if(x._source==='active'){const p=stockDetail.find(y=>String(y.id)===String(x.stock_unit_id))||{};const label=normalizeProductLabel(p.product||x.product,p.master_variant||x.variant,p.color,p.grade);return '<div class="lead"><b>'+name(label)+'</b><div class="small">'+new Date(x.sold_at).toLocaleString('id-ID')+(imeiMap.get(String(x.stock_unit_id||x.id))?' • IMEI '+name(imeiMap.get(String(x.stock_unit_id||x.id))):'')+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.sale_price)+' • Profit: '+money(x.gross_profit)+'</div></div>';}const label=normalizeProductLabel(x.product,x.storage_gb,x.color,x.condition||x.grade);return '<div class="lead"><b>'+name(label)+'</b><div class="small">Penjualan historis • '+new Date(x.sold_at).toLocaleDateString('id-ID')+'</div><div>Modal: '+money(x.capital_due||0)+' • Jual: '+money(x.sale_price||0)+' • Profit: '+money(Number(x.sale_price||0)-Number(x.capital_due||0))+'</div></div>';}).join('')||'<div class="small">Tidak ada penjualan pada periode ini.</div>';  const salesNominal=sales.reduce((a,x)=>a+Number(x.sale_price||0),0)+historicalSales.reduce((a,x)=>a+Number(x.sale_price||0),0);
  const dueHtml=due.map(x=>{const su=stockDetail.find(y=>String(y.id)===String(x.stock_unit_id))||{};const label=normalizeProductLabel(x.product,su.storage_gb||su.master_variant||x.variant,su.color,su.grade);const date=x.sold_at||x.created_at||x.sale_date;const imei=x.imei_1||x.imei||x.imei_number||x.serial_number||su.imei_1||su.imei_2;return '<div class="lead"><b>'+name(label)+'</b><div class="small">'+(date?new Date(date).toLocaleDateString('id-ID'):'Tanggal tidak tersedia')+(imei?' • IMEI '+name(imei):'')+'</div><div>Modal Cell belum disetor: <b>'+money(x.capital_due)+'</b></div></div>';}).join(''); const historicalDueHtml=historicalDue.map(x=>{const label=normalizeProductLabel(x.product,x.storage_gb,x.color,x.condition||x.grade||'SECOND');return '<div class="lead"><b>'+name(label)+'</b><div class="small">'+(x.sold_at?new Date(x.sold_at).toLocaleDateString('id-ID'):'Tanggal tidak tersedia')+((x.imei||x.imei_1||x.imei_number||x.serial_number)?' • IMEI '+name(x.imei||x.imei_1||x.imei_number||x.serial_number):'')+'</div><div>Modal Cell belum disetor: <b>'+money(x.capital_due)+'</b></div></div>';}).join(''); const combinedDueHtml=dueHtml+historicalDueHtml||'<div class="small">Tidak ada modal yang belum disetor.</div>'; const dueCount=due.length+historicalDue.length; const dueTotal=due.reduce((a,x)=>a+Number(x.capital_due||0),0)+historicalDue.reduce((a,x)=>a+Number(x.capital_due||0),0); const salesCount=sales.length+historicalSales.length; const salesTotal=sales.reduce((a,x)=>a+Number(x.sale_price||0),0); const historicalSalesTotal=historicalSales.reduce((a,x)=>a+Number(x.sale_price||0),0);
  const profitHtml=profit.map(x=>'<div class="lead"><b>'+name(x.period_start)+' s/d '+name(x.period_end)+'</b><div>'+Number(x.transactions||0)+' transaksi • Profit: '+money(x.total_profit)+'</div><div>Hak Cell '+Number(x.profit_share_pct||30)+'%: <b>'+maskedMoney(x.partner_profit_share)+'</b></div></div>').join('')||'<div class="small">Belum ada profit sharing.</div>';
  const settHtml=sett.map(x=>'<div class="lead"><b>'+name(x.type)+'</b><div class="small">'+name(x.date)+' • '+name(x.status)+'</div><div>Nominal: <b>'+((isProfitShareMasked&&String(x.type||'').toUpperCase().includes('PROFIT'))?'xxxxxxxxxx':money(x.amount))+'</b></div>'+(x.note?'<div class="small">'+name(x.note)+'</div>':'')+'</div>').join('')||'<div class="small">Belum ada settlement pada periode ini.</div>';
  box.innerHTML='<div class="small">Periode '+name(start.split('-').reverse().join('/'))+' s/d '+name(end.split('-').reverse().join('/'))+' • Outlet: '+name(d.outlet_filter||outlet)+'</div>'+
    '<nav class="hm-cell-report-tabs" aria-label="Navigasi laporan" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0">'+[['Ringkasan','hmCellSummary'],['Penjualan Stock Cell','hmCellSales'],['Modal Belum Disetor','hmCellDue'],['Barang Masuk','hmCellReceipts'],['Settlement','hmCellSettlement'],['Stok Saat Ini','hmCellStock']].map(t=>'<a href="#'+t[1]+'" style="display:inline-block;padding:10px 13px;border-radius:9px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-weight:700;font-size:13px;margin:3px">'+t[0]+'</a>').join('')+'</nav>'+
    ' <div id="hmCellSummary"></div><div class="fin-grid hm-stock-kpis" style="margin-top:10px;display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:10px!important"><div class="fin-card" style="min-height:76px!important;padding:14px 16px!important;display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important"><div class="small">READY</div><div class="fin-big" style="white-space:nowrap!important;font-size:24px!important">'+Number(tot.ready_units||0)+' unit</div><div class="small">'+money(tot.ready_cost)+'</div></div><div class="fin-card" style="min-height:76px!important;padding:14px 16px!important;display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important"><div class="small">SOLD</div><div class="fin-big" style="white-space:nowrap!important;font-size:24px!important">'+soldDisplay+' unit</div><div class="small">Modal '+money(Number(tot.sold_cost||0)+historicalDue.reduce((a,x)=>a+Number(x.capital_due||0),0))+'</div></div><div class="fin-card" style="min-height:76px!important;padding:14px 16px!important;display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important"><div class="small">RETURN</div><div class="fin-big" style="white-space:nowrap!important;font-size:24px!important">'+Number(tot.return_units||0)+' unit</div><div class="small"></div></div></div>'+
    '<div class="box hm-cell-section" id="hmCellReceipts" data-report-tab="hmCellReceipts" style="margin-top:12px"><h3>📦 1. Barang Masuk Cell</h3>'+receiptHtml+'</div>'+
    '<div class="box hm-cell-section" id="hmCellStock" data-report-tab="hmCellStock" style="margin-top:12px"><h3>📱 2. Stock Cell</h3>'+stockHtml+'<div class="small" style="margin-top:8px">Rincian unit sesuai filter yang dipilih.</div><div style="margin-top:8px">'+stockDetailHtml+'</div></div>'+
    '<div class="box hm-cell-section" id="hmCellDue" data-report-tab="hmCellDue" style="margin-top:12px"><h3>💰 3. Modal Cell Belum Disetor</h3><div class="fin-summary-line"><b>'+dueCount+' unit</b><strong>'+money(dueTotal)+'</strong></div>'+combinedDueHtml+'</div>'+
    '<div class="box hm-cell-section" id="hmCellSales" data-report-tab="hmCellSales" style="margin-top:12px"><h3>🧾 4. Penjualan Stock Cell</h3><div class="fin-summary-line"><b>'+salesCount+' unit</b><strong>'+money(salesNominal)+'</strong></div>'+combinedSalesHtml+'</div>'+
    (isStockistPartner?'':'<div class="box hm-cell-section" id="hmCellProfit" data-report-tab="hmCellProfit" style="margin-top:12px"><h3>🤝 5. Profit Sharing</h3>'+profitHtml+'</div>')+
    '<div class="box hm-cell-section" id="hmCellSettlement" data-report-tab="hmCellSettlement" style="margin-top:12px"><h3>💸 6. Riwayat Settlement</h3>'+settHtml+'</div>';
  const tabMap={hmCellSummary:[],hmCellSales:['hmCellSales'],hmCellDue:['hmCellDue'],hmCellReceipts:['hmCellReceipts'],hmCellSettlement:['hmCellSettlement'],hmCellStock:['hmCellStock']};
  const nav=box.querySelector('.hm-cell-report-tabs');
  if(nav){
    const links=[...nav.querySelectorAll('a')];
    const showTab=id=>{
      box.querySelectorAll('.hm-cell-section').forEach(el=>el.style.display=(tabMap[id]||[]).includes(el.id)?'block':'none');
      const kpis=box.querySelector('.hm-stock-kpis');if(kpis)kpis.style.display=id==='hmCellSummary'?'grid':'none';
      links.forEach(a=>{const active=a.getAttribute('href')==='#'+id;a.style.background=active?'#2563eb':'#eff6ff';a.style.color=active?'#fff':'#1d4ed8';});
      const sum=box.querySelector('#hmCellSummary');if(sum)sum.style.display=id==='hmCellSummary'?'block':'none';
    };
    links.forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();showTab(a.getAttribute('href').slice(1));}));
    showTab('hmCellSummary');
  }
};
window.openPartnerSettlement=async function(){
  const p=window.profile||{};
  const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  const isFacilitator=!p.is_management&&role==='FASILITATOR';
  const isStockistPartner=!p.is_management&&(role.includes('STOCKIST')||role.startsWith('ADMIN FINANCE MAJESTY CELL'));
  const isDeveloper=role==='DEVELOPER'||role==='DEVELOPER APLIKASI';
  if(!p.is_management && !isStockistPartner && !isFacilitator && !isDeveloper){
    alert('Akses settlement tidak diizinkan.');
    return;
  }
  const panel=document.getElementById('hmMenuPanel');
  const body=document.getElementById('hmMenuPanelBody');
  const title=document.getElementById('hmMenuPanelTitle');
  const modal=document.getElementById('modal');
  if(!panel||!body) throw new Error('Panel Menu Utama belum siap.');
  if(modal){modal.classList.add('hidden');modal.style.display='none';}
  if(title)title.textContent='🤝 Stockist Management';
  panel.classList.remove('hidden');
  body.innerHTML='<div class="box"><div class="small">⏳ Memuat kewajiban Majesty Cell...</div></div>';
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
  try{
    if(!window.sb)throw new Error('Koneksi database belum siap.');
    const res=await window.sb.rpc('partner_obligation_summary');
    if(res.error)throw res.error;
    const rows=Array.isArray(res.data)?res.data:[];
    const list=rows.filter(x=>{
      if(!String(x.partner_name||'').trim()||!String(x.outlet||'').trim())return false;
      if(isFacilitator)return String(x.outlet||'').trim().toLowerCase()===String(p.outlet||'').trim().toLowerCase();
      if(isStockistPartner)return String(x.partner_name||'').trim().toLowerCase()===String(p.outlet||'').trim().toLowerCase();
      return true;
    });
    const card=(x)=>{
      const partner=String(x.partner_name||'');
      const outlet=String(x.outlet||'');
      const capital=Number(x.capital_due||0), profit=Number(x.profit_share_due||0);
      const isCell=partner.trim().toUpperCase()==='MAJESTY CELL';
      const hideProfit=!p.is_management;
      let buttons='';
      if(isCell && outlet==='Majesty Refill Phone' && !hideProfit){
        buttons='<div class="row" style="margin-top:12px"><button class="primary" type="button" onclick="window.loadPartnerSettlementDetail(\'Majesty Refill Phone\')">📋 Rincian & Setor Modal</button><button class="secondary" type="button" onclick="window.loadPartnerProfitSettlement(\'Majesty Refill Phone\')">🤝 Setor Profit Sharing</button></div>';
      }else if(isCell && outlet==='Majesty Refill Phone' && hideProfit){
        buttons='<div class="row" style="margin-top:12px"><button class="primary" type="button" onclick="window.loadPartnerSettlementDetail(\'Majesty Refill Phone\')">📋 Rincian & Setor Modal</button></div>';
      }else if(isCell && outlet==='Majesty Plaza iPhone'){
        buttons='<div class="row" style="margin-top:12px"><button class="primary" type="button" onclick="window.loadPartnerSettlementDetail(\'Majesty Plaza iPhone\')">📋 Rincian & Setor Modal</button></div>';
      }else{
        buttons='<div class="small" style="margin-top:10px">Informasi kewajiban ditampilkan. Tombol settlement belum diaktifkan untuk kombinasi ini agar tidak salah membuat jurnal atau menandai pembayaran.</div>';
      }
      return '<div class="box" style="margin-top:12px"><h3>'+outlet+'</h3><div class="small">Stockist: <b>'+partner+'</b></div><div class="fin-grid" style="margin-top:8px"><div class="fin-card"><div class="small">Modal Belum Disetor</div><div class="fin-big">'+money(capital)+'</div></div>'+(hideProfit?'':'<div class="fin-card"><div class="small">Profit Sharing</div><div class="fin-big">'+money(profit)+'</div></div>')+'</div><div style="margin-top:10px"><b>Total Kewajiban: '+money(hideProfit?capital:capital+profit)+'</b></div>'+buttons+'</div>';
    };
    const sorted=list.slice().sort((a,b)=>String(a.outlet).localeCompare(String(b.outlet))||String(a.partner_name).localeCompare(String(b.partner_name)));
    body.innerHTML='<div class="small">Kewajiban dipisahkan berdasarkan outlet dan stockist. Settlement hanya tersedia untuk alur yang sudah diverifikasi.</div>'+
      (sorted.length?sorted.map(card).join(''):'<div class="box" style="margin-top:12px">Belum ada data kewajiban stockist.</div>')+
      '<div id="partnerSettlementDetail" style="margin-top:14px"></div>';
    if(p.is_management) window.loadPartnerBusinessRules();
    panel.classList.remove('hidden');
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(ex){
    console.error('[HM] Partner obligation summary:',ex);
    body.innerHTML='<div class="box"><b>Gagal memuat Kewajiban Cell.</b><div class="small" style="margin-top:6px">'+String(ex?.message||ex||'Terjadi kesalahan saat memuat data.')+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.openPartnerSettlement()">↻ Coba Lagi</button></div>';
    panel.classList.remove('hidden');
  }
};

window.loadPartnerBusinessRules=async function(){
  const p=window.profile||{};
  if(!p.is_management){alert('Pengaturan profit sharing hanya dapat diakses Management.');return;}
  const body=document.getElementById('hmMenuPanelBody');if(!body||!window.sb)return;
  let host=document.getElementById('hmPartnerRulesConfig');
  if(!host){host=document.createElement('div');host.id='hmPartnerRulesConfig';host.className='box';host.style.marginTop='14px';body.appendChild(host);}
  host.innerHTML='<h3>⚙️ Pengaturan Kerja Sama Stockist</h3><div class="small">Persentase yang diubah berlaku mulai tanggal efektif. Transaksi/settlement lama tidak diubah otomatis.</div><div class="small" style="margin-top:8px">⏳ Memuat aturan...</div>';
  const {data,error}=await window.sb.from('partner_business_rules').select('id,partner_name,outlet,profit_share_pct,loss_share_pct,capital_share_pct,profit_settlement_cycle,active,effective_from,updated_at').order('partner_name').order('outlet');
  if(error){host.innerHTML+='<div class="small">Gagal memuat aturan: '+String(error.message||error)+'</div>';return;}
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  host.innerHTML='<h3>⚙️ Pengaturan Kerja Sama Stockist</h3><div class="small">Management dapat mengubah profit sharing dan tanggal efektif. Perubahan tercatat dalam riwayat. Jangan ubah transaksi lama secara retroaktif.</div>'+
    ((data||[]).map(r=>'<div class="lead" style="margin-top:10px"><b>'+esc(r.partner_name)+' → '+esc(r.outlet)+'</b><div class="row" style="margin-top:8px;align-items:end"><label style="flex:1;min-width:110px"><span class="small">Profit sharing (%)</span><input type="number" min="0" max="100" step="0.01" id="hmProfitPct_'+r.id+'" value="'+Number(r.profit_share_pct||0)+'"></label><label style="flex:1;min-width:130px"><span class="small">Tanggal efektif</span><input type="date" id="hmProfitDate_'+r.id+'" value="'+esc(r.effective_from||new Date().toISOString().slice(0,10))+'"></label><button class="primary" type="button" onclick="window.savePartnerBusinessRule(\''+r.id+'\')">Simpan</button></div><div class="small">Aturan saat ini: '+Number(r.profit_share_pct||0)+'% • Modal '+Number(r.capital_share_pct||0)+'% • '+esc(r.profit_settlement_cycle||'NONE')+'</div></div>').join('')||'<div class="small">Belum ada aturan kerja sama.</div>')+
    '<button class="secondary" type="button" style="margin-top:10px" onclick="window.loadPartnerBusinessRuleHistory()">Lihat riwayat perubahan</button><div id="hmPartnerRulesHistory" style="margin-top:10px"></div>';
};
window.savePartnerBusinessRule=async function(id){
  const p=window.profile||{};if(!p.is_management){alert('Hanya Management yang dapat mengubah aturan.');return;}
  const pctEl=document.getElementById('hmProfitPct_'+id),dateEl=document.getElementById('hmProfitDate_'+id);
  const pct=Number(pctEl?.value),effective=dateEl?.value;
  if(!Number.isFinite(pct)||pct<0||pct>100){alert('Persentase harus antara 0 sampai 100.');return;}
  if(!effective){alert('Tanggal efektif wajib diisi.');return;}
  if(!confirm('Simpan profit sharing '+pct+'% mulai '+effective+'? Transaksi lama tidak diubah otomatis.'))return;
  const {error}=await window.sb.from('partner_business_rules').update({profit_share_pct:pct,effective_from:effective}).eq('id',id);
  if(error){alert('Gagal menyimpan aturan: '+error.message);return;}
  alert('Aturan profit sharing berhasil disimpan.');
  await window.loadPartnerBusinessRules();
};
window.loadPartnerBusinessRuleHistory=async function(){
  const p=window.profile||{};if(!p.is_management){alert('Akses ditolak.');return;}
  const host=document.getElementById('hmPartnerRulesHistory');if(!host)return;
  host.innerHTML='<div class="small">Memuat riwayat...</div>';
  const {data,error}=await window.sb.from('partner_business_rule_history').select('partner_name,outlet,old_profit_share_pct,new_profit_share_pct,old_effective_from,new_effective_from,changed_at,note').order('changed_at',{ascending:false}).limit(100);
  if(error){host.innerHTML='<div class="small">Riwayat belum dapat dibaca: '+String(error.message||error)+'</div>';return;}
  host.innerHTML=(data||[]).length?(data||[]).map(r=>'<div class="lead"><b>'+String(r.partner_name||'')+' → '+String(r.outlet||'')+'</b><div>'+Number(r.old_profit_share_pct||0)+'% → <b>'+Number(r.new_profit_share_pct||0)+'%</b></div><div class="small">Efektif: '+String(r.old_effective_from||'-')+' → '+String(r.new_effective_from||'-')+' • Diubah: '+new Date(r.changed_at).toLocaleString('id-ID')+'</div></div>').join(''):'<div class="small">Belum ada riwayat perubahan.</div>';
};

window.updatePartnerCapitalSelection=function(){
  const checks=[...document.querySelectorAll('.partner-capital-check:checked')];
  const gross=checks.reduce((s,x)=>s+Number(x.dataset.gross||0),0);
  const finance=checks.reduce((s,x)=>s+Number(x.dataset.finance||0),0);
  const net=checks.reduce((s,x)=>s+Number(x.dataset.amount||0),0);
  const box=document.getElementById('partnerCapitalSelectionTotal');
  if(box)box.innerHTML='<div style="font-weight:800;font-size:15px;margin-bottom:8px">Ringkasan pilihan</div><div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin:5px 0"><span>Unit terpilih</span><b>'+checks.length+'</b></div><div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin:5px 0"><span>Modal awal</span><b>'+hmRp(gross)+'</b></div><div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin:5px 0"><span>Finance diterima Cell</span><b>− '+hmRp(finance)+'</b></div><div style="display:flex;justify-content:space-between;gap:12px;border-top:1px solid #d0d5dd;padding-top:10px;margin-top:10px;font-size:15px"><b>Sisa settlement indikatif</b><b>'+hmRp(net)+'</b></div>';
};
window.sharePartnerCapitalSelectionWhatsApp=async function(){
  const checks=[...document.querySelectorAll('.partner-capital-check:checked')];
  if(!checks.length){alert('Pilih minimal 1 unit terlebih dahulu.');return;}
  const ids=checks.map(x=>x.dataset.sid).filter(Boolean);
  let sales=[];
  if(ids.length){
    const {data,error}=await sb.from('sales_transactions').select('id,sale_price,finance_status,finance_requested_amount,finance_actual_disbursement,finance_cash_payment,finance_cashout_amount,finance_actual_fee').in('id',ids);
    if(error){alert('Rincian finance gagal dimuat: '+error.message);return;}
    sales=data||[];
  }
  const byId={};sales.forEach(x=>byId[x.id]=x);
  const lines=['*RINCIAN SETORAN MODAL MAJESTY CELL*','Outlet: '+(window.hmPartnerCapitalOutlet||'Majesty Refill Phone'),'Tanggal: '+new Date().toLocaleDateString('id-ID'),''];
  let totalModal=0,totalFinance=0,totalNet=0,totalCash=0,totalCashout=0;
  checks.forEach((x,i)=>{
    const amount=Number(x.dataset.amount||0),gross=Number(x.dataset.gross||0),finance=Number(x.dataset.finance||0),s=byId[x.dataset.sid]||{};
    totalModal+=gross;totalFinance+=finance;totalNet+=amount;totalCash+=Number(s.finance_cash_payment||0);totalCashout+=Number(s.finance_cashout_amount||0);
    lines.push((i+1)+'. '+(x.dataset.product||'Produk')+' | IMEI: '+(x.dataset.imei||'-'));
    lines.push('   Modal awal: '+hmRp(gross));
    lines.push('   Finance diterima Majesty Cell: − '+hmRp(finance));
    lines.push('   Sisa settlement unit: '+hmRp(amount));
    if(s.finance_status)lines.push('   Status finance: '+s.finance_status);
    if(Number(s.finance_cash_payment||0))lines.push('   Tunai pelanggan: '+hmRp(s.finance_cash_payment));
    if(Number(s.finance_cashout_amount||0))lines.push('   Tarik tunai customer: '+hmRp(s.finance_cashout_amount));
    lines.push('');
  });
  lines.push('*REKAP*','Jumlah unit: '+checks.length,'Modal awal: '+hmRp(totalModal),'Finance diterima Majesty Cell: − '+hmRp(totalFinance),'*Sisa settlement modal: '+hmRp(totalNet)+'*','Tunai pelanggan (informasi): '+hmRp(totalCash),'Tarik tunai customer (informasi): '+hmRp(totalCashout),'','Catatan: settlement hanya mengurangi finance berstatus COMPLETED yang terkait dengan unit terpilih.');
  window.open('https://wa.me/?text='+encodeURIComponent(lines.join('\\n')),'_blank','noopener');
};
window.payPartnerCapitalSettlement=async function(){
  const ids=[...document.querySelectorAll('.partner-capital-check:checked')].map(x=>x.value);
  if(!ids.length){alert('Pilih minimal 1 unit.');return;}
  if(!confirm('Setor modal untuk '+ids.length+' unit terpilih sekarang?'))return;
  const {data,error}=await sb.rpc('create_partner_capital_settlement',{p_stock_unit_ids:ids,p_settlement_date:new Date().toISOString().slice(0,10),p_note:'Pembayaran modal Majesty Cell'});
  if(error){alert(error.message);return;}
  alert('Settlement modal berhasil. '+hmRp(data?.amount||0)+' disetor.');
  window.openPartnerSettlement();
};
window.loadPartnerProfitSettlement=async function(){
  const p=window.profile||{};const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!p.is_management&&(role.includes('STOCKIST')||role.startsWith('ADMIN FINANCE MAJESTY CELL'))){alert('Rincian profit sharing tidak tersedia pada akun mitra stockist.');return;}
  const box=document.getElementById('partnerSettlementDetail');if(!box)return;
  const now=new Date(),start=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const {data:r}=await sb.from('partner_profit_share_monthly').select('*').eq('outlet','Majesty Refill Phone').eq('partner_name','Majesty Cell').eq('period_start',start).maybeSingle();
  const isMasked=String((window.profile||{}).name||'').trim().toLowerCase()==='saka'||String((window.profile||{}).role||'').trim().toUpperCase().replace(/_/g,' ')==='FASILITATOR';
  const gross=Number(r?.partner_profit_share||0);
  const {data:settlements}=await sb.from('partner_settlements').select('amount').eq('partner_name','Majesty Cell').eq('outlet','Majesty Refill Phone').eq('settlement_type','PROFIT_SHARING').eq('status','PAID').eq('period_start',start);
  const paid=(p||[]).reduce((s,x)=>s+Number(x.amount||0),0),due=Math.max(gross-paid,0);
  box.innerHTML='<div class="lead"><b>Profit Sharing '+start+'</b><br>Hak Majesty Cell: '+(isMasked?'xxxxxxxxxx':hmRp(gross))+'<br>Sudah disetor: '+(isMasked?'xxxxxxxxxx':hmRp(paid))+'<br><b>Sisa: '+(isMasked?'xxxxxxxxxx':hmRp(due))+'</b>'+(due>0?'<div style="margin-top:10px"><button class="success" onclick="window.payPartnerProfitSettlement(\''+start+'\')">💸 Setor Sekarang</button></div>':'<div class="small" style="margin-top:8px">Tidak ada profit sharing yang perlu disetor.</div>')+'</div>';
};
window.payPartnerProfitSettlement=async function(start){
  if(!confirm('Setor profit sharing Majesty Cell periode '+start+' sekarang?'))return;
  const {data,error}=await sb.rpc('create_partner_profit_settlement',{p_period_start:start,p_settlement_date:new Date().toISOString().slice(0,10),p_note:'Pembayaran profit sharing Majesty Cell'});
  if(error){alert(error.message);return;}
  alert('Settlement berhasil. '+hmRp(data?.amount||0)+' disetor.');
  window.openPartnerSettlement();
};
window.loadPartnerSettlementDetail=async function(outlet){
  const box=document.getElementById('partnerSettlementDetail');if(!box)return;
  outlet=outlet||'Majesty Refill Phone';
  window.hmPartnerCapitalOutlet=outlet;
  if(outlet==='Majesty Plaza iPhone'){
    const [histRep,activeRep]=await Promise.all([
      sb.from('partner_historical_stock_details').select('*').eq('outlet',outlet).eq('partner_name','Majesty Cell').eq('sold_status','SOLD').order('created_at',{ascending:true}),
      sb.rpc('partner_capital_due_detail',{p_outlet:outlet})
    ]);
    if(histRep.error||activeRep.error){box.innerHTML='<div class="small">Gagal memuat rincian settlement Plaza: '+esc(String(histRep.error?.message||activeRep.error?.message||'Kesalahan query'))+'</div>';return;}
    const historical=(histRep.data||[]).map(r=>({...r,_source:'historical',_id:r.id,_cost:Number(r.cost||0),_settled:!!r.settlement_id,_product:r.product_name||'Produk historis',_variant:r.storage_gb?(r.storage_gb+'GB'):'',_color:r.color||'',_imei:r.imei_1||''}));
    const active=(activeRep.data||[]).filter(r=>String(r.partner_name||'').trim().toLowerCase()==='majesty cell').map(r=>({...r,_source:'active',_id:r.stock_unit_id,_cost:Number(r.capital_due||0),_settled:false,_product:r.product_name||'Produk',_variant:r.variant||'',_color:r.color||'',_imei:r.imei_1||''}));
    const units=[...historical,...active];
    const unpaid=units.filter(r=>!r._settled), total=units.reduce((s,r)=>s+r._cost,0), unpaidTotal=unpaid.reduce((s,r)=>s+r._cost,0);
    const escV=v=>esc(String(v??''));
    box.innerHTML=units.length?
      '<div class="small">Rekap gabungan stok historis dan stok aktif Majesty Cell yang terjual di Plaza. Pilih unit yang akan dimasukkan ke settlement.</div>'+
      units.map((r,i)=>'<label style="display:block;padding:11px 0;border-bottom:1px solid #ddd;'+(r._settled?'opacity:.55':'')+'"><input class="partner-plaza-capital-check" type="checkbox" value="'+r._id+'" data-amount="'+r._cost+'" '+(r._settled?'disabled':'')+' style="width:auto;margin-right:8px">'+
      '<b>'+String(i+1)+'. '+escV(r._product)+' '+escV(r._variant)+' '+escV(r._color)+'</b><br><span class="small">'+(r._source==='historical'?'Historis':'Stok aktif')+' • Modal '+hmRp(r._cost)+' • IMEI '+escV(r._imei||'-')+(r._settled?' • SUDAH DISETOR':' • BELUM DISETOR')+'</span></label>').join('')+
      '<div style="margin-top:10px"><b>Total '+units.length+' unit: '+hmRp(total)+'</b><br><span class="small">Belum disetor: '+hmRp(unpaidTotal)+' ('+unpaid.length+' unit)</span></div>'+
      (unpaid.length?'<button class="success" style="margin-top:12px" onclick="window.payPartnerPlazaHistoricalCapital()">💸 Buat Settlement Modal Terpilih</button>':'<div class="small" style="margin-top:10px">Semua modal Plaza sudah disetor.</div>')
      :'<div class="small">Belum ada unit terjual Majesty Cell yang menunggu settlement di Plaza.</div>';
    return;
  }
  const {data:rows,error}=await sb.rpc('partner_capital_due_detail',{p_outlet:outlet});
  if(error){box.innerHTML='<div class="small">Gagal memuat rincian modal Cell: '+esc(String(error.message||error))+'</div>';return;}
  const units=rows||[];
  const txIds=[...new Set(units.map(r=>r.sales_transaction_id).filter(Boolean))];
  let financeByTx={};
  if(txIds.length){
    const fr=await sb.from('sales_transactions').select('id,finance_status,finance_actual_disbursement,finance_requested_amount').in('id',txIds);
    if(fr.error){box.innerHTML='<div class="small">Gagal memuat pencairan finance: '+esc(fr.error.message)+'</div>';return;}
    (fr.data||[]).forEach(t=>{financeByTx[t.id]=t;});
  }
  const rowsForDisplay=units.map(r=>{
    const tx=financeByTx[r.sales_transaction_id]||{};
    const finance=(['COMPLETED','PAID'].includes(String(tx.finance_status||'').toUpperCase()))?Number(tx.finance_actual_disbursement||0):0;
    const gross=Number(r.capital_due||0), net=Math.max(gross-finance,0);
    return {...r,_finance:finance,_gross:gross,_net:net};
  });
  box.innerHTML=rowsForDisplay.length
    ? '<section style="background:linear-gradient(135deg,#101828,#26364b);color:#fff;border-radius:16px;padding:16px;margin:8px 0 14px">'+
        '<div style="font-size:17px;font-weight:800">Settlement Modal Stockist</div>'+
        '<div style="font-size:12px;color:#d0d5dd;margin-top:4px">Outlet: '+esc(outlet)+' · '+rowsForDisplay.length+' unit belum disetor</div>'+
        '<div style="font-size:12px;color:#d0d5dd;margin-top:8px">Pilih unit untuk melihat ringkasan modal dan pencairan finance.</div></section>'+
      '<div style="display:grid;gap:10px">'+rowsForDisplay.map(r=>{
        const product=String(r.product_name||'Produk tidak ditemukan');
        const variant=String(r.variant||'');
        const color=String(r.color||'');
        const grade=r.grade?'Grade '+esc(String(r.grade)):'';
        const bh=r.battery_health!=null?'BH '+Number(r.battery_health)+'%':'';
        const imei=r.imei_1||'-';
        const detail=[grade,bh].filter(Boolean).join(' · ');
        const title=[product,variant,color].filter(Boolean).join(' · ');
        return '<label style="display:block;background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:13px;box-shadow:0 2px 7px #1018280a">'+
          '<div style="display:flex;gap:10px;align-items:flex-start">'+
          '<input class="partner-capital-check" type="checkbox" value="'+r.stock_unit_id+'" data-amount="'+r._net+'" data-gross="'+r._gross+'" data-finance="'+r._finance+'" data-sid="'+esc(String(r.sales_transaction_id||''))+'" data-product="'+esc(title).replace(/"/g,'&quot;')+'" data-imei="'+esc(String(imei)).replace(/"/g,'&quot;')+'" style="width:20px;height:20px;flex:0 0 20px;margin:2px 0 0" onchange="window.updatePartnerCapitalSelection()">'+
          '<div style="min-width:0;flex:1"><div style="font-weight:800;color:#101828;line-height:1.35">'+esc(product)+(variant?' — '+esc(variant):'')+'</div>'+
          (color?'<div style="font-size:12px;color:#475467;margin-top:2px">'+esc(color)+(detail?' · '+detail:'')+'</div>':'')+
          '<div style="font-size:11px;color:#667085;margin-top:5px;overflow-wrap:anywhere">IMEI: '+esc(String(imei))+'</div>'+
          '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px">'+
          '<div style="background:#f8fafc;border-radius:9px;padding:8px"><div style="font-size:10px;color:#667085">Modal awal</div><div style="font-size:13px;font-weight:700;color:#101828">'+hmRp(r._gross)+'</div></div>'+
          '<div style="background:#fff7ed;border-radius:9px;padding:8px"><div style="font-size:10px;color:#9a3412">Finance diterima Cell</div><div style="font-size:13px;font-weight:700;color:#9a3412">− '+hmRp(r._finance)+'</div></div>'+
          '<div style="grid-column:1/-1;background:#ecfdf3;border-radius:9px;padding:9px"><div style="font-size:10px;color:#027a48">Sisa settlement (indikatif)</div><div style="font-size:16px;font-weight:800;color:#027a48">'+hmRp(r._net)+'</div></div>'+
          '</div></div></div></label>';
      }).join('')+'</div>'+
      '<div id="partnerCapitalSelectionTotal" style="background:#f8fafc;border:1px solid #d0d5dd;border-radius:14px;padding:14px;margin-top:14px">'+
      '<div style="font-weight:800;font-size:15px;margin-bottom:8px">Ringkasan pilihan</div>'+
      '<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin:5px 0"><span>Unit terpilih</span><b>0</b></div>'+
      '<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin:5px 0"><span>Modal awal</span><b>Rp0</b></div>'+
      '<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin:5px 0"><span>Finance diterima Cell</span><b>Rp0</b></div>'+
      '<div style="display:flex;justify-content:space-between;gap:12px;border-top:1px solid #d0d5dd;padding-top:10px;margin-top:10px;font-size:15px"><b>Sisa settlement indikatif</b><b>Rp0</b></div></div>'+
      '<div style="background:#fffaeb;border:1px solid #fedf89;color:#93370d;border-radius:12px;padding:11px;margin-top:12px;font-size:12px;line-height:1.45">Catatan: nilai sisa di atas adalah pratinjau. Tombol pembayaran belum boleh digunakan sampai perhitungan pengurang finance dipastikan diterapkan juga pada pencatatan settlement.</div>'+
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" disabled style="flex:1;min-width:180px;background:#98a2b3;opacity:.8;cursor:not-allowed">🔒 Pembayaran menunggu validasi</button><button type="button" class="primary" style="flex:1;min-width:180px" onclick="window.sharePartnerCapitalSelectionWhatsApp()">🟢 Kirim Rincian ke WhatsApp</button></div>'
    : '<div style="text-align:center;background:#f8fafc;border:1px dashed #d0d5dd;border-radius:14px;padding:24px 16px"><div style="font-size:28px">📦</div><div style="font-weight:800;color:#101828;margin-top:8px">Tidak ada settlement tertunda</div><div style="font-size:12px;color:#667085;margin-top:5px">Belum ada unit Majesty Cell yang menunggu penyelesaian untuk outlet ini.</div></div>';
};
window.payPartnerPlazaHistoricalCapital=async function(){
  const ids=[...document.querySelectorAll('.partner-plaza-capital-check:checked')].map(x=>x.value);
  if(!ids.length){alert('Pilih minimal 1 unit.');return;}
  if(!confirm('Buat settlement modal Plaza untuk '+ids.length+' unit terpilih sekarang?'))return;
  const {data,error}=await sb.rpc('create_partner_capital_settlement',{p_stock_unit_ids:ids,p_settlement_date:new Date().toISOString().slice(0,10),p_note:'Settlement modal Majesty Cell - Plaza (stok aktif + historis)'});
  if(error){alert(error.message);return;}
  alert('Settlement modal Plaza berhasil dibuat untuk '+(data?.units||ids.length)+' unit senilai '+hmRp(data?.amount||0)+'.');
  window.openPartnerSettlement();
};
window.payPartnerCapitalBalance=async function(outlet,amount){
  if(!confirm('Setor modal Majesty Cell Plaza sebesar '+hmRp(amount)+' sekarang?'))return;
  const {data,error}=await sb.rpc('create_partner_capital_settlement_balance',{p_outlet:outlet,p_amount:amount,p_settlement_date:new Date().toISOString().slice(0,10),p_note:'Pembayaran modal Majesty Cell - Plaza'});
  if(error){alert(error.message);return;}
  alert('Settlement modal Plaza berhasil. '+hmRp(data?.amount||amount)+' disetor.');
  window.openPartnerSettlement();
};
window.openFinanceInventoryApprovals=async function(){
  const p=window.profile||{};
  const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  const roles=Array.isArray(window.hmRoles)?window.hmRoles.map(x=>String(x||'').trim().toUpperCase().replace(/_/g,' ')):[role];
  const canApprove=role==='FASILITATOR'||role==='ADMIN FINANCE MAJESTY CELL'||role==='MITRA STOCKIST'||roles.includes('FASILITATOR')||roles.includes('ADMIN FINANCE MAJESTY CELL')||roles.includes('MITRA STOCKIST');
  if(!canApprove){alert('Persetujuan Barang Masuk hanya dapat dilakukan Fasilitator atau Admin Finance Majesty Cell.');return;}
  const fn=window.openInventoryApprovals;
  if(typeof fn!=='function')throw new Error('Modul Inventory untuk approval belum siap.');
  await fn();
  const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
  const mt=document.getElementById('mt'),mb=document.getElementById('mb'),modal=document.getElementById('modal');
  if(panel&&body&&mt&&mb){
    if(title)title.textContent=mt.textContent||'🔔 Persetujuan Barang Masuk';
    body.replaceChildren(...Array.from(mb.childNodes));
    panel.classList.remove('hidden');
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  if(modal){modal.classList.add('hidden');modal.style.display='none';}
};
window.openFinance=async function(){
  const p=window.profile||{},role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  const isDeveloper=!!window.developer||role==='DEVELOPER'||role==='DEVELOPER APLIKASI';
  const financeAllowed=isDeveloper||!!p.is_management||['FASILITATOR','ADMIN FINANCE','ADMIN FINANCE MAJESTY CELL','MITRA STOCKIST'].includes(role);
  if(!financeAllowed){alert('Akses Finance tidak diizinkan.');return;}
  const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle'),modal=document.getElementById('modal');
  if(!panel||!body)return;
  if(modal){modal.classList.add('hidden');modal.style.display='none';}
  if(title)title.textContent='💰 Finance';
  panel.classList.remove('hidden');
  body.innerHTML='<div class="box"><div class="small">⏳ Memuat Finance...</div></div>';
  try{
    const sb=window.sb;if(!sb)throw new Error('Koneksi database belum siap.');
    const [start,end]=hmDateRange('month');
    const x=await sb.rpc('finance_management_dashboard',{p_start_date:start,p_end_date:end});
    if(x.error)throw x.error;
    const d=x.data||{};
    // Kas Finance mengikuti akun MNG aktif: 1103 Refill dan 1104 Plaza.
    // RPC lama masih mengenal 1101/1102, jadi Finance menormalkan daftar akun di sini
    // tanpa mengubah jurnal historis.
    // Tampilan sementara hanya akun Kas MNG dan bank yang dipakai. BNI/Seabank serta akun lama disembunyikan dari layar saja; data akun/jurnal tidak dihapus atau dinonaktifkan.
    const {data:cashAccounts,error:cashErr}=await sb.from('accounting_accounts').select('id,code,name,account_type,active').in('code',['1103','1104','1110','1111','1112']).eq('active',true).order('code');
    if(cashErr)throw cashErr;
    const ids=(cashAccounts||[]).map(a=>a.id);
    let cashLines=[];
    if(ids.length){
      const jr=await sb.from('journal_lines').select('account_id,debit,credit,journal_id,journal_entries!inner(journal_date,posted)').in('account_id',ids).eq('journal_entries.posted',true);
      if(jr.error)throw jr.error;
      cashLines=jr.data||[];
    }
    const endExclusive=new Date(String(end)+'T23:59:59.999Z');
    const startInclusive=new Date(String(start)+'T00:00:00.000Z');
    const accounts=(cashAccounts||[]).map(a=>{
      const lines=cashLines.filter(l=>String(l.account_id)===String(a.id));
      const balance=lines.reduce((s,l)=>s+Number(l.debit||0)-Number(l.credit||0),0);
      return {...a,balance};
    });
    const periodLines=cashLines.filter(l=>{const dt=new Date(l.journal_entries?.journal_date);return dt>=startInclusive&&dt<=endExclusive;});
    d.cash_bank=accounts.reduce((s,a)=>s+Number(a.balance||0),0);
    d.cash_in=periodLines.reduce((s,l)=>s+Number(l.debit||0),0);
    d.cash_out=periodLines.reduce((s,l)=>s+Number(l.credit||0),0);
    d.net_cashflow=Number(d.cash_in||0)-Number(d.cash_out||0);
    d.accounts=accounts;
    const money=v=>hmRp(v);
    const cards=[['💵 Kas & Bank',d.cash_bank],['💰 Uang Masuk',d.cash_in],['💸 Uang Keluar',d.cash_out],['📊 Net Cashflow',d.net_cashflow],['🤝 Hutang Supplier',d.payable_supplier],['👤 Piutang Customer',d.receivable_customer]];
    body.innerHTML='<div class="row" style="margin-bottom:10px"><button class="secondary" type="button" onclick="hmCloseMainMenu()">✖ Tutup</button><button class="primary" type="button" onclick="window.openFinance()">🔄 Refresh</button></div>'+
      '<div class="small">Finance • periode '+start+' s/d '+end+'</div>'+
      '<div class="fin-grid" style="margin-top:10px">'+cards.map(c=>'<div class="fin-card"><div class="small">'+c[0]+'</div><div class="fin-big">'+money(c[1])+'</div></div>').join('')+'</div>'+
      '<div class="box" style="margin-top:12px"><h3 style="margin-top:0">🧾 Transaksi Finance</h3><div class="small">Transaksi yang sudah tercatat dan POSTED.</div><div id="hmFinanceTransactions" style="margin-top:8px">Memuat...</div></div>'+
      '<div class="box" style="margin-top:12px"><h3 style="margin-top:0">💵 Posisi Kas & Bank</h3><div class="small">Pilih akun untuk melihat mutasi.</div><div style="margin-top:8px">'+(accounts.length?accounts.map(a=>'<button class="secondary" style="width:100%;text-align:left;margin:4px 0" onclick="hmOpenCash(\''+String(a.code||'').replace(/'/g,"\'")+'\')"><div class="row" style="justify-content:space-between"><span><b>'+esc(String(a.code||''))+'</b> '+esc(String(a.name||''))+'</span><b>'+money(a.balance)+'</b></div></button>').join(''):'<div class="small">Belum ada saldo.</div>')+'</div></div>'+
      '<div class="box" style="margin-top:12px"><h3 style="margin-top:0">⚡ Aksi Finance</h3><div class="row"><button class="secondary" type="button" onclick="window.openFinanceDisbursement()">💳 Pencairan Finance</button><button class="secondary" type="button" onclick="window.openPartnerSettlement()">🤝 Kewajiban & Settlement Cell</button></div></div>';
    window.hmCashAccounts=accounts;
    const jr=await sb.from('journal_entries').select('id,journal_no,journal_date,source_type,description,posted').eq('posted',true).order('journal_date',{ascending:false}).limit(50);
    const tx=document.getElementById('hmFinanceTransactions');
    if(jr.error){if(tx)tx.innerHTML='<div class="danger box">'+esc(String(jr.error.message||jr.error))+'</div>';}
    else if(tx){const rows=jr.data||[];tx.innerHTML=rows.length?rows.map(r=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc(String(r.journal_no||'-'))+'</b><span class="badge">'+esc(String(r.source_type||'TRANSAKSI'))+'</span></div><div class="small">'+new Date(r.journal_date).toLocaleString('id-ID')+'</div><div>'+esc(String(r.description||'-'))+'</div></div>').join(''):'<div class="small">Belum ada transaksi Finance yang POSTED.</div>';}
    panel.classList.remove('hidden');requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(ex){console.error('[HM] Finance:',ex);body.innerHTML='<div class="box"><b>Gagal memuat Finance.</b><div class="small" style="margin-top:6px">'+esc(String(ex?.message||ex||'Terjadi kesalahan saat memuat data.'))+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.openFinance()">↻ Coba Lagi</button></div>';panel.classList.remove('hidden');requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));}
};
window.hmFinanceBack=async function(){await window.openFinance();};
window.openHunterCommissionReport=async function(){
  const p=window.profile||{},role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!p.is_management && role!=='FASILITATOR'){alert('Akses komisi Hunter hanya untuk Management/Fasilitator.');return;}
  const m=document.getElementById('modal'),t=document.getElementById('mt'),b=document.getElementById('mb');if(!m||!t||!b)return;
  t.textContent='🧑‍💼 Komisi Hunter';
  const d=new Date(),start=new Date(d.getFullYear(),d.getMonth(),1),end=d;
  const iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};
  b.innerHTML='<div class="row" style="margin-bottom:12px"><button class="secondary" onclick="hmFinanceBack()">← Kembali Finance</button><button class="primary" onclick="window.loadHunterCommissionReport()">🔄 Refresh</button></div>'+
    '<div class="row"><label style="flex:1">Dari<input id="hunterReportStart" type="date" value="'+iso(start)+'"></label><label style="flex:1">Sampai<input id="hunterReportEnd" type="date" value="'+iso(end)+'"></label></div>'+
    '<label>Outlet<select id="hunterReportOutlet"><option value="ALL">Semua Outlet</option><option value="Majesty Refill Phone">Majesty Refill Phone</option><option value="Majesty Plaza iPhone">Majesty Plaza iPhone</option></select></label>'+
    '<div id="hunterCommissionBody" style="margin-top:12px">Memuat...</div>';
  m.classList.remove('hidden');m.style.display='flex';await window.loadHunterCommissionReport();
};
window.payHunterCommission=async function(id){
  const account=document.getElementById('hunterPayAccount-'+id)?.value||null;
  const note=document.getElementById('hunterPayNote-'+id)?.value?.trim()||null;
  if(!confirm('Bayar komisi Hunter untuk transaksi ini sekarang?'))return;
  const r=await window.sb.rpc('pay_hunter_commission',{p_sale_id:id,p_payment_account_code:account,p_note:note});
  if(r.error){alert('Pembayaran komisi gagal: '+String(r.error.message||r.error));return;}
  alert('Komisi Hunter berhasil dibayar '+hmRp(r.data?.commission||0)+'.\nJurnal: '+String(r.data?.journal_no||'-'));
  await window.loadHunterCommissionReport();
};
window.loadHunterCommissionReport=async function(){
  const box=document.getElementById('hunterCommissionBody'),sb=window.sb;if(!box||!sb)return;
  const start=document.getElementById('hunterReportStart')?.value,end=document.getElementById('hunterReportEnd')?.value,outlet=document.getElementById('hunterReportOutlet')?.value||'ALL';
  box.innerHTML='<div class="small">Memuat komisi Hunter...</div>';
  const r=await sb.rpc('hunter_commission_report',{p_start_date:start,p_end_date:end,p_outlet:outlet});
  if(r.error){box.innerHTML='<div class="danger box">Gagal memuat komisi Hunter: '+esc(String(r.error.message||r.error))+'</div>';return;}
  const d=r.data||{},rows=d.rows||[],money=v=>hmRp(v),name=v=>esc(String(v??'-'));
  const cards=[['Total Komisi',d.total],['Sudah Dibayar',d.paid],['Belum Dibayar',d.unpaid]];
  const list=rows.length?rows.map(x=>{
    const payOptions='<option value="">Kas outlet (default)</option><option value="1101">1101 — Kas Majesty Plaza iPhone</option><option value="1102">1102 — Kas Majesty Refill Phone</option><option value="1103">1103 — Kas MNG Majesty Refill</option><option value="1104">1104 — Kas MNG Majesty Plaza</option><option value="1110">1110 — Bank BCA</option>';
    const payBox=x.paid?'':'<div style="margin-top:10px"><label>Akun pembayaran</label><select id="hunterPayAccount-'+x.id+'">'+payOptions+'</select><label>Catatan pembayaran</label><input id="hunterPayNote-'+x.id+'" placeholder="Opsional"><button class="success" onclick="window.payHunterCommission(\''+x.id+'\')">💸 Bayar Komisi Hunter</button></div>';
    return '<div class="lead"><div class="row" style="justify-content:space-between"><b>'+name(x.hunter_name)+'</b><span>'+ (x.paid?'✅ SUDAH DIBAYAR':'⏳ BELUM DIBAYAR') +'</span></div><div>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+(x.color?' • '+name(x.color):'')+'</div><div class="small">'+new Date(x.sold_at).toLocaleString('id-ID')+' • '+name(x.outlet)+'</div><div>Profit: '+money(x.gross_profit)+' • <b>Komisi Hunter: '+money(x.commission)+'</b></div>'+(x.paid_at?'<div class="small">Dibayar: '+new Date(x.paid_at).toLocaleString('id-ID')+'</div>':'')+payBox+'</div>';
  }).join(''):'<div class="small">Belum ada transaksi Hunter pada periode ini.</div>';
  box.innerHTML='<div class="small">Periode '+name(start)+' s/d '+name(end)+' • Outlet: '+name(outlet)+'</div>'+
    '<div class="stats" style="grid-template-columns:1fr;gap:8px;margin-top:10px">'+cards.map(c=>'<div class="stat" style="min-width:0"><div class="small">'+c[0]+'</div><div class="num" style="'+hmFinNum(c[1])+'">'+money(c[1])+'</div></div>').join('')+'</div>'+
    '<div class="box" style="margin-top:12px"><h3 style="margin-top:0">🧾 Rincian Komisi Hunter</h3>'+list+'</div>';
};
window.openStockSaleApprovals=async function(){
 const p=window.profile||{},role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
 if(!p.is_management&&!['FASILITATOR','DEVELOPER','DEVELOPER APLIKASI'].includes(role)){alert('Akses persetujuan Closing Stock tidak diizinkan.');return;}
 const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle'),modal=document.getElementById('modal');
 if(!panel||!body)throw new Error('Panel Menu Utama belum siap.');
 if(modal){modal.classList.add('hidden');modal.style.display='none';}
 if(title)title.textContent='🔔 Persetujuan Closing Stock';
 panel.classList.remove('hidden'); body.innerHTML='<div class="box">⏳ Memuat pengajuan Closing Stock...</div>';
 const r=await window.sb.rpc('list_stock_sale_approvals');
 if(r.error){body.innerHTML='<div class="danger box">'+esc(String(r.error.message||r.error))+'</div>';return;}
 const rows=Array.isArray(r.data)?r.data:[];
 body.innerHTML=rows.length?rows.map((x,i)=>'<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+esc([x.product,x.variant,x.color].filter(Boolean).join(' — ')||'Produk')+'</b><div class="small">📍 '+esc(x.outlet||'-')+' • 👤 Pengaju: <b>'+esc(x.requester_name||'-')+'</b><br>🕒 '+new Date(x.requested_at).toLocaleString('id-ID')+'</div><div style="margin-top:6px">Harga Jual: <b>Rp'+Number(x.sale_price||0).toLocaleString('id-ID')+'</b> • Harga List: Rp'+Number(x.asking_price||0).toLocaleString('id-ID')+'</div><div class="small">Pembayaran: '+esc(x.pay_now?'Dibayar saat closing':'Piutang Customer')+(x.finance_estimated_fee?' • Estimasi Finance: Rp'+Number(x.finance_estimated_fee).toLocaleString('id-ID'):'')+'</div><div class="row" style="margin-top:9px"><button class="success" type="button" onclick="window.reviewStockSaleApproval(\''+x.id+'\',\'APPROVE\')">✓ Setujui & SOLD</button><button class="danger" type="button" onclick="window.reviewStockSaleApproval(\''+x.id+'\',\'REJECT\')">✕ Tolak</button></div></div>').join(''):'<div class="box" style="text-align:center"><b>✅ Tidak ada Closing Stock yang menunggu persetujuan.</b></div>';
 panel.classList.remove('hidden');panel.scrollIntoView({behavior:'smooth',block:'start'});
};
window.reviewStockSaleApproval=async function(id,action){
 let note=null;if(action==='REJECT'){note=prompt('Alasan penolakan wajib diisi:')||'';if(!note.trim())return;}
 if(action==='APPROVE'&&!confirm('Setujui Closing ini dan ubah Stock menjadi SOLD?'))return;
 const r=await window.sb.rpc('review_stock_sale_approval',{p_approval_id:id,p_action:action,p_note:note});
 if(r.error){alert('Proses persetujuan gagal: '+String(r.error.message||r.error));return;}
 alert(action==='APPROVE'?'Closing disetujui. Stock sekarang SOLD dan masuk Laporan Penjualan.':'Closing ditolak. Stock tetap READY.');
 await window.openStockSaleApprovals();
};

window.hmFinanceLoad=async function(mode){
  const box=document.getElementById('hmFinBox'),sb=window.sb,p=window.profile||{};
  const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!box||!sb||(!p.is_management&&!['FASILITATOR','ADMIN FINANCE','ADMIN FINANCE MAJESTY CELL'].includes(role)))return;
  box.innerHTML='<div class="small">Memuat data Finance...</div>';
  const[start,end]=hmDateRange(mode),x=await sb.rpc('finance_management_dashboard',{p_start_date:start,p_end_date:end});
  if(x.error){box.innerHTML='<div class="danger box">Finance error: '+String(x.error.message||x.error)+'</div>';return;}
  const d=x.data||{},accounts=d.accounts||[];
  const cards=[['💵 Kas & Bank',d.cash_bank],['💰 Uang Masuk',d.cash_in],['💸 Uang Keluar',d.cash_out],['📊 Net Cashflow',d.net_cashflow],['🤝 Hutang Supplier',d.payable_supplier],['👤 Piutang Customer',d.receivable_customer]];
  box.innerHTML='<div class="small">Periode '+start+' s/d '+end+'</div><div class="stats" style="margin-top:10px;grid-template-columns:1fr;gap:8px">'+cards.map(c=>'<div class="stat" style="min-width:0"><div class="small">'+c[0]+'</div><div class="num" style="'+hmFinNum(c[1])+'">'+hmRp(c[1])+'</div></div>').join('')+'</div><div class="box" style="margin-top:10px"><h3 style="margin-top:0">💵 Kas & Bank</h3><div class="small">Pilih akun untuk melihat mutasi</div>'+(accounts.length?accounts.map(a=>'<button class="secondary" style="width:100%;text-align:left;margin:4px 0" onclick="hmOpenCash(\''+a.code+'\')"><div class="row" style="justify-content:space-between"><span><b>'+a.code+'</b> '+a.name+'</span><b>'+hmRp(a.balance)+'</b></div></button>').join(''):'<div class="small">Belum ada saldo.</div>')+'</div><div class="small" style="margin-top:8px">Finance hanya menampilkan arus kas operasional. Neraca, Laba Rugi Accounting, dan Buku Besar tetap di ACCOUNTING.</div>';
  window.hmCashAccounts=accounts;
};
window.hmOpenFinanceReport=async function(){
  const p=window.profile||{},role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!p.is_management&&!['FASILITATOR','ADMIN FINANCE','ADMIN FINANCE MAJESTY CELL'].includes(role)){alert('Akses Laporan Finance tidak diizinkan.');return;}
  const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle'),modal=document.getElementById('modal');
  if(!panel||!body)throw new Error('Panel Laporan Finance belum siap.');
  if(modal){modal.classList.add('hidden');modal.style.display='none';}
  if(title)title.textContent='📋 Laporan Finance';
  panel.classList.remove('hidden');
  body.innerHTML='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">📋 LAPORAN FINANCE</h3><div class="small" style="margin-top:4px">Ringkasan arus dan kewajiban keuangan operasional</div></div><button class="primary" type="button" onclick="window.hmOpenFinanceReport()">🔄 Refresh</button></div><div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="secondary" type="button" onclick="window.hmFinanceReportLoad(\'today\')">📅 Hari Ini</button><button class="secondary" type="button" onclick="window.hmFinanceReportLoad(\'month\')">📆 Bulan Ini</button><button class="secondary" type="button" onclick="window.hmFinanceReportLoad(\'year\')">📊 Tahun Ini</button></div><div id="hmFinanceReportBox" style="margin-top:12px">Memuat laporan...</div></div>';
  await window.hmFinanceReportLoad('month');
  panel.scrollIntoView({behavior:'smooth',block:'start'});
};
window.hmFinanceReportLoad=async function(mode){
  const box=document.getElementById('hmFinanceReportBox'),sb=window.sb;if(!box||!sb)return;
  const[start,end]=hmDateRange(mode);box.innerHTML='<div class="small">Memuat laporan...</div>';
  const x=await sb.rpc('finance_management_dashboard',{p_start_date:start,p_end_date:end});
  if(x.error){box.innerHTML='<div class="danger box">Gagal memuat laporan: '+String(x.error.message||x.error)+'</div>';return;}
  const d=x.data||{},accounts=d.accounts||[],money=v=>hmRp(v);
  const summary=[['Total Pemasukan',d.cash_in],['Total Pengeluaran',d.cash_out],['Surplus / Defisit Kas',d.net_cashflow],['Saldo Kas & Bank',d.cash_bank],['Hutang Supplier',d.payable_supplier],['Piutang Customer',d.receivable_customer]];
  box.innerHTML='<div class="small">Periode '+start+' s/d '+end+'</div><div class="fin-grid" style="margin-top:10px">'+summary.map(x=>'<div class="fin-card"><div class="small">'+x[0]+'</div><div class="fin-big">'+money(x[1])+'</div></div>').join('')+'</div><div class="box" style="margin-top:12px"><h3 style="margin-top:0">📈 Arus Kas Operasional</h3><div class="fin-summary-line"><span>Pemasukan</span><strong>'+money(d.cash_in)+'</strong></div><div class="fin-summary-line"><span>Pengeluaran</span><strong>'+money(d.cash_out)+'</strong></div><div class="fin-summary-line"><b>Net Cashflow</b><strong>'+money(d.net_cashflow)+'</strong></div></div><div class="box" style="margin-top:12px"><h3 style="margin-top:0">🏦 Posisi Kas & Bank</h3>'+(accounts.length?accounts.map(a=>'<div class="fin-summary-line"><span>'+String(a.code||'')+' — '+String(a.name||'')+'</span><strong>'+money(a.balance)+'</strong></div>').join(''):'<div class="small">Belum ada akun aktif.</div>')+'</div><div class="box" style="margin-top:12px"><h3 style="margin-top:0">🤝 Kewajiban & Tagihan</h3><div class="fin-summary-line"><span>Hutang Supplier</span><strong>'+money(d.payable_supplier)+'</strong></div><div class="fin-summary-line"><span>Piutang Customer</span><strong>'+money(d.receivable_customer)+'</strong></div></div><div class="small" style="margin-top:10px">Neraca, Laba Rugi Accounting, dan Buku Besar hanya tersedia di ACCOUNTING.</div>';
};
window.hmFinanceBack=async function(){await window.openFinance();};
window.hmOpenCash=async function(code){const sb=window.sb,p=window.profile||{},a=(window.hmCashAccounts||[]).find(x=>x.code===code);const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
if(!sb||(!p.is_management&&!['FASILITATOR','ADMIN FINANCE','ADMIN FINANCE MAJESTY CELL'].includes(role))||!a)return;const[tb,mb]=[document.getElementById('mt'),document.getElementById('mb')];tb.textContent='💵 '+a.name;mb.innerHTML='<div class="box"><button type="button" class="secondary" onclick="hmFinanceBack()">← Kembali Finance</button><h3 style="margin:8px 0 4px">'+a.code+' — '+a.name+'</h3><div class="small">Mutasi bulan ini</div><div id="hmCashDetail">Memuat...</div></div>';const[start,end]=hmDateRange('month');const x=await sb.from('accounting_accounts').select('id').eq('code',code).eq('active',true).maybeSingle();if(x.error||!x.data){document.getElementById('hmCashDetail').textContent='Akun tidak ditemukan.';return;}const r=await sb.rpc('finance_cash_account_mutation',{p_account_id:x.data.id,p_start_date:start,p_end_date:end});if(r.error){document.getElementById('hmCashDetail').textContent='Gagal memuat mutasi: '+r.error.message;return;}const d=r.data||{};document.getElementById('hmCashDetail').innerHTML='<div class="stats" style="grid-template-columns:1fr;gap:8px">'+[['Saldo Awal',d.opening],['Masuk',d.debit],['Keluar',d.credit],['Saldo Akhir',d.closing]].map(c=>'<div class="stat" style="min-width:0"><div class="small">'+c[0]+'</div><div class="num" style="'+hmFinNum(c[1])+'">'+hmRp(c[1])+'</div></div>').join('')+'</div><div style="margin-top:10px">'+((d.rows||[]).length?(d.rows||[]).map(r=>'<div class="lead"><div class="small">'+new Date(r.date).toLocaleString('id-ID')+' • '+r.journal_no+'</div><b>'+String(r.description||'-')+'</b><div style="margin-top:4px">Masuk: '+hmRp(r.debit)+' • Keluar: '+hmRp(r.credit)+'</div></div>').join(''):'<div class="small">Belum ada mutasi pada periode ini.</div>')+'</div>';};
})();

/* FINANCE SALES — SPAYLATER / KREDIVO / AKULAKU */
(function(){
  const FIN_CODES = ['SPAYLATER','KREDIVO','AKULAKU'];
  let wrapped = false;

  function isFinancePayment(){
    const s=document.getElementById('salePayment');
    const o=s?.selectedOptions?.[0];
    const code=String(o?.dataset?.code||'').toUpperCase();
    if(code==='PAY_LATER'){
      const p=document.getElementById('payLaterProvider');
      return FIN_CODES.includes(String(p?.selectedOptions?.[0]?.dataset?.code||'').toUpperCase());
    }
    return FIN_CODES.includes(code);
  }
  function escF(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function addFinanceFields(){
    const pay=document.getElementById('salePayment');
    if(!pay || document.getElementById('financeSaleBox')) return;
    const box=document.createElement('div');
    box.id='financeSaleBox';
    box.className='box';
    box.style.marginTop='10px';
    box.innerHTML='<b>🏦 Pembagian Finance</b>'+
      '<div class="small" style="margin-top:4px">Finance dapat lebih besar dari harga HP jika ada tarik tunai customer.</div>'+
      '<label>Nominal Finance</label><input id="financeRequestedAmount" type="number" min="0" step="1000" value="0" placeholder="Contoh: 4000000">'+
      '<label>Cash Dibayar Customer</label><input id="financeCashPayment" type="number" min="0" step="1000" value="0" placeholder="Jika ada pembayaran cash">'+
      '<label>Tarik Tunai Customer</label><input id="financeCashoutAmount" type="number" min="0" step="1000" value="0" placeholder="Contoh: 1000000">'+
      '<div id="financeSplitStatus" class="small" style="margin-top:7px"></div>'+
      '<label>Estimasi Potongan Finance</label><input id="financeEstimatedFee" type="number" min="0" step="1000" value="0" placeholder="Contoh: 300000">'+
      '<div id="financeEstimatedNet" class="small" style="margin-top:5px"></div>'+
      '<label>Catatan</label><input id="financeNotes" placeholder="Opsional">';
    pay.parentElement?.insertAdjacentElement('afterend',box);
    const update=()=>{
      const price=Number(document.getElementById('sap')?.value||0);
      const fin=Number(document.getElementById('financeRequestedAmount')?.value||0);
      const cash=Number(document.getElementById('financeCashPayment')?.value||0);
      const cashout=Number(document.getElementById('financeCashoutAmount')?.value||0);
      const fee=Math.max(Number(document.getElementById('financeEstimatedFee')?.value||0),0);
      const balance=(fin+cash)-(price+cashout);
      const status=document.getElementById('financeSplitStatus');
      if(status)status.innerHTML=balance===0?'✅ Pembagian seimbang':'⚠️ Selisih Rp'+Math.abs(balance).toLocaleString('id-ID');
      const net=Math.max(fin-fee,0);
      const h=document.getElementById('financeEstimatedNet');
      if(h)h.textContent='Estimasi dana bersih Finance: Rp'+net.toLocaleString('id-ID')+' • Menunggu Pencairan';
    };
    ['financeRequestedAmount','financeCashPayment','financeCashoutAmount','financeEstimatedFee'].forEach(id=>document.getElementById(id)?.addEventListener('input',update));
    document.getElementById('sap')?.addEventListener('input',update);
    update();
  }
  function removeFinanceFields(){document.getElementById('financeSaleBox')?.remove();}

  function bindPaymentUI(){
    const pay=document.getElementById('salePayment');
    if(!pay) return false;
    if(!pay.dataset.financeBound){
      pay.dataset.financeBound='1';
      pay.addEventListener('change',()=>{
        if(isFinancePayment()) addFinanceFields(); else removeFinanceFields();
        const a=document.getElementById('saleAccount');
        if(a) a.disabled=isFinancePayment() || pay.value==='PIUTANG';
      });
    }
    const provider=document.getElementById('payLaterProvider');
    if(provider && !provider.dataset.financeBound){
      provider.dataset.financeBound='1';
      provider.addEventListener('change',()=>{
        if(isFinancePayment()) addFinanceFields(); else removeFinanceFields();
      });
    }
    if(isFinancePayment()) addFinanceFields();
    return true;
  }

  async function financeSaveS(id){
    if(window.hmStockClosingApprovalMode)return window.__hmOriginalSaveS(id);
    const result=document.getElementById('sr')?.value;
    if(result!=='CLOSING') return window.__hmOriginalSaveS(id);
    const stockId=document.getElementById('ss')?.value;
    const salePrice=Number(document.getElementById('sap')?.value||0);
    const teamMemberIds=[...document.querySelectorAll('.closingSalesMember:checked')].map(x=>x.value);
    const pay=document.getElementById('salePayment');
    const methodId=pay?.value;
    const code=pay?.selectedOptions?.[0]?.dataset?.code;
    if(!FIN_CODES.includes(String(code||'').toUpperCase())) return window.__hmOriginalSaveS(id);
    const fee=Math.max(Number(document.getElementById('financeEstimatedFee')?.value||0),0);
    const financeRequestedAmount=Math.max(Number(document.getElementById('financeRequestedAmount')?.value||0),0);
    const cashPayment=Math.max(Number(document.getElementById('financeCashPayment')?.value||0),0);
    const cashoutAmount=Math.max(Number(document.getElementById('financeCashoutAmount')?.value||0),0);
    const notes=document.getElementById('financeNotes')?.value?.trim()||null;
    if(!stockId)return alert('Stock yang dijual wajib dipilih.');
    if(!salePrice)return alert('Harga Jual Aktual wajib diisi.');
    if(!financeRequestedAmount)return alert('Nominal Finance wajib diisi.');
    if(financeRequestedAmount+cashPayment!==salePrice+cashoutAmount)
      return alert('Pembagian belum seimbang. Finance + Cash harus sama dengan Harga HP + Tarik Tunai.');
    if(fee>financeRequestedAmount)return alert('Estimasi potongan tidak boleh melebihi nominal Finance.');
    const x=await window.sb.rpc('set_sales_closing_with_finance',{
      p_lead_id:id,p_stock_id:stockId,p_sale_price:salePrice,p_team_member_ids:teamMemberIds,
      p_payment_method_id:methodId,p_estimated_fee:fee,p_notes:notes,
      p_finance_requested_amount:financeRequestedAmount,p_cash_payment:cashPayment,p_cashout_amount:cashoutAmount
    });
    if(x.error)return alert('Closing Finance gagal: '+x.error.message);
    alert(code+' tersimpan sebagai PIUTANG FINANCE. Nominal Finance Rp'+Number(financeRequestedAmount).toLocaleString('id-ID')+
      (cashoutAmount?' • Tarik Tunai Rp'+Number(cashoutAmount).toLocaleString('id-ID'):'')+
      '. Dana belum dianggap masuk sampai pencairan dicatat.');
    if(typeof window.closeModal==='function') window.closeModal();
    if(typeof window.render==='function') await window.render();
  }

  async function openFinanceDisbursement(){
    const p=window.profile||{};
    if(!p.is_management && String(p.role||'').toUpperCase()!=='ADMIN FINANCE' && String(p.role||'').toUpperCase()!=='ADMIN FINANCE MAJESTY CELL'){
      alert('Akses pencairan finance tidak diizinkan.'); return;
    }
    const {data:rows,error}=await window.sb.from('sales_transactions')
      .select('id,sold_at,sale_price,discount,finance_status,finance_requested_amount,finance_cash_payment,finance_cashout_amount,finance_estimated_fee,finance_estimated_disbursement,finance_actual_fee,finance_actual_disbursement,finance_disbursement_date,customer_name,finance_payment_method_id,outlet')
      .eq('finance_status','PENDING').order('sold_at',{ascending:false});
    if(error)return alert(error.message);
    const ids=(rows||[]).map(r=>r.finance_payment_method_id).filter(Boolean);
    const pm=ids.length?await window.sb.from('payment_methods').select('id,code,name').in('id',ids):{data:[]};
    const map={};(pm.data||[]).forEach(x=>map[x.id]=x);
    const fa=await window.sb.from('financial_accounts').select('id,name,outlet').eq('active',true).order('name');
    const accounts='<option value="">Pilih akun kas/bank penerima pencairan</option>'+(fa.data||[]).map(x=>'<option value="'+escF(x.id)+'">'+escF(x.name)+(x.outlet?' — '+escF(x.outlet):'')+'</option>').join('');
    const b=document.getElementById('mb'),t=document.getElementById('mt'),m=document.getElementById('modal');
    t.textContent='💳 Pencairan Finance';
    b.innerHTML=(rows||[]).length?rows.map(r=>{
      const provider=map[r.finance_payment_method_id]?.name||'Finance';
      return '<div class="lead"><b>'+escF(provider)+' • '+escF(r.customer_name||'-')+'</b>'+
        '<div class="small">'+escF(r.outlet)+' • '+new Date(r.sold_at).toLocaleString('id-ID')+'</div>'+
        '<div style="margin-top:5px">Harga HP: <b>Rp'+Number(r.sale_price||0).toLocaleString('id-ID')+'</b> • Finance: <b>Rp'+Number(r.finance_requested_amount||0).toLocaleString('id-ID')+'</b> • Cash: Rp'+Number(r.finance_cash_payment||0).toLocaleString('id-ID')+(Number(r.finance_cashout_amount||0)>0?' • Tarik Tunai: <b>Rp'+Number(r.finance_cashout_amount||0).toLocaleString('id-ID')+'</b>':'')+'</div>'+
        '<label>Potongan Aktual</label><input id="ff-'+r.id+'" type="number" min="0" step="1000" value="'+Number(r.finance_estimated_fee||0)+'">'+
        '<label>Akun Pencairan (wajib dipilih)</label><select id="fa-'+r.id+'" required>'+accounts+'</select>'+
        '<label>Tanggal Cair</label><input id="fd-'+r.id+'" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
        '<button class="success" onclick="window.hmDisburseFinance(\''+r.id+'\')">💸 Catat Dana Cair</button></div>';
    }).join(''):'<div class="small">Tidak ada pencairan finance yang menunggu.</div>';
    m.classList.remove('hidden');m.style.display='flex';
  }

  window.hmDisburseFinance=async function(id){
    const fee=Number(document.getElementById('ff-'+id)?.value||0);
    const account=document.getElementById('fa-'+id)?.value;
    const date=document.getElementById('fd-'+id)?.value;
    if(!account)return alert('Pilih akun kas/bank penerima pencairan Finance terlebih dahulu. Transaksi belum disimpan.');
    if(!date)return alert('Tanggal pencairan wajib diisi. Transaksi belum disimpan.');
    if(!Number.isFinite(fee)||fee<0)return alert('Potongan aktual tidak valid. Transaksi belum disimpan.');
    const x=await window.sb.rpc('disburse_finance_sale',{p_sale_id:id,p_actual_fee:fee,p_financial_account_id:account,p_disbursement_date:date,p_notes:'Pencairan Finance aktual'});
    if(x.error)return alert('Pencairan gagal: '+x.error.message);
    alert(x.data?.provider+' cair Rp'+Number(x.data?.actual_disbursement||0).toLocaleString('id-ID')+' • Potongan aktual Rp'+Number(x.data?.actual_fee||0).toLocaleString('id-ID'));
    await openFinanceDisbursement();
  };
  window.openFinanceDisbursement=openFinanceDisbursement;

  async function openFinance(){
const p=window.profile||{};
const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
const roles=Array.isArray(window.hmRoles)?window.hmRoles.map(x=>String(x||'').trim().toUpperCase().replace(/_/g,' ')):[];
const isManagement=!!p.is_management||roles.includes('MANAGEMENT')||role.includes('MANAGEMENT');
const isDeveloper=!!window.developer||role==='DEVELOPER'||role==='DEVELOPER APLIKASI';
if(!isDeveloper&&!isManagement && role!=='FASILITATOR' && role!=='ADMIN FINANCE' && role!=='ADMIN FINANCE MAJESTY CELL'){alert('Akses Finance tidak diizinkan.');return;}
const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle'),modal=document.getElementById('modal');
if(!panel||!body)throw new Error('Panel Finance belum siap.');
if(modal){modal.classList.add('hidden');modal.style.display='none';}
if(title)title.textContent='💰 Finance';
panel.classList.remove('hidden');
body.innerHTML='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">💰 FINANCE MANAGEMENT</h3><div class="small" style="margin-top:4px">Kontrol keuangan Hello Majesty</div></div><button class="primary" type="button" onclick="window.hmFinanceLoad(\'month\')">🔄 Refresh</button></div>'+
'<div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="secondary" type="button" onclick="window.hmFinanceLoad(\'today\')">📅 Hari Ini</button><button class="secondary" type="button" onclick="window.hmFinanceLoad(\'month\')">📆 Bulan Ini</button><button class="secondary" type="button" onclick="window.hmFinanceLoad(\'year\')">📊 Tahun Ini</button></div>'+

'<div id="hmFinBox" style="margin-top:12px">Memuat data Finance...</div></div>';
await window.hmFinanceLoad('month');
panel.scrollIntoView({behavior:'smooth',block:'start'});
}
window.openFinance=openFinance;

window.openFinanceSection=async function(section){
  const p=window.profile||{};
  const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  const isDeveloper=!!window.developer||role==='DEVELOPER'||role==='DEVELOPER APLIKASI';
  if(!isDeveloper&&!p.is_management&&!['FASILITATOR','ADMIN FINANCE','ADMIN FINANCE MAJESTY CELL'].includes(role)){
    alert('Akses Finance tidak diizinkan.'); return;
  }
  if(section==='cashbank'){
    const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
    if(!panel||!body)return;
    if(title)title.textContent='💵 Kas & Bank';
    panel.classList.remove('hidden');
    body.innerHTML='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">💵 KAS & BANK</h3><div class="small" style="margin-top:4px">Saldo dan mutasi rekening keuangan</div></div><button class="primary" type="button" onclick="window.openFinanceSection(\'cashbank\')">🔄 Refresh</button></div><div id="hmCashBankBox" style="margin-top:12px">Memuat saldo...</div></div>';
    const sb=window.sb;
    const box=document.getElementById('hmCashBankBox');
    try{
      if(!sb)throw new Error('Koneksi database belum siap.');
      // Saldo utama bersumber langsung dari Accurate. Tidak memanggil RPC saldo internal pada tampilan ini.
      const accounts=[];
      window.hmCashAccounts=accounts;
      const money=v=>typeof window.hmRp==='function'?window.hmRp(v):('Rp'+Number(v||0).toLocaleString('id-ID'));
      const extractBalance=v=>{
        if(typeof v==='number'&&Number.isFinite(v))return v;
        if(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v)))return Number(v);
        if(v&&typeof v==='object'){
          for(const k of ['balance','endingBalance','ending_balance','amount','value','saldo','endingBalanceAmount','accountBalance']){
            if(v[k]!==undefined&&v[k]!==null&&Number.isFinite(Number(v[k])))return Number(v[k]);
          }
          if(v.d!==undefined)return extractBalance(v.d);
          if(v.r!==undefined)return extractBalance(v.r);
        }
        return null;
      };
      let accurateBalanceHtml='';
      try{
        const ar=await sb.functions.invoke('accurate-sync',{body:{action:'get_accurate_account_balances'}});
        if(ar.error)throw ar.error;
        const payload=ar.data||{};
        if(!payload.ok||!Array.isArray(payload.accounts))throw new Error(payload.error||payload.message||'Accurate belum mengembalikan saldo terverifikasi.');
        let total=0,allKnown=true;
        const rows=payload.accounts.map((a,i)=>{
          const val=extractBalance(a.data);
          if(val===null)allKnown=false;else total+=val;
          const accountName=String(a.account_name||'Akun').replace(/[<>]/g,'');
          const accountNo=String(a.accurate_account_no||'').replace(/[<>]/g,'');
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:#334155;color:#fff;border:1px solid #475569;border-radius:9px;padding:12px 14px;margin-top:8px;box-shadow:0 2px 4px rgba(15,23,42,.10)"><div style="min-width:0;display:flex;align-items:center;gap:10px"><span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 34px;border-radius:8px;background:#1e293b;font-size:17px">'+(i<2?'💵':'🏦')+'</span><div style="min-width:0;color:#fff!important"><div style="display:block!important;color:#fff!important;font-weight:650;line-height:1.35">'+accountName+'</div><div style="display:block!important;color:#cbd5e1!important;font-size:11px;margin-top:3px">Kode Accurate: '+accountNo+'</div></div></div><div style="display:block!important;color:#fff!important;font-weight:750;text-align:right;white-space:nowrap">'+(val===null?'<span style="font-size:12px;font-weight:500">Belum tersedia</span>':money(val))+'</div></div>';
        }).join('');
        accurateBalanceHtml='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px"><div><div style="font-weight:700;color:#0f172a">Saldo rekening terhubung</div><div class="small" style="margin-top:4px">Sumber utama: Accurate Online • per '+String(payload.as_of_date||'-')+'</div></div><span style="display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:700">● LIVE ACCURATE</span></div>'+rows+'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#e2e8f0;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin-top:12px"><div><div style="display:block!important;color:#0f172a!important;font-weight:700">Total saldo Accurate'+(allKnown?'':' (parsial)')+'</div><div style="display:block!important;font-size:11px;color:#475569!important;margin-top:3px">Saldo '+(allKnown?'seluruh akun yang terhubung':'sebagian akun belum terbaca')+'</div></div><div style="display:block!important;color:#0f172a!important;font-size:20px;font-weight:800;text-align:right">'+(allKnown?money(total):'Belum lengkap')+'</div></div><div class="small" style="margin-top:10px">Data dibaca langsung dari Accurate secara read-only. Jurnal dan transaksi internal Hello Majesty tidak diubah.</div>';
        box.innerHTML='<div class="box" style="margin-top:8px;padding:16px"><h3 style="margin-top:0;margin-bottom:14px">💵 Saldo Kas & Bank — Accurate</h3>'+accurateBalanceHtml+'</div>';
      }catch(ae){
        box.innerHTML='<div class="box" style="border:1px solid #f59e0b"><h3 style="margin-top:0">Saldo Accurate belum tersedia</h3><div class="small">'+String(ae?.message||ae||'Gagal membaca saldo Accurate').replace(/[<>]/g,'')+'</div><div class="small" style="margin-top:8px">Untuk mencegah angka yang keliru, saldo internal tidak ditampilkan sebagai pengganti saldo Accurate. Coba Refresh kembali.</div></div>';
      }
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(ex){
      console.error('[HM] Kas & Bank:',ex);
      if(box)box.innerHTML='<div class="danger box"><b>Gagal memuat Kas & Bank.</b><div class="small" style="margin-top:6px">'+String(ex?.message||ex||'Terjadi kesalahan saat memuat saldo.')+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.openFinanceSection(\'cashbank\')">↻ Coba Lagi</button></div>';
    }
    return;
  }
  if(section==='report'){
    await window.hmOpenFinanceReport();
    return;
  }
  const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
  if(!panel||!body)return;
  if(section==='payable'){
    const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
    if(!panel||!body)return;
    if(title)title.textContent='🤝 Hutang & Piutang';
    panel.classList.remove('hidden');
    body.innerHTML='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">🤝 HUTANG & PIUTANG</h3><div class="small" style="margin-top:4px">Kontrol kewajiban, tagihan dan jatuh tempo</div></div><button class="primary" type="button" onclick="window.openFinanceSection(\'payable\')">🔄 Refresh</button></div><div id="hmPayableBox" style="margin-top:12px">Memuat data...</div></div>';
    const box=document.getElementById('hmPayableBox');
    try{
      if(!window.sb)throw new Error('Koneksi database belum siap.');
      const rangeFn=typeof window.hmDateRange==='function'?window.hmDateRange:hmDateRange;
      const [startDate,endDate]=rangeFn('month');
      const res=await window.sb.rpc('finance_management_dashboard',{p_start_date:startDate,p_end_date:endDate});
      if(res.error)throw res.error;
      const d=res.data||{}, money=v=>typeof window.hmRp==='function'?window.hmRp(v):('Rp'+Number(v||0).toLocaleString('id-ID'));
      const payable=Number(d.payable_supplier||0), receivable=Number(d.receivable_customer||0);
      let cellHtml='';
      try{
        const cell=await window.sb.rpc('partner_obligation_summary');
        if(!cell.error){
          const rows=Array.isArray(cell.data)?cell.data:[];
          const list=rows.filter(x=>String(x.partner_name||'').trim().toUpperCase()==='MAJESTY CELL');
          const total=list.reduce((a,x)=>a+Number(x.capital_due||0)+Number(x.profit_share_due||0),0);
          cellHtml='<div class="box" style="margin-top:12px"><h3 style="margin-top:0">🤝 Majesty Cell</h3><div class="fin-summary-line"><span>Kewajiban berjalan</span><b>'+money(total)+'</b></div><div class="small" style="margin-top:6px">Rincian modal dan profit sharing tetap dikelola melalui menu Majesty Cell.</div></div>';
        }
      }catch(e){console.warn('[HM] Cell obligation summary:',e);}
      box.innerHTML='<div class="small">Ringkasan periode '+startDate+' s/d '+endDate+'</div><div class="fin-grid" style="margin-top:10px"><div class="fin-card"><div class="small">🤝 Hutang Supplier</div><div class="fin-big">'+money(payable)+'</div><div class="small">Belum dibayar</div></div><div class="fin-card"><div class="small">👤 Piutang Customer</div><div class="fin-big">'+money(receivable)+'</div><div class="small">Belum diterima</div></div><div class="fin-card"><div class="small">⚠️ Jatuh Tempo</div><div class="fin-big">—</div><div class="small">Data jatuh tempo belum tersedia</div></div></div><div class="box" style="margin-top:12px"><h3 style="margin-top:0">🤝 Hutang Supplier</h3><div class="small">Total kewajiban supplier yang tercatat pada Finance.</div><div class="fin-summary-line" style="margin-top:8px"><b>Total</b><strong>'+money(payable)+'</strong></div></div><div class="box" style="margin-top:12px"><h3 style="margin-top:0">👤 Piutang Customer</h3><div class="small">Total tagihan customer yang belum diterima.</div><div class="fin-summary-line" style="margin-top:8px"><b>Total</b><strong>'+money(receivable)+'</strong></div></div>'+cellHtml+'<div class="box" style="margin-top:12px"><h3 style="margin-top:0">💳 Pembayaran</h3><div class="small">Pencatatan pembayaran hutang/piutang akan dihubungkan ke Kas & Bank setelah sumber data detail tersedia. Kita tidak membuat transaksi fiktif.</div></div>';
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(ex){
      console.error('[HM] Hutang & Piutang:',ex);
      if(box)box.innerHTML='<div class="danger box"><b>Gagal memuat Hutang & Piutang.</b><div class="small" style="margin-top:6px">'+String(ex?.message||ex||'Terjadi kesalahan saat memuat data.')+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.openFinanceSection(\'payable\')">↻ Coba Lagi</button></div>';
    }
    return;
  }
  if(section==='payroll'){
    const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
    if(!panel||!body)return;
    if(title)title.textContent='💳 Payroll & Komisi';
    panel.classList.remove('hidden');
    body.innerHTML='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">💳 PAYROLL & KOMISI</h3><div class="small" style="margin-top:4px">Gaji, komisi, reward dan pembayaran tim</div></div><button class="primary" type="button" onclick="window.openFinanceSection(\'payroll\')">🔄 Refresh</button></div><div id="hmPayrollBox" style="margin-top:12px">Memuat data...</div></div>';
    const box=document.getElementById('hmPayrollBox');
    // Payroll UI cleanup: constrain wide tables/cards to the available viewport, including mobile.
    if(!document.getElementById('hmPayrollLayoutStyles')){
      const style=document.createElement('style');
      style.id='hmPayrollLayoutStyles';
      style.textContent=`
        #hmPayrollBox{width:100%;max-width:100%;min-width:0;box-sizing:border-box;color:#24364b}
        #hmPayrollBox *{box-sizing:border-box}
        #hmPayrollBox>.box{width:100%;max-width:100%;min-width:0;overflow:hidden;margin:12px 0 0;padding:clamp(12px,2.5vw,18px);border:1px solid #dbe3ed;border-radius:16px;background:#fff;box-shadow:0 4px 16px rgba(15,23,42,.05)}
        #hmPayrollBox .fin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        #hmPayrollBox .fin-card{min-width:0;max-width:100%;padding:14px;border-radius:14px;overflow:hidden}
        #hmPayrollBox .fin-big{font-size:clamp(17px,3.5vw,25px);font-weight:800;line-height:1.25;overflow-wrap:anywhere}
        #hmPayrollBox div[style*="overflow:auto"],#hmPayrollBox div[style*="overflow: auto"]{display:block;width:100%;max-width:100%;min-width:0;overflow-x:auto!important;overflow-y:hidden;background:#fff!important;border:1px solid #dbe3ed;border-radius:12px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
        #hmPayrollBox table{width:100%;max-width:none;min-width:680px;border-collapse:collapse;table-layout:auto;background:#fff!important;color:#24364b}
        #hmPayrollBox th,#hmPayrollBox td{padding:10px 9px;white-space:normal;overflow-wrap:break-word;word-break:normal;line-height:1.4;vertical-align:middle}
        #hmPayrollBox th{background:#203b5b!important;color:#fff!important;text-align:left}
        #hmPayrollBox tbody tr:nth-child(even){background:#f7f9fc}
        #hmPayrollBox .small{line-height:1.5;overflow-wrap:anywhere}
        #hmPayrollBox .fin-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
        @media(max-width:640px){
          #hmPayrollBox .fin-grid{grid-template-columns:minmax(0,1fr)!important;gap:8px}
          #hmPayrollBox .fin-card{padding:12px}
          #hmPayrollBox th,#hmPayrollBox td{padding:9px 8px;font-size:12px}
          #hmPayrollBox>.box>div:first-child{flex-wrap:wrap}
          #hmPayrollBox table{min-width:640px}
        }
      `;
      document.head.appendChild(style);
    }
    try{
      const money=v=>typeof window.hmRp==='function'?window.hmRp(v):('Rp'+Number(v||0).toLocaleString('id-ID'));
      const [startDate,endDate]=typeof window.hmDateRange==='function'?window.hmDateRange('month'):hmDateRange('month');
      const d=window.sb?await window.sb.rpc('finance_management_dashboard',{p_start_date:startDate,p_end_date:endDate}):null;
      if(d?.error)throw d.error;
      const x=d?.data||{};
      let commission=Number(x.commission||x.total_commission||0);
      let commissionRows=[];
      try{
        const cr=await window.sb.rpc('management_team_commission_report_v2',{p_month_start:startDate});
        if(!cr.error){
          commissionRows=Array.isArray(cr.data)?cr.data:[];
          // CS Handover is the remainder after CS Closing; do not double-count cs_commission.
          // Keep Payroll aligned with Komisi Tim, including Freelance Internal and Checker.
          commission=commissionRows.reduce((sum,row)=>{
            const handover=Math.max(Number(row.cs_commission||0)-Number(row.cs_closing_commission||0),0);
            return sum+handover+
              Number(row.cs_closing_commission||0)+
              Number(row.sales_commission||0)+
              Number(row.freelance_internal_commission||row.freelance_commission||0)+
              Number(row.hunter_commission||0)+
              Number(row.checker_commission||0)+
              Number(row.content_creator_commission||0)+
              Number(row.facilitator_commission||0);
          },0);
        }
      }catch(e){console.warn('[HM] Commission report:',e);}
      const payroll=Number(x.payroll||x.total_payroll||0);
      let rewardRows=[];
      try{
        let rq=window.sb.from('monthly_outlet_targets').select('outlet,closing_target,closing_actual,bonus_label,bonus_amount').eq('month_start',startDate);
        if(profile?.outlet && !profile?.is_management)rq=rq.eq('outlet',profile.outlet);
        const rr=await rq;
        if(rr.error)throw rr.error;
        rewardRows=(rr.data||[]).map(r=>({...r,eligible:Number(r.closing_actual||0)>=Number(r.closing_target||0)})).filter(r=>Number(r.bonus_amount||0)>0);
      }catch(e){console.warn('[HM] Reward target:',e);}
      const reward=rewardRows.filter(r=>r.eligible).reduce((s,r)=>s+Number(r.bonus_amount||0),0);
      const rewardConfigured=rewardRows.reduce((s,r)=>s+Number(r.bonus_amount||0),0);
      const rewardDetail=rewardRows.length
        ? '<div style="overflow:auto;border:1px solid #e5e7eb;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f8fafc"><th style="text-align:left;padding:10px">Outlet</th><th style="text-align:right;padding:10px">Reward</th><th style="text-align:center;padding:10px">Pencapaian</th><th style="text-align:center;padding:10px">Status</th></tr></thead><tbody>'+
          rewardRows.map(r=>'<tr><td style="padding:9px 10px;border-top:1px solid #eef2f7;font-weight:600">'+String(r.outlet||'-')+'<div class="small">'+String(r.bonus_label||'Reward')+'</div></td><td style="padding:9px 10px;text-align:right;border-top:1px solid #eef2f7;font-weight:700">'+money(r.bonus_amount)+'</td><td style="padding:9px 10px;text-align:center;border-top:1px solid #eef2f7">'+Number(r.closing_actual||0)+' / '+Number(r.closing_target||0)+'</td><td style="padding:9px 10px;text-align:center;border-top:1px solid #eef2f7"><span style="display:inline-block;padding:4px 8px;border-radius:999px;background:'+ (r.eligible ? '#dcfce7' : '#fef3c7') + ';color:' + (r.eligible ? '#166534' : '#92400e') + ';font-size:12px">'+(r.eligible?'Berhak':'Belum berhak')+'</span></td></tr>').join('')+
          '</tbody></table></div>'
        : '<div class="small" style="padding:12px 0">Belum ada reward yang dikonfigurasi untuk periode ini.</div>';
      const commissionItems=commissionRows.map(row=>({
        name:String(row.name||'Tim'),
        amount:['cs_commission','cs_closing_commission','sales_commission','hunter_commission','content_creator_commission','facilitator_commission'].reduce((s,k)=>s+Number(row[k]||0),0)
      })).sort((a,b)=>b.amount-a.amount);
      const commissionDetail=commissionItems.length
        ? '<div style="overflow:auto;border:1px solid #e5e7eb;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f8fafc"><th style="text-align:center;padding:10px;width:48px">No</th><th style="text-align:left;padding:10px">Nama</th><th style="text-align:right;padding:10px">Komisi</th><th style="text-align:center;padding:10px;width:110px">Status</th></tr></thead><tbody>'+
          commissionItems.map((item,n)=>'<tr><td style="padding:9px 10px;text-align:center;border-top:1px solid #eef2f7">'+(n+1)+'</td><td style="padding:9px 10px;border-top:1px solid #eef2f7;font-weight:600">'+item.name+'</td><td style="padding:9px 10px;text-align:right;border-top:1px solid #eef2f7;font-weight:700">'+money(item.amount)+'</td><td style="padding:9px 10px;text-align:center;border-top:1px solid #eef2f7"><span style="display:inline-block;padding:4px 8px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:12px">Belum dibayar</span></td></tr>').join('')+
          '</tbody></table></div>'
        : '<div class="small" style="padding:12px 0">Belum ada data komisi tim untuk periode ini.</div>';
      box.innerHTML='<div class="small">Periode '+startDate+' s/d '+endDate+'</div>'+
        '<div class="fin-grid" style="margin-top:10px">'+
        '<div class="fin-card"><div class="small">👥 Payroll</div><div class="fin-big">'+money(payroll)+'</div><div class="small">Kewajiban gaji</div></div>'+
        '<div class="fin-card"><div class="small">🏆 Komisi</div><div class="fin-big">'+money(commission)+'</div><div class="small">Kewajiban komisi</div></div>'+
        '<div class="fin-card"><div class="small">🎁 Reward</div><div class="fin-big">'+money(reward)+'</div><div class="small">Reward yang tercatat</div></div></div>'+
        '<div class="box" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px"><div><h3 style="margin:0">👤 Payroll</h3><div class="small" style="margin-top:4px">Daftar tim aktif dan status payroll periode berjalan</div></div><span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#fff1c2!important;color:#854d0e!important;-webkit-text-fill-color:#854d0e!important;font-size:12px;font-weight:800;opacity:1!important">Sumber gaji belum tersedia</span></div><div style="overflow:auto;border:1px solid #e5e7eb;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:14px;background:#fff;color:#24364b"><thead><tr style="background:#203b5b"><th style="text-align:left;padding:12px 10px;color:#fff!important;-webkit-text-fill-color:#fff!important;background:#203b5b">Nama</th><th style="text-align:left;padding:12px 10px;color:#fff!important;-webkit-text-fill-color:#fff!important;background:#203b5b">Outlet</th><th style="text-align:left;padding:12px 10px;color:#fff!important;-webkit-text-fill-color:#fff!important;background:#203b5b">Posisi</th><th style="text-align:center;padding:12px 10px;color:#fff!important;-webkit-text-fill-color:#fff!important;background:#203b5b">Status</th></tr></thead><tbody id="hmPayrollTeamRows"><tr><td colspan="4" style="padding:14px;text-align:center;color:#64748b">Memuat tim...</td></tr></tbody></table></div><div class="small" style="margin-top:10px">Nominal gaji, potongan, bonus, total dibayar, tanggal bayar dan bukti pembayaran belum ditampilkan karena belum ada sumber data payroll khusus di database.</div></div>'+
        '<div class="box" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px"><div><h3 style="margin:0">🏆 Komisi Tim</h3><div class="small" style="margin-top:4px">Rekap komisi berdasarkan periode berjalan</div></div><div style="font-size:20px;font-weight:800">'+money(commission)+'</div></div>'+commissionDetail+'<div class="small" style="margin-top:10px">Sumber: laporan Komisi Tim.</div></div>'+
        '<div class="box" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px"><div><h3 style="margin:0">🎁 Reward</h3><div class="small" style="margin-top:4px">Reward berdasarkan target outlet periode berjalan</div></div><div style="font-size:20px;font-weight:800">'+money(reward)+'</div></div>'+rewardDetail+'<div class="small" style="margin-top:10px">Total reward terkonfigurasi: '+money(rewardConfigured)+' • Yang berhak: '+money(reward)+'</div></div>'+
        '<div class="box" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 style="margin:0">💰 Pembayaran</h3><div class="small" style="margin-top:4px">Pembayaran payroll, komisi dan reward dilakukan melalui Kas & Bank.</div></div><button class="primary" type="button" onclick="window.openFinanceSection(\'cashbank\')">💵 Buka Kas & Bank</button></div><div class="fin-grid" style="margin-top:12px"><div class="fin-card"><div class="small">👥 Payroll</div><div class="fin-big">'+money(payroll)+'</div><div class="small">Kewajiban periode ini</div></div><div class="fin-card"><div class="small">🏆 Komisi</div><div class="fin-big">'+money(commission)+'</div><div class="small">Belum dibayar</div></div><div class="fin-card"><div class="small">🎁 Reward</div><div class="fin-big">'+money(reward)+'</div><div class="small">Yang berhak</div></div></div><div class="small" style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#f8fafc">Alur pembayaran: <b>tentukan penerima → pilih Kas/Bank → catat uang keluar → simpan bukti transaksi</b>. Pembayaran yang sudah dicatat akan menjadi bagian dari riwayat Kas & Bank.</div></div>';
      try{
        const tr=await window.sb.from('team_profiles').select('name,outlet,role,active').eq('active',true).order('name');
        const rows=(Array.isArray(tr.data)?tr.data:[]).filter(t=>{
          const role=String(t.role||'').trim().toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
          // Payroll hanya untuk anggota tim operasional; DIVISI dan MITRA STOCKIST bukan penerima payroll tim.
          return role!=='DIVISI' && role!=='MITRA STOCKIST';
        });
        const el=document.getElementById('hmPayrollTeamRows');
        if(el)el.innerHTML=rows.length?rows.map(t=>'<tr style="background:#fff!important"><td style="padding:11px 10px;border-top:1px solid #e2e8f0;font-weight:700;color:#24364b!important;-webkit-text-fill-color:#24364b!important;background:#fff!important">'+String(t.name||'-')+'</td><td style="padding:11px 10px;border-top:1px solid #e2e8f0;color:#24364b!important;-webkit-text-fill-color:#24364b!important;background:#fff!important">'+String(t.outlet||'-')+'</td><td style="padding:11px 10px;border-top:1px solid #e2e8f0;color:#24364b!important;-webkit-text-fill-color:#24364b!important;background:#fff!important">'+String(t.role||'-')+'</td><td style="padding:11px 10px;text-align:center;border-top:1px solid #e2e8f0;background:#fff!important"><span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e8eef5!important;color:#334155!important;-webkit-text-fill-color:#334155!important;font-size:12px;font-weight:800;opacity:1!important">Belum dihitung</span></td></tr>').join(''):'<tr><td colspan="4" style="padding:14px;text-align:center;color:#64748b">Belum ada tim aktif.</td></tr>';
      }catch(e){console.warn('[HM] Payroll team:',e);}
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(ex){
      console.error('[HM] Payroll & Komisi:',ex);
      if(box)box.innerHTML='<div class="danger box"><b>Gagal memuat Payroll & Komisi.</b><div class="small" style="margin-top:6px">'+String(ex?.message||ex||'Terjadi kesalahan saat memuat data.')+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.openFinanceSection(\'payroll\')">↻ Coba Lagi</button></div>';
    }
    return;
  }
  if(!config)return;
  if(title)title.textContent=config.title;
  body.innerHTML='<div class="box"><button type="button" class="secondary" onclick="window.openFinance()">← Kembali Finance</button><h3 style="margin:12px 0 4px">'+config.title+'</h3><div class="small">Menu sudah disiapkan sebagai bagian dari Admin Finance.</div><div class="role-home-submenu" style="margin-top:12px">'+config.items.map(x=>'<div class="role-home-submenu-item"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('')+'</div><div class="small" style="margin-top:12px">Detail transaksi dan laporan modul ini akan ditata pada tahap berikutnya.</div></div>';
  panel.classList.remove('hidden');
  panel.scrollIntoView({behavior:'smooth',block:'start'});
};

function patchAfterInline(){
    if(typeof window.saveS==='function' && !window.__hmOriginalSaveS){
      window.__hmOriginalSaveS=window.saveS;
      window.saveS=financeSaveS;
      wrapped=true;
    }
    bindPaymentUI();
  }

  const obs=new MutationObserver(()=>{try{patchAfterInline();}catch(e){console.error('[HM Finance Sales]',e)}});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(patchAfterInline,500);
  window.hmFinanceSalesReady=true;
})();

/* HM LEAD NEW — prevent double submission on mobile */
(function(){
  function installLeadSaveGuard(){
    const btn=document.getElementById('saveLeadBtn');
    if(!btn || btn.dataset.hmDoubleGuard==='1')return;
    const original=btn.onclick;
    if(typeof original!=='function')return;
    btn.dataset.hmDoubleGuard='1';
    btn.onclick=function(e){
      if(btn.dataset.hmSaving==='1')return;
      btn.dataset.hmSaving='1';
      btn.disabled=true;
      btn.style.pointerEvents='none';
      btn.setAttribute('aria-busy','true');
      btn.textContent='Menyimpan...';
      let result;
      try{ result=original.call(this,e); }
      catch(err){
        btn.dataset.hmSaving='0';
        btn.disabled=false;
        btn.style.pointerEvents='auto';
        btn.removeAttribute('aria-busy');
        btn.textContent='Simpan Lead';
        throw err;
      }
      Promise.resolve(result).finally(()=>{
        if(document.getElementById('saveLeadBtn')===btn){
          btn.dataset.hmSaving='0';
          btn.disabled=false;
          btn.style.pointerEvents='auto';
          btn.removeAttribute('aria-busy');
          btn.textContent='Simpan Lead';
        }
      });
      return result;
    };
  }
  const oldAddLead=window.addLead;
  if(typeof oldAddLead==='function'){
    window.addLead=async function(){
      const result=await oldAddLead.apply(this,arguments);
      installLeadSaveGuard();
      return result;
    };
  }
  document.addEventListener('click',function(e){
    if(e.target?.id==='saveLeadBtn')setTimeout(installLeadSaveGuard,0);
  },true);
})();

/* HM PAY-LATER DEFAULT BANK PATCH: choose active Bank Mandiri automatically. */
(function hmPayLaterMandiriDefault(){
  if(window.__hmPayLaterMandiriDefaultInstalled)return;
  window.__hmPayLaterMandiriDefaultInstalled=true;
  function applyMandiriDefault(){
    const payment=document.getElementById('salePayment');
    const account=document.getElementById('saleAccount');
    const box=document.getElementById('saleAccountBox');
    const hint=document.getElementById('saleAccountHint');
    if(!payment||!account||payment.value!=='PAY_LATER')return;
    if(box)box.classList.remove('hidden');
    const options=[...account.options].filter(o=>o.value);
    options.forEach(o=>{
      const type=String(o.dataset.accountType||'').trim().toUpperCase();
      if(type==='BANK')o.hidden=false;
    });
    const mandiri=options.find(o=>{
      const type=String(o.dataset.accountType||'').trim().toUpperCase();
      return type==='BANK' && /mandiri/i.test(o.textContent||'');
    });
    if(mandiri){
      account.value=mandiri.value;
      if(hint)hint.textContent='Rekening pencairan otomatis: Bank Mandiri.';
    }else if(hint){
      hint.textContent='Rekening Bank Mandiri belum tersedia pada akun aktif. Management perlu menambahkan atau mengaktifkan akun Bank Mandiri.';
    }
  }
  document.addEventListener('change',function(e){
    if(e.target?.id==='salePayment'||e.target?.id==='payLaterProvider'){
      setTimeout(applyMandiriDefault,0);
    }
  },true);
  const observer=new MutationObserver(()=>setTimeout(applyMandiriDefault,0));
  const start=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true});applyMandiriDefault();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
