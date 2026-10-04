(function(){
function hmRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID');}
function hmFinNum(v){return 'font-size:clamp(18px,5.5vw,24px);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'}
function hmDateRange(mode){const d=new Date(),iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};if(mode==='today'){const s=new Date(d.getFullYear(),d.getMonth(),d.getDate());return[iso(s),iso(s)];}if(mode==='year')return[d.getFullYear()+'-01-01',d.getFullYear()+'-12-31'];return[iso(new Date(d.getFullYear(),d.getMonth(),1)),iso(new Date(d.getFullYear(),d.getMonth()+1,0))];}
window.openCellFinanceReport=async function(){
  const p=window.profile||{},role=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
  if(!p.is_management && role!=='ADMIN FINANCE MAJESTY CELL' && role!=='FASILITATOR'){alert('Akses laporan tidak diizinkan.');return;}
  const m=document.getElementById('modal'),t=document.getElementById('mt'),b=document.getElementById('mb');if(!m||!t||!b)return;
  t.textContent='📊 Laporan Finance Majesty Cell';
  const d=new Date(),start=new Date(d.getFullYear(),d.getMonth(),1),end=d;
  const iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};
  b.innerHTML='<div class="row" style="margin-bottom:12px"><button class="secondary" type="button" onclick="window.openPartnerSettlement()">← Kembali</button><button class="primary" type="button" onclick="window.loadCellFinanceReport()">🔄 Refresh</button></div>'+
    '<div class="row"><label style="flex:1">Dari<input id="cellReportStart" type="date" value="'+iso(start)+'"></label><label style="flex:1">Sampai<input id="cellReportEnd" type="date" value="'+iso(end)+'"></label></div>'+'<label>Outlet yang Dipantau<select id="cellReportOutlet"><option value="ALL">Semua Outlet Cell</option><option value="Majesty Refill Phone">Majesty Refill Phone</option><option value="Majesty Plaza iPhone">Majesty Plaza iPhone</option></select></label>'+
    '<div id="cellFinanceReportBody" style="margin-top:12px">Memuat...</div>';
  m.classList.remove('hidden');m.style.display='flex';await window.loadCellFinanceReport();
};
window.loadCellFinanceReport=async function(){
  const box=document.getElementById('cellFinanceReportBody'),sb=window.sb;if(!box||!sb)return;
  const start=document.getElementById('cellReportStart')?.value,end=document.getElementById('cellReportEnd')?.value,outlet=document.getElementById('cellReportOutlet')?.value||'ALL';
  box.innerHTML='<div class="small">Memuat laporan Majesty Cell...</div>';
  const [rep,stockRep]=await Promise.all([sb.rpc('majesty_cell_finance_report',{p_start_date:start,p_end_date:end,p_outlet:outlet}),sb.rpc('majesty_cell_stock_detail_report',{p_outlet:outlet})]);
  if(rep.error){box.innerHTML='<div class="danger box">Gagal memuat laporan: '+esc(String(rep.error.message||rep.error))+'</div>';return;}
  const d=rep.data||{},stockDetail=stockRep.data||[],tot=d.stock_totals||{},rows=d.receipts||[],sales=d.sales||[],due=d.capital_due||[],profit=d.profit_sharing||[],sett=d.settlements||[];
  const money=v=>hmRp(v),name=x=>esc(String(x||'-'));
  const stockHtml=(d.stock_summary||[]).map(x=>'<div class="lead"><b>'+name(x.status)+'</b><br>'+Number(x.units||0)+' unit • '+money(x.cost)+'</div>').join('')||'<div class="small">Belum ada data.</div>';
  const stockDetailHtml=stockDetail.map(x=>'<div class="lead"><div class="small"><b>'+name(x.outlet)+'</b></div><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">Status: '+name(x.status)+' • '+name(x.color)+(x.grade?' • Grade '+name(x.grade):'')+(x.battery_health!=null?' • BH '+Number(x.battery_health)+'%':'')+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.asking_price)+(x.sold_price!=null?' • Terjual: '+money(x.sold_price):'')+'</div></div>').join('')||'<div class="small">Belum ada stock Cell.</div>';
  const receiptHtml=rows.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.requested_at).toLocaleString('id-ID')+' • '+name(x.status)+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.asking_price)+'</div><div class="small">Input: '+name(x.requester)+' • Verifikasi: '+name(x.reviewer)+'</div>'+(x.review_note?'<div class="small">Catatan: '+name(x.review_note)+'</div>':'')+'</div>').join('')||'<div class="small">Tidak ada barang masuk pada periode ini.</div>';
  const salesHtml=sales.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.sold_at).toLocaleString('id-ID')+'</div><div>Modal: '+money(x.cost)+' • Jual: '+money(x.sale_price)+' • Profit: '+money(x.gross_profit)+'</div></div>').join('')||'<div class="small">Tidak ada penjualan pada periode ini.</div>';
  const dueHtml=due.map(x=>'<div class="lead"><b>'+name(x.product)+(x.variant?' — '+name(x.variant):'')+'</b><div class="small">'+new Date(x.sold_at).toLocaleString('id-ID')+'</div><div>Modal wajib dibayar: <b>'+money(x.capital_due)+'</b> • Jual: '+money(x.sale_price)+' • Profit: '+money(x.gross_profit)+'</div></div>').join('')||'<div class="small">Tidak ada modal yang belum disetor.</div>';
  const profitHtml=profit.map(x=>'<div class="lead"><b>'+name(x.period_start)+' s/d '+name(x.period_end)+'</b><div>'+Number(x.transactions||0)+' transaksi • Profit: '+money(x.total_profit)+'</div><div>Hak Cell '+Number(x.profit_share_pct||30)+'%: <b>'+money(x.partner_profit_share)+'</b></div></div>').join('')||'<div class="small">Belum ada profit sharing.</div>';
  const settHtml=sett.map(x=>'<div class="lead"><b>'+name(x.type)+'</b><div class="small">'+name(x.date)+' • '+name(x.status)+'</div><div>Nominal: <b>'+money(x.amount)+'</b></div>'+(x.note?'<div class="small">'+name(x.note)+'</div>':'')+'</div>').join('')||'<div class="small">Belum ada settlement pada periode ini.</div>';
  box.innerHTML='<div class="small">Periode '+name(start)+' s/d '+name(end)+' • Outlet: '+name(d.outlet_filter||outlet)+'</div>'+
    '<div class="fin-grid" style="margin-top:10px"><div class="fin-card"><div class="small">READY</div><div class="fin-big">'+Number(tot.ready_units||0)+' unit</div><div class="small">'+money(tot.ready_cost)+'</div></div><div class="fin-card"><div class="small">SOLD</div><div class="fin-big">'+Number(tot.sold_units||0)+' unit</div><div class="small">Modal '+money(tot.sold_cost)+'</div></div><div class="fin-card"><div class="small">PENDING</div><div class="fin-big">'+Number(tot.pending_units||0)+' unit</div></div><div class="fin-card"><div class="small">RETURN</div><div class="fin-big">'+Number(tot.return_units||0)+' unit</div></div></div>'+
    '<div class="box" style="margin-top:12px"><h3>📦 1. Barang Masuk Cell</h3>'+receiptHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>📱 2. Stock Cell</h3>'+stockHtml+'<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Lihat detail semua unit</summary><div style="margin-top:8px">'+stockDetailHtml+'</div></details></div>'+
    '<div class="box" style="margin-top:12px"><h3>💰 3. Modal Cell Belum Disetor</h3>'+dueHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>🧾 4. Penjualan Stock Cell</h3>'+salesHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>🤝 5. Profit Sharing</h3>'+profitHtml+'</div>'+
    '<div class="box" style="margin-top:12px"><h3>💸 6. Riwayat Settlement</h3>'+settHtml+'</div>';
};
window.openPartnerSettlement=async function(){
  const p=window.profile||{};
  if(!p.is_management && String(p.role||'').toUpperCase()!=='ADMIN FINANCE MAJESTY CELL'){alert('Akses settlement tidak diizinkan.');return;}
  const m=document.getElementById('modal'),t=document.getElementById('mt'),b=document.getElementById('mb');
  if(!m||!t||!b)return;
  t.textContent='🤝 Kewajiban Majesty Cell';
  const {data:rows,error}=await sb.rpc('partner_obligation_summary');
  if(error){console.error('[HM] Partner obligation summary:',error);alert('Gagal memuat kewajiban Majesty Cell: '+(error.message||error));return;}
  const s=(rows||[]).find(x=>String(x.partner_name||'').toUpperCase()==='MAJESTY CELL' && x.outlet==='Majesty Refill Phone') || (rows||[])[0] || {};
  const cap=Number(s.capital_due||0), profit=Number(s.profit_share_due||0);
  b.innerHTML='<div class="fin-grid">'+
    '<div class="fin-card"><div class="small">Modal Belum Disetor</div><div class="fin-big">'+hmRp(cap)+'</div></div>'+
    '<div class="fin-card"><div class="small">Profit Sharing Bulan Ini</div><div class="fin-big">'+hmRp(profit)+'</div></div>'+
    '</div>'+
    '<div class="small" style="margin-top:14px">Refill: modal Cell dibayar sesuai unit/transaksi yang dipilih. Profit sharing dihitung bulanan.</div>'+
    '<div class="row" style="margin-top:14px"><button class="primary" onclick="window.loadPartnerSettlementDetail()">📋 Rincian & Setor Modal</button><button class="secondary" onclick="window.loadPartnerProfitSettlement()">🤝 Setor Profit Sharing</button><button class="secondary" onclick="window.openCellFinanceReport()">📊 Laporan Finance Cell</button></div>'+
    '<div id="partnerSettlementDetail" style="margin-top:14px"></div>';
  m.style.display='flex';
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
window.loadPartnerSettlementDetail=async function(){
  const box=document.getElementById('partnerSettlementDetail');if(!box)return;
  const {data:rows,error}=await sb.from('partner_capital_due').select('*').eq('outlet','Majesty Refill Phone').order('sold_at',{ascending:false});
  if(error){box.innerHTML='<div class="small">'+error.message+'</div>';return;}
  box.innerHTML=rows?.length?'<div class="small">Centang unit yang ingin dibayar sekarang.</div>'+rows.map(r=>'<label style="display:block;padding:10px 0;border-bottom:1px solid #ddd"><input class="partner-capital-check" type="checkbox" value="'+r.stock_unit_id+'" data-amount="'+Number(r.capital_due||0)+'" style="width:auto;margin-right:8px"><b>'+String(r.sales_transaction_id||'').slice(0,8)+'</b> · '+hmRp(r.capital_due)+'<br><span class="small">Jual '+hmRp(r.sale_price)+' · Profit '+hmRp(r.gross_profit)+'</span></label>').join('')+'<button class="success" style="margin-top:12px" onclick="window.payPartnerCapitalSettlement()">💸 Setor Modal Terpilih</button>':'<div class="small">Tidak ada modal Cell yang belum disetor.</div>';
};
window.openFinance=async function(){const p=window.profile||{};if(!p.is_management){alert('Finance hanya dapat diakses Management.');return;}const m=document.getElementById('modal'),t=document.getElementById('mt'),b=document.getElementById('mb');if(!m||!t||!b)return;t.textContent='💰 Finance';b.innerHTML='<div class="box"><h3 style="margin-top:0">💰 FINANCE MANAGEMENT</h3><div class="small">Sumber data: Jurnal yang sudah POSTED.</div><div class="row" style="margin-top:10px"><button class="secondary" onclick="hmFinanceLoad(\'month\')">Bulan Ini</button><button class="secondary" onclick="hmFinanceLoad(\'today\')">Hari Ini</button><button class="secondary" onclick="hmFinanceLoad(\'year\')">Tahun Ini</button><button class="secondary" onclick="window.openPartnerSettlement()">🤝 Kewajiban & Settlement Cell</button></div><div id="hmFinBox" style="margin-top:10px">Memuat...</div></div>';m.classList.remove('hidden');await hmFinanceLoad('month');};
window.hmFinanceLoad=async function(mode){const box=document.getElementById('hmFinBox'),sb=window.sb,p=window.profile||{};if(!box||!sb||!p.is_management)return;box.innerHTML='<div class="small">Memuat data Finance...</div>';const[start,end]=hmDateRange(mode),x=await sb.rpc('finance_management_dashboard',{p_start_date:start,p_end_date:end});if(x.error){box.innerHTML='<div class="danger box">Finance error: '+String(x.error.message||x.error)+'</div>';return;}const d=x.data||{},accounts=d.accounts||[];const cards=[['💵 Kas & Bank',d.cash_bank],['💰 Uang Masuk',d.cash_in],['💸 Uang Keluar',d.cash_out],['📊 Net Cashflow',d.net_cashflow],['🤝 Hutang Supplier',d.payable_supplier],['👤 Piutang Customer',d.receivable_customer]];box.innerHTML='<div class="small">Periode '+start+' s/d '+end+'</div><div class="stats" style="margin-top:10px;grid-template-columns:1fr;gap:8px">'+cards.map(c=>'<div class="stat" style="min-width:0"><div class="small">'+c[0]+'</div><div class="num" style="'+hmFinNum(c[1])+'">'+hmRp(c[1])+'</div></div>').join('')+'</div><div class="box" style="margin-top:10px"><h3 style="margin-top:0">💵 Kas & Bank</h3><div class="small">Pilih akun untuk melihat mutasi</div>'+(accounts.length?accounts.map(a=>'<button class="secondary" style="width:100%;text-align:left;margin:4px 0" onclick="hmOpenCash(\''+a.code+'\')"><div class="row" style="justify-content:space-between"><span><b>'+a.code+'</b> '+a.name+'</span><b>'+hmRp(a.balance)+'</b></div></button>').join(''):'<div class="small">Belum ada saldo.</div>')+'</div><div class="small" style="margin-top:8px">Finance hanya dapat diakses Management.</div>';window.hmCashAccounts=accounts;};
window.hmFinanceBack=async function(){await window.openFinance();};
window.hmOpenCash=async function(code){const sb=window.sb,p=window.profile||{},a=(window.hmCashAccounts||[]).find(x=>x.code===code);if(!sb||!p.is_management||!a)return;const[tb,mb]=[document.getElementById('mt'),document.getElementById('mb')];tb.textContent='💵 '+a.name;mb.innerHTML='<div class="box"><button type="button" class="secondary" onclick="hmFinanceBack()">← Kembali Finance</button><h3 style="margin:8px 0 4px">'+a.code+' — '+a.name+'</h3><div class="small">Mutasi bulan ini</div><div id="hmCashDetail">Memuat...</div></div>';const[start,end]=hmDateRange('month');const x=await sb.from('accounting_accounts').select('id').eq('code',code).eq('active',true).maybeSingle();if(x.error||!x.data){document.getElementById('hmCashDetail').textContent='Akun tidak ditemukan.';return;}const r=await sb.rpc('finance_cash_account_mutation',{p_account_id:x.data.id,p_start_date:start,p_end_date:end});if(r.error){document.getElementById('hmCashDetail').textContent='Gagal memuat mutasi: '+r.error.message;return;}const d=r.data||{};document.getElementById('hmCashDetail').innerHTML='<div class="stats" style="grid-template-columns:1fr;gap:8px">'+[['Saldo Awal',d.opening],['Masuk',d.debit],['Keluar',d.credit],['Saldo Akhir',d.closing]].map(c=>'<div class="stat" style="min-width:0"><div class="small">'+c[0]+'</div><div class="num" style="'+hmFinNum(c[1])+'">'+hmRp(c[1])+'</div></div>').join('')+'</div><div style="margin-top:10px">'+((d.rows||[]).length?(d.rows||[]).map(r=>'<div class="lead"><div class="small">'+new Date(r.date).toLocaleString('id-ID')+' • '+r.journal_no+'</div><b>'+String(r.description||'-')+'</b><div style="margin-top:4px">Masuk: '+hmRp(r.debit)+' • Keluar: '+hmRp(r.credit)+'</div></div>').join(''):'<div class="small">Belum ada mutasi pada periode ini.</div>')+'</div>';};
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

  function patchAfterInline(){
    if(typeof window.saveS==='function' && !window.__hmOriginalSaveS){
      window.__hmOriginalSaveS=window.saveS;
      window.saveS=financeSaveS;
      wrapped=true;
    }
    bindPaymentUI();
    if(window.profile?.is_management){
      const actions=document.getElementById('dashboardActions');
      if(actions && !document.getElementById('financeDisbursementBtn')){
        const b=document.createElement('button');b.id='financeDisbursementBtn';b.className='secondary';b.type='button';
        b.textContent='💳 Pencairan Finance';b.onclick=openFinanceDisbursement;actions.appendChild(b);
      }
    }
  }

  const obs=new MutationObserver(()=>{try{patchAfterInline();}catch(e){console.error('[HM Finance Sales]',e)}});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(patchAfterInline,500);
  window.hmFinanceSalesReady=true;
})();