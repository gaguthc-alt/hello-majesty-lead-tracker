(function(){
function hmRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID');}
function hmFinNum(v){return 'font-size:clamp(18px,5.5vw,24px);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'}
function hmDateRange(mode){const d=new Date(),iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};if(mode==='today'){const s=new Date(d.getFullYear(),d.getMonth(),d.getDate());return[iso(s),iso(s)];}if(mode==='year')return[d.getFullYear()+'-01-01',d.getFullYear()+'-12-31'];return[iso(new Date(d.getFullYear(),d.getMonth(),1)),iso(new Date(d.getFullYear(),d.getMonth()+1,0))];}
window.hmDateRange=hmDateRange;
window.openCellFinanceReport=async function(){
  const p=window.profile||{},role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!p.is_management && role!=='ADMIN FINANCE MAJESTY CELL' && role!=='FASILITATOR'){alert('Akses laporan tidak diizinkan.');return;}
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
  target.innerHTML='<div class="cell-report-actions"><button class="secondary" type="button" onclick="hmCloseMainMenu()">✖ Tutup</button><button class="primary" type="button" onclick="window.loadCellFinanceReport()">🔄 Refresh</button></div>'+
    '<div class="cell-report-filters"><label>Dari<input id="cellReportStart" type="date" value="'+iso(start)+'"></label><label>Sampai<input id="cellReportEnd" type="date" value="'+iso(end)+'"></label><label class="cell-report-outlet">Outlet yang Dipantau<select id="cellReportOutlet" onchange="window.loadCellFinanceReport()"><option value="ALL">Semua Outlet Cell</option><option value="Majesty Refill Phone">Majesty Refill Phone</option><option value="Majesty Plaza iPhone">Majesty Plaza iPhone</option></select></label></div>'+
    '<div id="cellFinanceReportBody" class="cell-report-body">Memuat...</div>';
  await window.loadCellFinanceReport();
};
window.loadCellFinanceReport=async function(){
  const box=document.getElementById('cellFinanceReportBody'),sb=window.sb;if(!box||!sb)return;
  const start=document.getElementById('cellReportStart')?.value,end=document.getElementById('cellReportEnd')?.value,outlet=document.getElementById('cellReportOutlet')?.value||'ALL';
  box.innerHTML='<div class="small">Memuat laporan Majesty Cell...</div>';
  const [rep,stockRep,imeiActive,imeiHistorical]=await Promise.all([sb.rpc('majesty_cell_finance_report',{p_start_date:start,p_end_date:end,p_outlet:outlet}),sb.rpc('majesty_cell_stock_detail_report',{p_outlet:outlet}),sb.from('stock_units').select('id,imei_1').eq('partner_name','Majesty Cell'),sb.from('partner_historical_stock_details').select('id,imei_1').eq('partner_name','Majesty Cell')]);
  if(rep.error){box.innerHTML='<div class="danger box">Gagal memuat laporan: '+esc(String(rep.error.message||rep.error))+'</div>';return;}
  const d=rep.data||{},stockDetail=stockRep.data||[],tot=d.stock_totals||{},rows=d.receipts||[],sales=d.sales||[],due=d.capital_due||[],historicalSales=d.historical_sales||[],historicalDue=d.historical_capital_due||[],profit=d.profit_sharing||[],sett=d.settlements||[],imeiMap=new Map([...(imeiActive.data||[]),...(imeiHistorical.data||[])].map(x=>[String(x.id),x.imei_1])); const soldDisplay=Number(tot.sold_units||0)+Number(historicalSales.length||0);
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID'),name=x=>esc(String(x||'-'));
  const stockOrder=['READY','RETURN','SOLD']; const stockHtml=stockOrder.map(st=>{const x=(d.stock_summary||[]).find(v=>String(v.status||'').toUpperCase()===st);return '<div class="fin-card"><div class="small">'+st+'</div><div class="fin-big">'+Number(x?.units||0)+' unit</div><div class="small">'+money(x?.cost||0)+'</div></div>';}).join('');
  const stockDetailHtml=stockDetail.map(x=>'<div class="lead"><div class="small"><b>'+name(x.outlet)+'</b></div><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">Status: '+name(x.status)+' • '+name(x.color)+(x.grade?' • Grade '+name(x.grade):'')+(x.battery_health!=null?' • BH '+Number(x.battery_health)+'%':'')+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.asking_price)+(x.sold_price!=null?' • Terjual: '+money(x.sold_price):'')+'</div></div>').join('')||'<div class="small">Belum ada stock Cell.</div>';
  const receiptHtml=rows.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.requested_at).toLocaleString('id-ID')+' • '+name(x.status)+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.asking_price)+'</div><div class="small">Input: '+name(x.requester)+' • Verifikasi: '+name(x.reviewer)+'</div>'+(x.review_note?'<div class="small">Catatan: '+name(x.review_note)+'</div>':'')+'</div>').join('')||'<div class="small">Tidak ada barang masuk pada periode ini.</div>';
  const salesHtml=sales.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.sold_at).toLocaleString('id-ID')+(imeiMap.get(String(x.stock_unit_id||x.id))?' • IMEI '+name(imeiMap.get(String(x.stock_unit_id||x.id))):'')+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.sale_price)+' • Profit: '+money(x.gross_profit)+'</div></div>').join(''); const historicalSalesHtml=historicalSales.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">Penjualan sebelum aplikasi • '+new Date(x.sold_at).toLocaleDateString('id-ID')+'</div><div>Modal tercatat: <b>'+money(x.capital_due||0)+'</b> • Harga jual: —</div></div>').join(''); const combinedSalesHtml=salesHtml+historicalSalesHtml||'<div class="small">Tidak ada penjualan pada periode ini.</div>'; const salesNominal=sales.reduce((a,x)=>a+Number(x.sale_price||0),0);
  const dueHtml=due.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.sold_at).toLocaleString('id-ID')+(imeiMap.get(String(x.stock_unit_id||x.id))?' • IMEI '+name(imeiMap.get(String(x.stock_unit_id||x.id))):'')+'</div><div>Modal wajib dibayar: <b>'+money(x.capital_due)+'</b> • Jual: '+money(x.sale_price)+' • Profit: '+money(x.gross_profit)+'</div></div>').join(''); const historicalDueHtml=historicalDue.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">Saldo historis sebelum aplikasi • '+new Date(x.sold_at).toLocaleDateString('id-ID')+'</div><div>Modal Cell belum disetor: <b>'+money(x.capital_due)+'</b></div></div>').join(''); const combinedDueHtml=dueHtml+historicalDueHtml||'<div class="small">Tidak ada modal yang belum disetor.</div>'; const dueCount=due.length+historicalDue.length; const dueTotal=due.reduce((a,x)=>a+Number(x.capital_due||0),0)+historicalDue.reduce((a,x)=>a+Number(x.capital_due||0),0); const salesCount=sales.length+historicalSales.length; const salesTotal=sales.reduce((a,x)=>a+Number(x.sale_price||0),0); const historicalSalesTotal=historicalSales.reduce((a,x)=>a+Number(x.sale_price||0),0);
  const profitHtml=profit.map(x=>'<div class="lead"><b>'+name(x.period_start)+' s/d '+name(x.period_end)+'</b><div>'+Number(x.transactions||0)+' transaksi • Profit: '+money(x.total_profit)+'</div><div>Hak Cell '+Number(x.profit_share_pct||30)+'%: <b>'+money(x.partner_profit_share)+'</b></div></div>').join('')||'<div class="small">Belum ada profit sharing.</div>';
  const settHtml=sett.map(x=>'<div class="lead"><b>'+name(x.type)+'</b><div class="small">'+name(x.date)+' • '+name(x.status)+'</div><div>Nominal: <b>'+money(x.amount)+'</b></div>'+(x.note?'<div class="small">'+name(x.note)+'</div>':'')+'</div>').join('')||'<div class="small">Belum ada settlement pada periode ini.</div>';
  box.innerHTML='<div class="small">Periode '+name(start)+' s/d '+name(end)+' • Outlet: '+name(d.outlet_filter||outlet)+'</div>'+
    '<div class="fin-grid" style="margin-top:10px"><div class="fin-card"><div class="small">READY</div><div class="fin-big">'+Number(tot.ready_units||0)+' unit</div><div class="small">'+money(tot.ready_cost)+'</div></div><div class="fin-card"><div class="small">SOLD</div><div class="fin-big">'+soldDisplay+' unit</div><div class="small">Modal '+money(Number(tot.sold_cost||0)+historicalDue.reduce((a,x)=>a+Number(x.capital_due||0),0))+'</div></div><div class="fin-card"><div class="small">PENDING</div><div class="fin-big">'+Number(tot.pending_units||0)+' unit</div></div><div class="fin-card"><div class="small">RETURN</div><div class="fin-big">'+Number(tot.return_units||0)+' unit</div></div></div>'+
    '<div class="box" style="margin-top:12px"><h3>📦 1. Barang Masuk Cell</h3>'+receiptHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>📱 2. Stock Cell</h3>'+stockHtml+'<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Lihat detail semua unit</summary><div style="margin-top:8px">'+stockDetailHtml+'</div></details></div>'+
    '<div class="box" style="margin-top:12px"><h3>💰 3. Modal Cell Belum Disetor</h3><div class="fin-summary-line"><b>'+dueCount+' unit</b><strong>'+money(dueTotal)+'</strong></div>'+combinedDueHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>🧾 4. Penjualan Stock Cell</h3><div class="fin-summary-line"><b>'+salesCount+' unit</b><strong>'+money(salesNominal+historicalSalesTotal)+'</strong></div>'+combinedSalesHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>🤝 5. Profit Sharing</h3>'+profitHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>💸 6. Riwayat Settlement</h3>'+settHtml+'</div>';
};
window.openPartnerSettlement=async function(){
  const p=window.profile||{};
  const role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!p.is_management && role!=='ADMIN FINANCE MAJESTY CELL'){
    alert('Akses settlement tidak diizinkan.');
    return;
  }
  const panel=document.getElementById('hmMenuPanel');
  const body=document.getElementById('hmMenuPanelBody');
  const title=document.getElementById('hmMenuPanelTitle');
  const modal=document.getElementById('modal');
  if(!panel||!body) throw new Error('Panel Menu Utama belum siap.');
  if(modal){modal.classList.add('hidden');modal.style.display='none';}
  if(title)title.textContent='🤝 Kewajiban Majesty Cell';
  panel.classList.remove('hidden');
  body.innerHTML='<div class="box"><div class="small">⏳ Memuat kewajiban Majesty Cell...</div></div>';
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
  try{
    if(!window.sb)throw new Error('Koneksi database belum siap.');
    const res=await window.sb.rpc('partner_obligation_summary');
    if(res.error)throw res.error;
    const rows=Array.isArray(res.data)?res.data:[];
    const list=rows.filter(x=>String(x.partner_name||'').trim().toUpperCase()==='MAJESTY CELL');
    const refill=list.find(x=>String(x.outlet||'')==='Majesty Refill Phone')||{};
    const plaza=list.find(x=>String(x.outlet||'')==='Majesty Plaza iPhone')||{};
    const card=(label,x,buttons)=>{
      const capital=Number(x.capital_due||0), profit=Number(x.profit_share_due||0);
      return '<div class="box" style="margin-top:12px"><h3>'+label+'</h3><div class="fin-grid"><div class="fin-card"><div class="small">Modal Belum Disetor</div><div class="fin-big">'+money(capital)+'</div></div><div class="fin-card"><div class="small">Profit Sharing</div><div class="fin-big">'+money(profit)+'</div></div></div><div style="margin-top:10px"><b>Total Kewajiban: '+money(capital+profit)+'</b></div>'+buttons+'</div>';
    };
    body.innerHTML='<div class="small">Kewajiban Majesty Cell dipisahkan berdasarkan outlet.</div>'+
      card('📱 Majesty Refill Phone',refill,'<div class="row" style="margin-top:12px"><button class="primary" type="button" onclick="window.loadPartnerSettlementDetail(\'Majesty Refill Phone\')">📋 Rincian & Setor Modal</button><button class="secondary" type="button" onclick="window.loadPartnerProfitSettlement(\'Majesty Refill Phone\')">🤝 Setor Profit Sharing</button></div>')+
      card('📱 Majesty Plaza iPhone',plaza,'<div class="row" style="margin-top:12px"><button class="primary" type="button" onclick="window.loadPartnerSettlementDetail(\'Majesty Plaza iPhone\')">📋 Rincian & Setor Modal</button></div>')+
      '<div id="partnerSettlementDetail" style="margin-top:14px"></div>';
    panel.classList.remove('hidden');
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(ex){
    console.error('[HM] Partner obligation summary:',ex);
    body.innerHTML='<div class="box"><b>Gagal memuat Kewajiban Cell.</b><div class="small" style="margin-top:6px">'+String(ex?.message||ex||'Terjadi kesalahan saat memuat data.')+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.openPartnerSettlement()">↻ Coba Lagi</button></div>';
    panel.classList.remove('hidden');
  }
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
  const box=document.getElementById('partnerSettlementDetail');if(!box)return;
  const now=new Date(),start=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const {data:r}=await sb.from('partner_profit_share_monthly').select('*').eq('outlet','Majesty Refill Phone').eq('partner_name','Majesty Cell').eq('period_start',start).maybeSingle();
  const gross=Number(r?.partner_profit_share||0);
  const {data:p}=await sb.from('partner_settlements').select('amount').eq('partner_name','Majesty Cell').eq('outlet','Majesty Refill Phone').eq('settlement_type','PROFIT_SHARING').eq('status','PAID').eq('period_start',start);
  const paid=(p||[]).reduce((s,x)=>s+Number(x.amount||0),0),due=Math.max(gross-paid,0);
  box.innerHTML='<div class="lead"><b>Profit Sharing '+start+'</b><br>Hak Majesty Cell: '+hmRp(gross)+'<br>Sudah disetor: '+hmRp(paid)+'<br><b>Sisa: '+hmRp(due)+'</b>'+(due>0?'<div style="margin-top:10px"><button class="success" onclick="window.payPartnerProfitSettlement(\''+start+'\')">💸 Setor Sekarang</button></div>':'<div class="small" style="margin-top:8px">Tidak ada profit sharing yang perlu disetor.</div>')+'</div>';
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
  if(outlet==='Majesty Plaza iPhone'){
    const {data:rows,error}=await sb.from('partner_historical_stock_details').select('*').eq('outlet',outlet).eq('partner_name','Majesty Cell').order('created_at',{ascending:true});
    if(error){box.innerHTML='<div class="small">'+error.message+'</div>';return;}
    const units=rows||[], total=units.reduce((s,r)=>s+Number(r.cost||0),0), unpaid=units.filter(r=>!r.settlement_id), unpaidTotal=unpaid.reduce((s,r)=>s+Number(r.cost||0),0);
    const escV=v=>esc(String(v??''));
    box.innerHTML=units.length?
      '<div class="small">5 unit historis stock Majesty Cell yang sudah terjual di Plaza. Centang unit yang ingin dibayar sekarang.</div>'+
      units.map((r,i)=>'<label style="display:block;padding:11px 0;border-bottom:1px solid #ddd;'+(r.settlement_id?'opacity:.55':'')+'"><input class="partner-plaza-capital-check" type="checkbox" value="'+r.id+'" data-amount="'+Number(r.cost||0)+'" '+(r.settlement_id?'disabled':'')+' style="width:auto;margin-right:8px">'+
      '<b>'+String(i+1)+'. '+escV(r.product_name)+' '+escV(r.color||'')+' '+(r.storage_gb?escV(r.storage_gb)+'GB':'')+'</b><br><span class="small">'+escV(r.condition||'')+(r.grade?' • Grade '+escV(r.grade):'')+' • Modal '+hmRp(r.cost)+' • IMEI '+escV(r.imei_1||'-')+(r.settlement_id?' • SUDAH DISETOR':'')+'</span></label>').join('')+
      '<div style="margin-top:10px"><b>Total 5 unit: '+hmRp(total)+'</b><br><span class="small">Belum disetor: '+hmRp(unpaidTotal)+'</span></div>'+
      (unpaid.length?'<button class="success" style="margin-top:12px" onclick="window.payPartnerPlazaHistoricalCapital()">💸 Setor Modal Terpilih</button>':'<div class="small" style="margin-top:10px">Semua modal historis Plaza sudah disetor.</div>')
      :'<div class="small">Rincian historis Plaza belum tersedia.</div>';
    return;
  }
  const {data:rows,error}=await sb.rpc('partner_capital_due_detail',{p_outlet:outlet});
  if(error){box.innerHTML='<div class="small">Gagal memuat rincian modal Cell: '+esc(String(error.message||error))+'</div>';return;}
  const units=rows||[];
  box.innerHTML=units.length
    ? '<div class="small">Ditemukan '+units.length+' unit modal Cell yang belum disetor. Centang unit yang ingin dibayar sekarang.</div>'+
      units.map(r=>{
        const product=String(r.product_name||'Produk tidak ditemukan');
        const variant=String(r.variant||'');
        const color=String(r.color||'');
        const grade=r.grade?'<span> • Grade '+esc(String(r.grade))+'</span>':'';
        const bh=r.battery_health!=null?' • BH '+Number(r.battery_health)+'%':'';
        const imei=r.imei_1||'-';
        return '<label style="display:block;padding:11px 0;border-bottom:1px solid #ddd">'+
          '<input class="partner-capital-check" type="checkbox" value="'+r.stock_unit_id+'" data-amount="'+Number(r.capital_due||0)+'" style="width:auto;margin-right:8px">'+
          '<b>'+esc(product)+'</b>'+
          (variant?' — '+esc(variant):'')+
          (color?' • '+esc(color):'')+
          '<br><span class="small">'+grade.replace(/^<span>/,'').replace(/<\/span>$/,'')+
          bh+' • Modal '+hmRp(r.capital_due)+' • IMEI '+esc(String(imei))+
          '</span></label>';
      }).join('')+
      '<button class="success" style="margin-top:12px" onclick="window.payPartnerCapitalSettlement()">💸 Setor Modal Terpilih</button>'
    : '<div class="small">Tidak ada modal Cell yang belum disetor.</div>';
};
window.payPartnerPlazaHistoricalCapital=async function(){
  const ids=[...document.querySelectorAll('.partner-plaza-capital-check:checked')].map(x=>x.value);
  if(!ids.length){alert('Pilih minimal 1 unit.');return;}
  if(!confirm('Setor modal Plaza untuk '+ids.length+' unit terpilih sekarang?'))return;
  const {data,error}=await sb.rpc('create_partner_historical_capital_settlement',{p_ids:ids,p_settlement_date:new Date().toISOString().slice(0,10),p_note:'Pembayaran modal historis Majesty Cell - Plaza'});
  if(error){alert(error.message);return;}
  alert('Settlement modal Plaza berhasil. '+hmRp(data?.amount||0)+' disetor.');
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
  const canApprove=role==='FASILITATOR'||role==='ADMIN FINANCE MAJESTY CELL'||roles.includes('FASILITATOR')||roles.includes('ADMIN FINANCE MAJESTY CELL');
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
  if(!isDeveloper){alert('Finance sementara hanya dapat diakses Developer Aplikasi.');return;}
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
    const d=x.data||{},accounts=d.accounts||[],money=v=>hmRp(v);
    const cards=[['💵 Kas & Bank',d.cash_bank],['💰 Uang Masuk',d.cash_in],['💸 Uang Keluar',d.cash_out],['📊 Net Cashflow',d.net_cashflow],['🤝 Hutang Supplier',d.payable_supplier],['👤 Piutang Customer',d.receivable_customer]];
    body.innerHTML='<div class="row" style="margin-bottom:10px"><button class="secondary" type="button" onclick="hmCloseMainMenu()">✖ Tutup</button><button class="primary" type="button" onclick="window.openFinance()">🔄 Refresh</button></div>'+
      '<div class="small">Finance • periode '+start+' s/d '+end+'</div>'+
      '<div class="fin-grid" style="margin-top:10px">'+cards.map(c=>'<div class="fin-card"><div class="small">'+c[0]+'</div><div class="fin-big">'+money(c[1])+'</div></div>').join('')+'</div>'+
      '<div class="box" style="margin-top:12px"><h3 style="margin-top:0">🧾 Transaksi Finance</h3><div class="small">Transaksi yang sudah tercatat dan POSTED.</div><div id="hmFinanceTransactions" style="margin-top:8px">Memuat...</div></div>'+
      '<div class="box" style="margin-top:12px"><h3 style="margin-top:0">💵 Posisi Kas & Bank</h3><div class="small">Pilih akun untuk melihat mutasi.</div><div style="margin-top:8px">'+(accounts.length?accounts.map(a=>'<button class="secondary" style="width:100%;text-align:left;margin:4px 0" onclick="hmOpenCash(\''+String(a.code||'').replace(/'/g,"\\'")+'\')"><div class="row" style="justify-content:space-between"><span><b>'+esc(String(a.code||''))+'</b> '+esc(String(a.name||''))+'</span><b>'+money(a.balance)+'</b></div></button>').join(''):'<div class="small">Belum ada saldo.</div>')+'</div></div>'+
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
    return FIN_CODES.includes(String(o?.dataset?.code||'').toUpperCase());
  }
  function escF(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function addFinanceFields(){
    const pay=document.getElementById('salePayment');
    if(!pay || document.getElementById('financeSaleBox')) return;
    const box=document.createElement('div');
    box.id='financeSaleBox';
    box.className='box';
    box.style.marginTop='10px';
    box.innerHTML='<b>🏦 Finance</b>'+
      '<div class="small" style="margin-top:4px">Potongan di bawah hanya estimasi. Angka final dapat direvisi saat dana benar-benar cair.</div>'+
      '<label>Estimasi Potongan Finance</label><input id="financeEstimatedFee" type="number" min="0" step="1000" value="0" placeholder="Contoh: 300000">'+
      '<div id="financeEstimatedNet" class="small" style="margin-top:5px"></div>'+
      '<label>Catatan</label><input id="financeNotes" placeholder="Opsional">';
    pay.parentElement?.insertAdjacentElement('afterend',box);
    const update=()=>{
      const price=Number(document.getElementById('sap')?.value||0);
      const fee=Math.max(Number(document.getElementById('financeEstimatedFee')?.value||0),0);
      const net=Math.max(price-fee,0);
      const h=document.getElementById('financeEstimatedNet');
      if(h)h.textContent='Estimasi dana cair: Rp'+net.toLocaleString('id-ID')+' • Status: Menunggu Pencairan';
    };
    document.getElementById('sap')?.addEventListener('input',update);
    document.getElementById('financeEstimatedFee')?.addEventListener('input',update);
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
    const notes=document.getElementById('financeNotes')?.value?.trim()||null;
    if(!stockId)return alert('Stock yang dijual wajib dipilih.');
    if(!salePrice)return alert('Harga Jual Aktual wajib diisi.');
    if(fee>salePrice)return alert('Estimasi potongan tidak boleh melebihi harga jual.');
    const x=await window.sb.rpc('set_sales_closing_with_finance',{
      p_lead_id:id,p_stock_id:stockId,p_sale_price:salePrice,p_team_member_ids:teamMemberIds,
      p_payment_method_id:methodId,p_estimated_fee:fee,p_notes:notes
    });
    if(x.error)return alert('Closing Finance gagal: '+x.error.message);
    alert(code+' tersimpan sebagai PIUTANG FINANCE. Estimasi cair Rp'+Number(x.data?.estimated_disbursement||0).toLocaleString('id-ID')+'. Dana belum dianggap masuk sampai pencairan dicatat.');
    if(typeof window.closeModal==='function') window.closeModal();
    if(typeof window.render==='function') await window.render();
  }

  async function openFinanceDisbursement(){
    const p=window.profile||{};
    if(!p.is_management && String(p.role||'').toUpperCase()!=='ADMIN FINANCE' && String(p.role||'').toUpperCase()!=='ADMIN FINANCE MAJESTY CELL'){
      alert('Akses pencairan finance tidak diizinkan.'); return;
    }
    const {data:rows,error}=await window.sb.from('sales_transactions')
      .select('id,sold_at,sale_price,discount,finance_status,finance_estimated_fee,finance_estimated_disbursement,finance_actual_fee,finance_actual_disbursement,finance_disbursement_date,customer_name,finance_payment_method_id,outlet')
      .eq('finance_status','PENDING').order('sold_at',{ascending:false});
    if(error)return alert(error.message);
    const ids=(rows||[]).map(r=>r.finance_payment_method_id).filter(Boolean);
    const pm=ids.length?await window.sb.from('payment_methods').select('id,code,name').in('id',ids):{data:[]};
    const map={};(pm.data||[]).forEach(x=>map[x.id]=x);
    const fa=await window.sb.from('financial_accounts').select('id,name,outlet').eq('active',true).order('name');
    const accounts=(fa.data||[]).map(x=>'<option value="'+escF(x.id)+'">'+escF(x.name)+(x.outlet?' — '+escF(x.outlet):'')+'</option>').join('');
    const b=document.getElementById('mb'),t=document.getElementById('mt'),m=document.getElementById('modal');
    t.textContent='💳 Pencairan Finance';
    b.innerHTML=(rows||[]).length?rows.map(r=>{
      const provider=map[r.finance_payment_method_id]?.name||'Finance';
      return '<div class="lead"><b>'+escF(provider)+' • '+escF(r.customer_name||'-')+'</b>'+
        '<div class="small">'+escF(r.outlet)+' • '+new Date(r.sold_at).toLocaleString('id-ID')+'</div>'+
        '<div style="margin-top:5px">Penjualan: <b>Rp'+Number(r.sale_price||0).toLocaleString('id-ID')+'</b> • Estimasi potongan: Rp'+Number(r.finance_estimated_fee||0).toLocaleString('id-ID')+'</div>'+
        '<label>Potongan Aktual</label><input id="ff-'+r.id+'" type="number" min="0" step="1000" value="'+Number(r.finance_estimated_fee||0)+'">'+
        '<label>Akun Pencairan</label><select id="fa-'+r.id+'">'+accounts+'</select>'+
        '<label>Tanggal Cair</label><input id="fd-'+r.id+'" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
        '<button class="success" onclick="window.hmDisburseFinance(\''+r.id+'\')">💸 Catat Dana Cair</button></div>';
    }).join(''):'<div class="small">Tidak ada pencairan finance yang menunggu.</div>';
    m.classList.remove('hidden');m.style.display='flex';
  }

  window.hmDisburseFinance=async function(id){
    const fee=Number(document.getElementById('ff-'+id)?.value||0);
    const account=document.getElementById('fa-'+id)?.value;
    const date=document.getElementById('fd-'+id)?.value;
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
    const [start,end]=hmDateRange('month');
    const x=await sb.rpc('finance_management_dashboard',{p_start_date:start,p_end_date:end});
    const box=document.getElementById('hmCashBankBox');
    if(x.error){box.innerHTML='<div class="danger box">Gagal memuat Kas & Bank: '+String(x.error.message||x.error)+'</div>';return;}
    const accounts=x.data?.accounts||[];
    window.hmCashAccounts=accounts;
    box.innerHTML='<div class="small">Posisi rekening • bulan berjalan</div><div style="margin-top:10px">'+(accounts.length?accounts.map(a=>'<button class="secondary" style="width:100%;text-align:left;margin:5px 0" data-code="'+String(a.code||'').replace(/"/g,'&quot;')+'" onclick="hmOpenCash(this.dataset.code)"><div class="row" style="justify-content:space-between"><span><b>'+a.code+'</b> '+a.name+'</span><b>'+hmRp(a.balance)+'</b></div></button>').join(''):'<div class="small">Belum ada akun Kas & Bank aktif.</div>')+'</div><div class="box" style="margin-top:12px"><div class="small">Fungsi berikutnya: pencatatan uang masuk, uang keluar, transfer antar Kas/Bank, dan rekonsiliasi.</div></div>';
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  if(section==='report'){
    await window.hmOpenFinanceReport();
    return;
  }
  const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
  if(!panel||!body)return;
  const config={
    payable:{title:'🤝 Hutang & Piutang',items:[
      ['Hutang Supplier','Kewajiban kepada supplier dan partner'],
      ['Piutang Customer','Tagihan customer yang belum diterima'],
      ['Jatuh Tempo','Daftar kewajiban dan piutang yang mendekati jatuh tempo']
    ]},
    payroll:{title:'💳 Payroll & Komisi',items:[
      ['Gaji','Daftar dan riwayat pembayaran gaji'],
      ['Komisi','Komisi tim dan komisi personal'],
      ['Reward','Reward dan pembayaran insentif']
    ]}
  }[section];
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
