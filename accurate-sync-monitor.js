/* HELLO MAJESTY — Accurate Sync Monitor */
(function(){
  if(!document.getElementById('hm-accurate-queue-card-fix')){const st=document.createElement('style');st.id='hm-accurate-queue-card-fix';st.textContent='.hm-accurate-queue-card,.hm-accurate-queue-card *{color:#172033!important}.hm-accurate-queue-card .small{color:#475467!important}.hm-accurate-queue-card button{background:#344256!important;color:#fff!important;display:inline-block;width:auto;min-height:42px;font-size:14px;padding:10px 14px}.hm-accurate-queue-card .row{align-items:center;gap:8px;flex-wrap:wrap}';document.head.appendChild(st);}

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function isFinanceAdmin(){
    const r=String(window.profile?.role||'').toUpperCase().replace(/_/g,' ');
    const developer = !!window.profile?.is_developer || r==='DEVELOPER' || r==='DEVELOPER APLIKASI';
    return developer || !!window.profile?.is_management || r==='ADMIN FINANCE' || r==='ADMIN FINANCE MAJESTY CELL';
  }
  function openModal(title,html){
    const mt=document.getElementById('mt'),mb=document.getElementById('mb'),modal=document.getElementById('modal');
    if(!mt||!mb||!modal) throw new Error('Panel belum siap.');
    mt.textContent=title; mb.innerHTML=html; modal.classList.remove('hidden');
  }
  function financeFmt(v){return Math.round(Number(v||0)).toLocaleString('id-ID');}
  function normStatus(v){return String(v||'').trim().toUpperCase();}
  function syncFailureReason(x){
    const keys=['last_error','error_message','error','message','details','failure_reason','response_message'];
    for(const k of keys){const v=x?.[k];if(v!==null&&v!==undefined&&String(v).trim()&&String(v).trim()!=='{}')return String(v).trim();}
    const status=normStatus(x?.status);
    return status==='FAILED'
      ? 'Status GAGAL tercatat, tetapi alasan kegagalan tidak tersimpan pada data monitor. Periksa log fungsi accurate-sync untuk melihat pesan error asli.'
      : status==='CONFLICT'?'Data konflik memerlukan pemeriksaan dan penentuan sumber data oleh Management.'
      : status==='PENDING'?'Data masih menunggu antrean sinkronisasi.'
      : status==='PROCESSING'?'Data sedang diproses. Muat ulang monitor beberapa saat lagi.'
      : 'Belum ada rincian alasan dari proses sinkronisasi.';
  }
  function statusBadge(s){
    const x=String(s||'').toUpperCase();
    const map={SYNCED:['🟢','Sinkron'],PENDING:['🟡','Menunggu'],PROCESSING:['🔵','Diproses'],FAILED:['🔴','Gagal'],CONFLICT:['🟠','Konflik'],CANCELLED:['⚪','Dibatalkan']};
    const m=map[x]||['⚪',x||'Tidak diketahui'];
    return '<span class="badge">'+m[0]+' '+m[1]+'</span>';
  }
  async function load(){
    if(!isFinanceAdmin()) return;
    const [q,r,c]=await Promise.all([
      sb.from('accurate_sync_queue').select('*').order('updated_at',{ascending:false}).limit(100),
      sb.from('accurate_sync_records').select('*').order('updated_at',{ascending:false}).limit(30),
      sb.from('accurate_sync_conflicts').select('*').eq('status','OPEN').order('detected_at',{ascending:false}).limit(30)
    ]);
    if(q.error) throw q.error; if(r.error) throw r.error; if(c.error) throw c.error;
    const queue=q.data||[], records=r.data||[], conflicts=c.data||[];
    // Enrich failed sale cards with product identity and finance state so the reason is actionable.
    const saleIds=[...new Set(queue.filter(x=>x.status!=='SYNCED'&&x.sale_id).map(x=>x.sale_id))];
    const saleInfo={};
    if(saleIds.length){
      const sr=await sb.from('sales_transactions').select('id,stock_unit_id,outlet,sale_price,discount,cost,finance_status,finance_requested_amount,finance_estimated_fee,finance_actual_disbursement,finance_cash_payment,finance_cashout_amount,finance_actual_fee,finance_payment_method_id,finance_disbursement_account_id,finance_notes,notes').in('id',saleIds);
      if(sr.error)throw sr.error;
      const sales=sr.data||[],stockIds=[...new Set(sales.map(x=>x.stock_unit_id).filter(Boolean))],stockInfo={},methodIds=[...new Set(sales.map(x=>x.finance_payment_method_id).filter(Boolean))],methodInfo={};if(methodIds.length){const mr=await sb.from('payment_methods').select('id,name,code').in('id',methodIds);if(mr.error)throw mr.error;(mr.data||[]).forEach(m=>{methodInfo[m.id]={name:String(m.name||''),code:String(m.code||'').toUpperCase()};});}
      if(stockIds.length){const ur=await sb.from('stock_units').select('id,product_id,grade,color,battery_health,source_type,partner_name').in('id',stockIds);if(ur.error)throw ur.error;const units=ur.data||[],productIds=[...new Set(units.map(x=>x.product_id).filter(Boolean))],products={};if(productIds.length){const pr=await sb.from('product_master').select('id,product,variant,category').in('id',productIds);if(pr.error)throw pr.error;(pr.data||[]).forEach(p=>products[p.id]=p);}units.forEach(u=>{const p=products[u.product_id]||{};stockInfo[u.id]={product:[p.product,p.variant,u.color,u.grade?'Grade '+u.grade:null,u.battery_health!=null?'BH '+u.battery_health+'%':null].filter(Boolean).join(' • ')||'Produk tidak diketahui',source_type:u.source_type,partner_name:u.partner_name};});}
      sales.forEach(s=>{const st=stockInfo[s.stock_unit_id]||{},pm=methodInfo[s.finance_payment_method_id]||{};saleInfo[s.id]={product:st.product||'Produk tidak diketahui',source_type:st.source_type,partner_name:st.partner_name,finance_status:s.finance_status,finance_provider_code:(['AKULAKU','KREDIVO','SPAYLATER'].includes(pm.code)?pm.code:(/AKULAKU/i.test(pm.name)?'AKULAKU':/KREDIVO/i.test(pm.name)?'KREDIVO':/SPAY/i.test(pm.name)?'SPAYLATER':'')),sale_price:Number(s.sale_price||0),discount:Number(s.discount||0),finance_requested_amount:Number(s.finance_requested_amount||0),finance_estimated_fee:Number(s.finance_estimated_fee||0),finance_actual_disbursement:Number(s.finance_actual_disbursement||0),finance_cash_payment:Number(s.finance_cash_payment||0),finance_cashout_amount:Number(s.finance_cashout_amount||0),finance_actual_fee:Number(s.finance_actual_fee||0),finance_notes:s.finance_notes,notes:s.notes};});
    }
    const failed=queue.filter(x=>normStatus(x.status)==='FAILED').length+records.filter(x=>normStatus(x.status)==='FAILED').length;
    const pending=queue.filter(x=>['PENDING','PROCESSING'].includes(normStatus(x.status))).length+records.filter(x=>['PENDING','PROCESSING'].includes(normStatus(x.status))).length;
    const synced=queue.filter(x=>normStatus(x.status)==='SYNCED').length+records.filter(x=>normStatus(x.status)==='SYNCED').length;
    const overall=conflicts.length?'CONFLICT':failed?'FAILED':pending?'PENDING':'SYNCED';
    openModal('🔗 Accurate Sync Monitor',
      '<div class="box" style="background:linear-gradient(145deg,#07111f,#12302a);color:#fff;border:0">'+
      '<div style="font-size:12px;opacity:.8">STATUS SINKRONISASI</div><div style="font-size:25px;font-weight:800;margin-top:4px">'+
      (overall==='SYNCED'?'🟢 SEMUA SINKRON':overall==='CONFLICT'?'🟠 ADA KONFLIK':overall==='FAILED'?'🔴 ADA GAGAL':'🟡 ADA DATA TERTUNDA')+
      '</div><div class="small" style="color:#cbd5e1;margin-top:5px">Monitor dua arah Hello Majesty ↔ Accurate</div></div>'+
      '<div class="stats" style="margin-top:10px">'+
      '<div class="stat"><div class="small">🟢 Sinkron</div><div class="num">'+synced+'</div></div>'+
      '<div class="stat"><div class="small">🟡 Tertunda</div><div class="num">'+pending+'</div></div>'+
      '<div class="stat"><div class="small">🔴 Gagal</div><div class="num">'+failed+'</div></div>'+
      '<div class="stat"><div class="small">🟠 Konflik</div><div class="num">'+conflicts.length+'</div></div></div>'+
      '<div class="box" style="margin-top:12px"><b>ℹ️ Sinkronisasi otomatis</b><div class="small" style="margin-top:5px">Transaksi normal diproses melalui alur sinkronisasi aplikasi. Gunakan alat pemeriksaan di bawah hanya bila ada data gagal, tertunda, atau konflik. Jurnal konsinyasi lama yang sudah tercatat tidak perlu dikirim ulang.</div></div>' +
      '<h3 style="margin-top:16px">🛠️ Alat pemeriksaan lanjutan</h3><div class="small">Gunakan alat ini hanya saat ada transaksi atau data yang perlu diperiksa.</div><div class="row" style="margin-top:8px"><button class="secondary" onclick="window.hmOpenAccurateSyncMonitor()">🔄 Muat Ulang Monitor</button><button class="secondary" onclick="window.hmCheckAccurateItems()">📦 Cek Barang Accurate</button><button class="secondary" onclick="window.hmDiagnoseAccurateItems()">🧪 Diagnosa Barang</button><button class="secondary" onclick="window.hmDiagnoseAccurateCustomers()">👤 Diagnosa Pelanggan</button><button class="secondary" onclick="window.hmDiagnoseFailedSales()">🧾 Cek Faktur Gagal</button><button class="secondary" onclick="window.hmOpenAccurateProductMapping()">🧩 Pemetaan Produk</button></div>'+
      '<h3 style="margin-top:16px">⚠️ Data yang perlu ditindak</h3>'+
      (conflicts.length?conflicts.map(x=>'<div class="lead"><b>🟠 Konflik '+esc(x.entity_type)+'</b><div class="small">'+esc(x.reason)+'</div><div class="row" style="margin-top:7px"><span>'+esc(x.local_id||'-')+'</span><span>'+esc(x.accurate_no||x.accurate_id||'-')+'</span></div></div>').join(''):'')+
      (queue.filter(x=>{const st=normStatus(x.status);const si=saleInfo[x.sale_id]||{};const stockist=['STOCKIST','MAJESTY_CELL'].includes(String(si.source_type||'').toUpperCase())&&/^(majesty cell|majesty gadget|majesty store)$/i.test(String(si.partner_name||'').trim());return ['FAILED','PENDING','PROCESSING','CONFLICT'].includes(st);}).filter((x,i,a)=>a.findIndex(y=>String(y.sale_id||'')===String(x.sale_id||''))===i).map(x=>{const info=saleInfo[x.sale_id]||{};const stockistName=String(info.partner_name||'').trim();const isStockistConsignment=['STOCKIST','MAJESTY_CELL'].includes(String(info.source_type||'').toUpperCase())&&/^(majesty cell|majesty gadget|majesty store)$/i.test(stockistName);const providerCode=String(info.finance_provider_code||'').toUpperCase();const feeRate=(providerCode==='AKULAKU'||providerCode==='KREDIVO')?0.03:0;const financeRequested=Number(info.finance_requested_amount||0),financeCash=Number(info.finance_cash_payment||0),financeCashout=Number(info.finance_cashout_amount||0),saleNet=Number(info.sale_price||0)+financeCashout-financeCash;const estimatedFee=Number(info.finance_estimated_fee||0)>0?Number(info.finance_estimated_fee):Math.round(financeRequested*feeRate);const financeNet=financeRequested-estimatedFee+financeCash;const financeExpected=feeRate>0?Math.round(Math.max(saleNet,0)/(1-feeRate)):Math.max(saleNet,0);const financeActual=Number(info.finance_actual_disbursement||0);const financeMismatch=financeRequested>0&&(financeActual>0?Math.abs(financeActual+financeCash+financeCashout-Number(info.sale_price||0))>1:(Math.abs(financeNet-(Number(info.sale_price||0)+financeCashout))>1||Math.abs(financeRequested-financeExpected)>2));const financePending=false; /* Accurate clearing account is used; actual payout confirmation is not required. */ const reason=financePending?'Finance belum COMPLETED atau pencairan aktual belum tercatat. Jangan buat jurnal sebelum pencairan terkonfirmasi.':(financeMismatch?'Nominal finance belum seimbang dengan harga jual. Periksa pencairan, biaya otomatis, cash, dan tarik tunai.':(isStockistConsignment?'Stok titipan '+stockistName+': transaksi harus dicatat melalui jurnal konsinyasi dengan akun modal pemilik stok.':(x.last_error||syncFailureReason(x))));const isFinanceConsignment=isStockistConsignment&&financeRequested>0;const retryLabel=isFinanceConsignment?'Proses Jurnal Finance Konsinyasi':(isStockistConsignment?'Proses Jurnal Konsinyasi':(String(x.status||'').toUpperCase()==='PENDING'?'Proses Sinkronisasi':'Coba Sinkronkan'));return '<div class="lead hm-accurate-queue-card" style="background:#f8fafc!important;color:#172033!important;border:1px solid #d0d5dd!important"><div class="row" style="justify-content:space-between"><b style="color:#172033!important">'+(isStockistConsignment?'Jurnal Konsinyasi · '+esc(stockistName):'Penjualan')+'</b>'+statusBadge(x.status)+'</div><div style="font-weight:700;margin-top:4px">📦 '+esc(info.product||'Produk belum teridentifikasi')+'</div>'+(isStockistConsignment?'<div class="small" style="color:#475467!important">Pemilik stok: '+esc(stockistName)+' · Outlet transaksi: '+esc(info.outlet||'-')+'</div>':'')+'<div class="small" style="color:#475467!important">ID: '+esc(x.sale_id)+'</div>'+(info.finance_status?'<div class="small" style="color:#475467!important">Finance: '+esc(info.finance_status)+'</div>':'')+(info.finance_notes?'<div class="small" style="color:#475467!important">Catatan Finance: '+esc(info.finance_notes)+'</div>':'')+'<div class="small" style="color:#475467!important;margin-top:4px">Penyebab: '+esc(reason||syncFailureReason(x))+'</div>'+(['FAILED','PENDING'].includes(String(x.status||'').toUpperCase())|| (String(x.status||'').toUpperCase()==='CANCELLED'&&isFinanceConsignment))&&!financeMismatch&&!financePending?'<div style="margin-top:8px"><button class="secondary" onclick="window.hmRetryAccurateSale(&quot;'+esc(x.sale_id)+'&quot;,&quot;'+(isFinanceConsignment?'finance':isStockistConsignment?'consignment':'sale')+'&quot;)">🔁 '+retryLabel+'</button><span class="small" id="hm-retry-sale-'+esc(x.sale_id)+'" style="margin-left:8px"></span></div>':((financeMismatch||financePending)?'<div class="small" style="margin-top:8px;color:#b45309;font-weight:700">⛔ Proses jurnal ditahan sampai finance direkonsiliasi.</div>':'')+'</div>';}).join('')||'')+
      (records.filter(x=>normStatus(x.status)!=='SYNCED').map(x=>'<div class="lead hm-accurate-queue-card" style="background:#fff7f7!important;color:#172033!important;border:1px solid #fecaca!important"><div class="row" style="justify-content:space-between"><b>'+esc(x.entity_type||'Data Accurate')+'</b>'+statusBadge(x.status)+'</div><div class="small" style="margin-top:4px">Arah: '+esc(x.direction||'-')+' • ID lokal: '+esc(x.local_id||x.sale_id||'-')+' • No. Accurate: '+esc(x.accurate_no||x.accurate_id||'-')+'</div><div style="margin-top:7px;font-weight:700;color:#991b1b!important">Alasan / detail:</div><div class="small" style="margin-top:3px;color:#7f1d1d!important;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(syncFailureReason(x))+'</div></div>').join('')||'')+
      (!conflicts.length&&!queue.some(x=>normStatus(x.status)!=='SYNCED')&&!records.some(x=>normStatus(x.status)!=='SYNCED')?'<div class="box"><b>🟢 Tidak ada data bermasalah.</b><div class="small">Sistem akan menampilkan masalah di sini jika terjadi kegagalan, keterlambatan, atau konflik.</div></div>':'')+
      '<div class="small" style="margin-top:10px">Catatan: konflik tidak ditimpa otomatis. Management menentukan sumber data yang benar.</div>'
    );
  }

  window.hmRetryAccurateSale=async function(saleId,routeType){
    if(!isFinanceAdmin()){alert('Akses ditolak: hanya Developer/Management/Finance.');return;}
    const id=String(saleId||'').trim();
    if(!id) return;
    const result=document.getElementById('hm-retry-sale-'+id);
    const isConsignment=routeType==='consignment';
    const isFinance=routeType==='finance';
    if(!confirm((isFinance?'Proses jurnal finance konsinyasi untuk transaksi ':isConsignment?'Proses jurnal konsinyasi untuk transaksi ':'Coba sinkronkan transaksi ')+id+'? Sistem akan memeriksa status dan riwayat agar tidak membuat jurnal ganda.')) return;
    if(result) result.textContent='Memeriksa dan memproses…';
    try{
      const r=await sb.functions.invoke('accurate-sync',{body:{action:isFinance?'sync_finance_journal':isConsignment?'sync_consign_journal':'sync_sale',sale_id:id}});
      if(r.error) throw r.error;
      const d=r.data||{};
      if(!d.ok) throw new Error(d.error||'Sinkronisasi belum terkonfirmasi.');
      if(result) result.textContent='Berhasil: '+String(d.journal?.number||d.invoice?.number||d.invoice_no||'cek Accurate');
      alert('Sinkronisasi terkonfirmasi oleh backend. Periksa nomor faktur dan status di Accurate Sync Monitor.');
      await window.hmOpenAccurateSyncMonitor();
    }catch(e){
      let msg=String(e?.message||e||'Kesalahan tidak diketahui');
      // Supabase FunctionsHttpError sering menyimpan pesan asli Accurate di context Response,
      // bukan di error.message. Baca body respons agar alasan kegagalan tidak hilang.
      try{
        const ctx=e?.context;
        if(ctx && typeof ctx.clone==='function'){
          const copy=ctx.clone();
          let body=null;
          try{body=await copy.json();}catch(_){try{body={raw:await copy.text()};}catch(__){}}
          if(body){
            const detail=body.error||body.message||body.details||body.hint||body.raw;
            if(detail) msg=typeof detail==='string'?detail:JSON.stringify(detail);
            else if(body.code||body.status||body.name) msg=JSON.stringify(body);
          }
        }else if(ctx && typeof ctx==='object'){
          const detail=ctx.error||ctx.message||ctx.details||ctx.hint;
          if(detail) msg=typeof detail==='string'?detail:JSON.stringify(detail);
        }
      }catch(parseErr){/* pertahankan pesan error awal */}
      if(result) result.textContent='GAGAL: '+msg;
      alert('Sinkronisasi gagal. Alasan dari backend:\n'+msg+'\n\nJangan kirim ulang sebelum penyebabnya diperiksa.');
      try{await window.hmOpenAccurateSyncMonitor();}catch(_){}
    }
  };
  window.hmRunConsignJournal=async function(){
    const checkbox=document.getElementById('hmConsignJournalConfirmed');
    const result=document.getElementById('hmConsignJournalResult');
    if(!checkbox||!checkbox.checked){
      if(result) result.textContent='Centang konfirmasi setelah memastikan jurnal belum ada di Accurate.';
      return;
    }
    if(!isFinanceAdmin()){
      if(result) result.textContent='Akses ditolak: hanya Developer/Management.';
      return;
    }
    if(!confirm('Kirim jurnal konsinyasi untuk iPhone 14 NEW 128GB senilai Rp11.070.000 ke Accurate sekarang? Pastikan jurnal belum ada agar tidak ganda.')) return;
    if(result) result.textContent='Mengirim jurnal… jangan tutup jendela ini.';
    try{
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'sync_consign_journal',sale_id:'d0ded27a-eb49-4e03-bc64-d613d288ebb0'}});
      if(r.error) throw r.error;
      const d=r.data||{};
      if(!d.ok) throw new Error(d.error||'Accurate belum mengonfirmasi jurnal berhasil.');
      const j=d.journal||{};
      if(result) result.innerHTML='<b style="color:#15803d">Berhasil dikirim dan dicatat.</b><div>Nomor jurnal: '+esc(j.number||'(tidak dikembalikan)')+'</div><div>ID Accurate: '+esc(j.id||'-')+'</div><div>Total debit: Rp11.070.000 • Total kredit: Rp11.070.000</div>';
      alert('Jurnal berhasil dikirim. Nomor jurnal: '+(j.number||'(tidak dikembalikan)')+'. Periksa kembali jurnal tersebut di Accurate.');
    }catch(e){
      const msg=String(e?.message||e||'Kesalahan tidak diketahui');
      if(result) result.innerHTML='<b style="color:#b91c1c">Belum terkonfirmasi berhasil.</b><div>'+esc(msg)+'</div><div>Jangan klik kirim ulang sebelum memeriksa daftar jurnal Accurate.</div>';
    }
  };
  window.hmRunRefillConsignJournal=async function(){
    const checkbox=document.getElementById('hmRefillConsignJournalConfirmed');
    const result=document.getElementById('hmRefillConsignJournalResult');
    if(!checkbox||!checkbox.checked){
      if(result) result.textContent='Centang konfirmasi setelah memastikan jurnal Refill belum ada di Accurate.';
      return;
    }
    if(!isFinanceAdmin()){
      if(result) result.textContent='Akses ditolak: hanya Developer/Management.';
      return;
    }
    if(!confirm('Kirim jurnal konsinyasi Infinix Hot 70 NEW 4/128GB untuk Majesty Refill Phone senilai Rp2.800.000? Akun: debit 110202 Rp2.800.000, kredit 170111 Rp1.948.695, kredit 410201 Rp851.305. Pastikan jurnal belum ada di Accurate.')) return;
    if(result) result.textContent='Mengirim jurnal Refill… jangan tutup jendela ini.';
    try{
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'sync_consign_journal',sale_id:'3d8a5dee-af01-499f-8df6-04225ebb709b'}});
      if(r.error) throw r.error;
      const d=r.data||{};
      if(!d.ok) throw new Error(d.error||'Accurate belum mengonfirmasi jurnal berhasil.');
      const j=d.journal||{};
      if(result) result.innerHTML='<b style="color:#15803d">Berhasil dikirim dan dicatat.</b><div>Nomor jurnal: '+esc(j.number||'(tidak dikembalikan)')+'</div><div>ID Accurate: '+esc(j.id||'-')+'</div><div>Debit 110202 Rp2.800.000 • Kredit 170111 Rp1.948.695 • Kredit 410201 Rp851.305</div>';
      alert('Jurnal Infinix Refill berhasil dikirim. Nomor jurnal: '+(j.number||'(tidak dikembalikan)')+'. Periksa kembali jurnal tersebut di Accurate.');
    }catch(e){
      const msg=String(e?.message||e||'Kesalahan tidak diketahui');
      if(result) result.innerHTML='<b style="color:#b91c1c">Belum terkonfirmasi berhasil.</b><div>'+esc(msg)+'</div><div>Jangan klik kirim ulang sebelum memeriksa daftar jurnal Accurate.</div>';
    }
  };
  async function hmConsignBatch(confirmSend){
    const result=document.getElementById('hmConsignBatchResult');
    if(!isFinanceAdmin()){if(result)result.textContent='Akses ditolak: hanya Developer/Management/Finance.';return;}
    if(confirmSend&&!confirm('Sinkronkan semua jurnal konsinyasi lama yang memenuhi pemeriksaan otomatis? Transaksi tanpa akun penerimaan terverifikasi akan dilewati.'))return;
    if(result)result.textContent=confirmSend?'Memproses antrean transaksi yang aman…':'Memeriksa riwayat jurnal dan akun penerimaan…';
    try{
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'sync_consign_batch',confirm:!!confirmSend}});
      if(r.error)throw r.error;
      const d=r.data||{};
      if(!d.ok)throw new Error(d.error||'Pemeriksaan batch gagal.');
      const rows=Array.isArray(d.results)?d.results:[];
      const count=status=>rows.filter(x=>x.status===status).length;
      const labels={SYNCED_NOW:'🟢 Tersinkron sekarang',ALREADY_SYNCED:'✓ Sudah tercatat',READY_TO_SYNC:'🟡 Siap dikirim',NEEDS_PAYMENT_ACCOUNT:'🟠 Akun penerimaan belum jelas',NEEDS_FINANCE_JOURNAL:'🟣 Finance — jurnal khusus diperlukan',NEEDS_ACCOUNT_MAPPING:'🟠 Perlu pemetaan akun',FAILED:'🔴 Gagal',ERROR:'🔴 Gagal memeriksa'};
      if(result)result.innerHTML='<b>'+(confirmSend?'Hasil sinkronisasi':'Hasil pemeriksaan')+'</b><div>Total diperiksa: '+esc(d.total||0)+' • Berhasil sekarang: '+count('SYNCED_NOW')+' • Sudah tercatat: '+count('ALREADY_SYNCED')+' • Siap dikirim: '+count('READY_TO_SYNC')+' • Finance ditahan: '+count('NEEDS_FINANCE_JOURNAL')+' • Perlu ditinjau: '+rows.filter(x=>!['SYNCED_NOW','ALREADY_SYNCED','READY_TO_SYNC'].includes(x.status)).length+'</div>'+
        (rows.map(x=>'<div style="margin-top:7px;padding:7px;border:1px solid #d1d5db;border-radius:8px"><b>'+esc(x.product||x.sale_id||'Transaksi')+'</b> — '+esc(labels[x.status]||x.status)+'<div class="small">'+esc(x.variant||'')+' '+(x.amount!=null?'• Rp'+Number(x.amount).toLocaleString('id-ID'):'')+'</div>'+(x.accurate?.number?'<div class="small">Jurnal Accurate: '+esc(x.accurate.number)+'</div>':'')+(x.message||x.error?'<div class="small">'+esc(x.message||x.error)+'</div>':'')+'</div>').join('')||'<div class="small">Tidak ada transaksi konsinyasi yang cocok.</div>')+
        '<div class="small" style="margin-top:8px">Transaksi yang ditahan tidak dikirim. Periksa akun penerimaan sebelum memperbaiki mapping.</div>';
    }catch(e){if(result)result.textContent='Batch gagal: '+String(e?.message||e);}
  }
  window.hmPreviewConsignBatch=function(){return hmConsignBatch(false);};
  window.hmRunConsignBatch=function(){return hmConsignBatch(true);};
  window.hmCheckAccurateItems=async function(){
    try{
      openModal('📦 Cek Barang Accurate','<div class="box"><b>⏳ Sedang membaca daftar barang Accurate...</b><div class="small">Tidak membuat atau mengubah transaksi.</div></div>');
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'list_items'}});
      if(r.error) throw r.error;
      const data=r.data||{};
      if(!data.ok) throw new Error(data.error||'Gagal membaca barang Accurate.');
      const items=Array.isArray(data.items)?data.items:[];
      openModal('📦 Barang Accurate — '+items.length+' item',
        '<div class="box"><b>Berhasil membaca '+items.length+' barang.</b><div class="small">Database: Hello Majesty • hanya baca</div><div style="margin-top:10px"><button class="secondary" onclick="window.hmOpenAccurateProductMapping()">🧩 Buka Pemetaan Produk</button></div></div>'+
        '<div style="max-height:55vh;overflow:auto;margin-top:10px">'+
        (items.map((x)=>'<div class="lead"><div><b>'+esc(x.no||'-')+'</b> — '+esc(x.name||'-')+'</div><div class="small">Kategori Accurate: '+esc(x.category||'Tanpa kategori')+' • Tipe: '+esc(x.itemType||'-')+'</div><div class="small">ID: '+esc(x.id||'-')+'</div></div>').join('')||'<div class="box">Tidak ada barang inventory yang ditemukan.</div>')+
        '</div>');
    }catch(e){
      openModal('📦 Cek Barang Accurate','<div class="danger box">Gagal membaca barang Accurate: '+esc(e?.message||e)+'</div><div class="small" style="margin-top:8px">Pastikan akun Hello Majesty sudah login. Tidak ada transaksi yang dibuat.</div>');
    }
  };

  window.hmDiagnoseAccurateItems=async function(){
    try{
      openModal('🧪 Diagnosa Daftar Accurate','<div class="box"><b>⏳ Memeriksa hasil API...</b><div class="small">Hanya membaca daftar, tidak mengubah data.</div></div>');
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'diagnose_items'}});
      if(r.error) throw r.error;
      const data=r.data||{};
      if(!data.ok) throw new Error(data.error||'Diagnosa gagal.');
      const runs=Array.isArray(data.runs)?data.runs:[];
      openModal('🧪 Diagnosa Daftar Accurate',
        '<div class="box"><b>Diagnosa selesai — hanya baca</b><div class="small">Database: '+esc(data.database||'Accurate')+'</div></div>'+
        runs.map(function(x){
          const pg=x.pagination||{};
          const sample=Array.isArray(x.sample)?x.sample:[];
          const allItems=Array.isArray(x.allItems)?x.allItems:[];
          const hpMatches=Array.isArray(x.hpMatches)?x.hpMatches:[];
          return '<div class="lead"><b>'+esc(x.mode)+' • HTTP '+esc(x.httpStatus)+'</b>'+
            '<div class="small">Berhasil: '+esc(x.success)+' • Total baris: '+esc(pg.rowCount??'tidak tersedia')+' • Halaman: '+esc(pg.pageCount??'tidak tersedia')+' • Ukuran halaman: '+esc(pg.pageSize??'tidak tersedia')+'</div>'+
            '<div class="small">Halaman dibaca: '+esc(x.pagesRead??'-')+' • Barang HP cocok: '+esc(x.hpMatchCount??0)+'</div>'+
            (x.error?'<div class="small" style="color:#b91c1c">'+esc(x.error)+'</div>':'')+
            '<div style="margin-top:6px">'+(sample.map(function(i){return '<div class="small">'+esc(i.no||'-')+' — '+esc(i.name||'-')+' • tipe '+esc(i.itemType||'-')+' • ID '+esc(i.id||'-')+'</div>';}).join('')||'<div class="small">Tidak ada sampel.</div>')+'</div>'+
            '<div style="margin-top:6px"><b class="small">Seluruh barang yang dikembalikan API ('+esc(x.totalItemsReturned??allItems.length)+')</b>'+(allItems.map(function(i){return '<div class="small">'+esc(i.no||'-')+' — '+esc(i.name||'-')+' • tipe '+esc(i.itemType||'-')+' • ID '+esc(i.id||'-')+'</div>';}).join('')||'<div class="small">API tidak mengembalikan daftar item lengkap.</div>')+'</div>'+'<div style="margin-top:6px"><b class="small">HP ditemukan</b>'+(hpMatches.map(function(i){return '<div class="small">'+esc(i.no||'-')+' — '+esc(i.name||'-')+' • tipe '+esc(i.itemType||'-')+' • ID '+esc(i.id||'-')+'</div>';}).join('')||'<div class="small">Tidak ada nama HP cocok.</div>')+'</div></div>';
        }).join('')+
        '<div class="small" style="margin-top:8px">Kirim screenshot hasil ini untuk menentukan filter dan pagination yang tepat.</div>');
    }catch(e){
      openModal('🧪 Diagnosa Daftar Accurate','<div class="danger box">Gagal: '+esc(e?.message||e)+'</div>');
    }
  };
  window.hmDiagnoseAccurateCustomers=async function(){
    try{
      openModal('👤 Diagnosa Pelanggan Accurate','<div class="box"><b>⏳ Membaca daftar pelanggan...</b><div class="small">Pemeriksaan hanya baca; tidak membuat pelanggan atau faktur.</div></div>');
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'diagnose_customers'}});
      if(r.error) throw r.error;
      const d=r.data||{};
      if(!d.ok) throw new Error(d.error||'Diagnosa pelanggan gagal.');
      const pg=d.pagination||{};
      const matches=Array.isArray(d.walkInMatches)?d.walkInMatches:[];
      const customers=Array.isArray(d.customers)?d.customers:[];
      openModal('👤 Diagnosa Pelanggan Accurate',
        '<div class="box"><b>Diagnosa selesai — hanya baca</b><div class="small">Database: '+esc(d.database||'Accurate')+' • HTTP '+esc(d.httpStatus)+'</div><div class="small">Total pelanggan: '+esc(d.totalCustomers??customers.length)+' • Halaman dibaca: '+esc(d.pagesRead??'-')+' • Halaman API: '+esc(pg.pageCount??'-')+'</div></div>'+
        '<div class="lead"><b>🔎 Pemetaan Walk-In / Pelanggan Umum</b><div class="small">Jumlah yang cocok: '+esc(matches.length)+'</div>'+
        (matches.map(c=>'<div class="small">Kode: <b>'+esc(c.no||'(kode kosong)')+'</b> • Nama: '+esc(c.name||'-')+' • ID: '+esc(c.id||'-')+'</div>').join('')||'<div class="small" style="color:#b91c1c">Tidak ditemukan pelanggan bernama Pelanggan Umum.</div>')+
        (matches.length>1?'<div class="small" style="color:#b91c1c">Ada duplikasi nama Pelanggan Umum; perlu dirapikan sebelum sinkronisasi.</div>':'')+'</div>'+
        '<div class="lead"><b>Daftar pelanggan dari Accurate</b><div class="small">Kode • Nama • ID</div>'+
        (customers.map(c=>'<div class="small">'+esc(c.no||'(kode kosong)')+' — '+esc(c.name||'-')+' • ID '+esc(c.id||'-')+'</div>').join('')||'<div class="small">Tidak ada data pelanggan yang dikembalikan.</div>')+'</div>'+
        '<div class="small">Pemeriksaan ini tidak mengirim faktur dan tidak mengubah data Accurate.</div>');
    }catch(e){
      openModal('👤 Diagnosa Pelanggan Accurate','<div class="danger box">Gagal: '+esc(e?.message||e)+'</div>');
    }
  };
  window.hmDiagnoseFailedSales=async function(){
    try{
      openModal('🧾 Pemeriksaan Faktur Gagal','<div class="box"><b>⏳ Memeriksa daftar faktur Accurate...</b><div class="small">Hanya membaca, tidak mengirim atau mengubah faktur.</div></div>');
      const r=await sb.functions.invoke('accurate-sync',{body:{action:'diagnose_failed_sales'}});
      if(r.error) throw r.error;
      const d=r.data||{};
      if(!d.ok) throw new Error(d.error||'Pemeriksaan faktur gagal.');
      const rows=Array.isArray(d.matched)?d.matched:[];
      openModal('🧾 Pemeriksaan Faktur Gagal',
        '<div class="box"><b>Pemeriksaan selesai — hanya baca</b><div class="small">Database: '+esc(d.database||'Accurate')+' • HTTP '+esc(d.httpStatus)+' • Faktur dibaca: '+esc(d.invoicesRead||0)+'</div><div class="small">Halaman API: '+esc((d.pagination||{}).pageCount??'-')+' • Halaman diperiksa: '+esc(d.pagesRead||0)+'</div></div>'+
        rows.map(x=>'<div class="lead"><b>Transaksi lokal: '+esc(x.saleId)+'</b>'+(Array.isArray(x.invoices)&&x.invoices.length?x.invoices.map(i=>'<div class="small" style="margin-top:5px">'+esc(i.matchType==='ID'?'Cocok ID transaksi':'Kandidat cocok nama/tanggal/nominal')+' — No: '+esc(i.number||'-')+' • ID: '+esc(i.id||'-')+' • Pelanggan: '+esc(i.customerName||'-')+' • Tanggal: '+esc(i.transDate||'-')+' • Nominal: '+esc(i.totalAmount??'-')+'<div>'+esc(i.description||'')+'</div></div>').join(''):'<div class="small">Tidak ditemukan pada halaman faktur yang dibaca.</div>')+'</div>').join('')+
        '<div class="small">Pemeriksaan hanya membaca data Accurate; tidak membuat atau mengirim faktur.</div>');
    }catch(e){
      openModal('🧾 Pemeriksaan Faktur Gagal','<div class="danger box">Gagal memeriksa: '+esc(e?.message||e)+'</div><div class="small">Tidak ada faktur yang dikirim.</div>');
    }
  };
  window.__hmAccurateMapItems = [];
  window.__hmAccurateMapProducts = [];
  window.hmFilterAccurateMappings = function(value){
    const searchInput=document.getElementById('hm-accurate-map-search');
    const q=String(value===undefined?(searchInput?searchInput.value:''):value||'').trim().toLowerCase();
    const statusEl=document.getElementById('hm-accurate-map-status');
    const status=String(statusEl?statusEl.value:'UNMAPPED');
    document.querySelectorAll('[data-hm-accurate-map-card]').forEach(function(card){
      const matchesSearch=!q||String(card.getAttribute('data-search')||'').includes(q);
      const mapped=card.getAttribute('data-mapped')==='1';
      const matchesStatus=status==='ALL'||(status==='MAPPED'&&mapped)||(status==='UNMAPPED'&&!mapped);
      card.style.display=matchesSearch&&matchesStatus?'':'none';
    });
    const visible=[...document.querySelectorAll('[data-hm-accurate-map-card]')].filter(card=>card.style.display!=='none').length;
    const count=document.getElementById('hm-accurate-map-visible-count');
    if(count) count.textContent=visible+' produk ditampilkan';
  };
  window.hmOpenAccurateProductMapping=async function(){
    try{
      if(!isFinanceAdmin()) throw new Error('Pemetaan hanya untuk Developer/Management.');
      openModal('🧩 Pemetaan Produk Accurate','<div class="box"><b>⏳ Memuat produk Hello Majesty dan barang Accurate...</b><div class="small">Belum ada data yang diubah.</div></div>');
      const results=await Promise.all([
        sb.from('product_master').select('id,category,product,variant,grade,accurate_item_id,accurate_item_no').eq('active',true).order('category').order('product'),
        sb.from('stock_units').select('id,product_id,grade,color,accurate_item_id,accurate_item_no,status').in('status',['READY','SOLD']).eq('outlet','Majesty Plaza iPhone'),
        sb.functions.invoke('accurate-sync',{body:{action:'list_items'}}),
        sb.from('sales_transactions').select('stock_unit_id').eq('outlet','Majesty Plaza iPhone').eq('accurate_sync_status','FAILED')
      ]);
      if(results[0].error) throw results[0].error;
      if(results[1].error) throw results[1].error;
      if(results[2].error) throw results[2].error;
      if(results[3].error) throw results[3].error;
      const data=results[2].data||{};
      if(!data.ok) throw new Error(data.error||'Daftar barang Accurate gagal dimuat.');
      const failedStockIds=new Set((results[3].data||[]).map(function(s){return String(s.stock_unit_id||'');}).filter(Boolean));
      const mappingUnits=(results[1].data||[]).filter(function(u){return u.status==='READY'||failedStockIds.has(String(u.id));});
      const readyGroups={};
      mappingUnits.forEach(function(unit){
        if(!unit.product_id) return;
        const key=String(unit.product_id)+'|'+String(unit.grade||'')+'|'+String(unit.color||'');
        if(!readyGroups[key]) readyGroups[key]={product_id:String(unit.product_id),grade:unit.grade||'',color:unit.color||'',units:[],accurate_item_id:unit.accurate_item_id||'',accurate_item_no:unit.accurate_item_no||''};
        readyGroups[key].units.push(unit);
        if(!readyGroups[key].accurate_item_id&&unit.accurate_item_id) readyGroups[key].accurate_item_id=unit.accurate_item_id;
        if(!readyGroups[key].accurate_item_no&&unit.accurate_item_no) readyGroups[key].accurate_item_no=unit.accurate_item_no;
      });
      const masters=results[0].data||[];
      window.__hmAccurateMapProducts=Object.values(readyGroups).map(function(g){
        const p=masters.find(function(x){return String(x.id)===g.product_id;});
        return p?{...p,hm_ready_stock:g.units.length,hm_stock_unit_ids:g.units.map(u=>u.id),hm_grade:g.grade,hm_color:g.color,accurate_item_id:g.accurate_item_id||'',accurate_item_no:g.accurate_item_no||''}:null;
      }).filter(function(p){return p && ['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND'].includes(String(p.category||'').toUpperCase());}).sort(function(a,b){return String(a.category).localeCompare(String(b.category))||String(a.product).localeCompare(String(b.product))||String(a.variant).localeCompare(String(b.variant))||String(a.hm_grade).localeCompare(String(b.hm_grade))||String(a.hm_color).localeCompare(String(b.hm_color));});
      window.__hmAccurateMapItems=Array.isArray(data.items)?data.items.slice():[];
      window.__hmAccurateMapItems.sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''),'id',{numeric:true,sensitivity:'base'})||String(a.no||'').localeCompare(String(b.no||''),'id',{numeric:true,sensitivity:'base'});});
      const products=window.__hmAccurateMapProducts, items=window.__hmAccurateMapItems;
      // Show unmapped products first, then mapped products.
      products.sort(function(a,b){
        const aMapped=!!(a.accurate_item_id||a.accurate_item_no), bMapped=!!(b.accurate_item_id||b.accurate_item_no);
        if(aMapped!==bMapped) return aMapped?1:-1;
        return String(a.category).localeCompare(String(b.category))||String(a.product).localeCompare(String(b.product))||String(a.variant).localeCompare(String(b.variant));
      });
      const mapped=products.filter(p=>p.accurate_item_id||p.accurate_item_no).length;
      const optionsFor=function(current){
        return '<option value="">— Pilih barang Accurate —</option>'+items.map(function(x){
          const selected=current&&((current.accurate_item_id&&String(x.id)===String(current.accurate_item_id))||(current.accurate_item_no&&String(x.no)===String(current.accurate_item_no)));
          return '<option value="'+esc(x.id)+'"'+(selected?' selected':'')+'>'+esc(x.no||'(tanpa nomor)')+' — '+esc(x.name||'(tanpa nama)')+' • '+esc(x.category||'Tanpa kategori')+' [ID '+esc(x.id)+']</option>';
        }).join('');
      };
      const cards=products.map(function(p){
        const current=items.find(function(x){return (p.accurate_item_id&&String(x.id)===String(p.accurate_item_id))||(p.accurate_item_no&&String(x.no)===String(p.accurate_item_no));});
        const label=[p.product,p.variant,p.hm_color||null,p.hm_grade?'Grade '+p.hm_grade:null].filter(Boolean).join(' • ');
        const search=[p.category,p.product,p.variant,p.hm_color,p.hm_grade,p.accurate_item_no,current&&current.name,current&&current.category].filter(Boolean).join(' ').toLowerCase();
        const isMapped=!!(p.accurate_item_id||p.accurate_item_no);
        return '<div class="lead" data-hm-accurate-map-card="1" data-mapped="'+(isMapped?'1':'0')+'" data-search="'+esc(search)+'" style="margin-bottom:9px">'+
          '<div style="font-weight:800">'+esc(label)+'</div><div class="small" style="margin:3px 0 8px">Kategori: '+esc(p.category||'-')+' • Stok READY: '+esc(p.hm_ready_stock||0)+' unit</div>'+
          '<div class="small" style="margin-bottom:5px">'+(current?'Barang Accurate saat ini: '+esc(current.no)+' — '+esc(current.name):((p.accurate_item_no||p.accurate_item_id)?'Mapping tersimpan: '+esc(p.accurate_item_no||p.accurate_item_id)+' (tidak ditemukan dalam daftar saat ini)':'Belum dipetakan'))+'</div>'+
          '<select id="hm-accurate-map-'+esc(p.id)+'-'+esc(p.hm_grade||'none')+'-'+esc(p.hm_color||'none')+'" style="width:100%;min-height:42px;padding:8px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827">'+optionsFor(p)+'</select>'+
          '<div class="row" style="margin-top:8px;align-items:center"><button class="secondary" onclick="window.hmSaveAccurateProductMapping(\''+esc(p.id)+'\',\''+esc(p.hm_grade||'')+'\',\''+esc(p.hm_color||'')+'\')">💾 Simpan Mapping Grade Ini</button><span id="hm-accurate-map-msg-'+esc(p.id)+'-'+esc(p.hm_grade||'none')+'-'+esc(p.hm_color||'none')+'" class="small"></span></div>'+
        '</div>';
      }).join('');
      openModal('🧩 Pemetaan Produk Accurate',
        '<div class="box"><b>Mapping stok Plaza (non-Majesty Cell): '+mapped+' / '+products.length+'</b><div class="small">Tahap 1 hanya menampilkan kategori iPhone/Android New dan Second dengan stok READY di Majesty Plaza iPhone. Stok titipan/kategori Majesty Cell dikecualikan. Barang Accurate tersedia untuk dipilih: '+items.length+'.</div><div class="small" style="margin-top:6px">Stok pusat dan outlet lain tidak masuk tahap ini. Mapping produk yang tersembunyi tetap tersimpan. Tidak membuat barang baru, tidak mengubah stok, dan tidak mengirim transaksi.</div></div>'+
        '<input id="hm-accurate-map-search" type="search" placeholder="Cari produk, varian, kategori..." oninput="window.hmFilterAccurateMappings(this.value)" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:12px;margin:10px 0">'+
        '<div class="row" style="align-items:center;gap:10px;margin-bottom:8px"><select id="hm-accurate-map-status" onchange="window.hmFilterAccurateMappings()" style="flex:1;min-width:0;padding:11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827"><option value="UNMAPPED" selected>Belum mapping</option><option value="MAPPED">Sudah mapping</option><option value="ALL">Semua produk</option></select><span id="hm-accurate-map-visible-count" class="small">'+(products.length-mapped)+' produk ditampilkan</span></div>'+
        '<div style="max-height:55vh;overflow:auto;padding-right:3px">'+(cards||'<div class="box">Tidak ada produk aktif.</div>')+'</div>');

    }catch(e){
      console.error('[HM Accurate mapping]',e);
      openModal('🧩 Pemetaan Produk Accurate','<div class="danger box"><b>Gagal membuka pemetaan</b><div style="margin-top:6px">'+esc(e?.message||e)+'</div></div>');
    }
  };
  window.hmSaveAccurateProductMapping=async function(productId,grade,color){
    const suffix=String(grade||'none')+'-'+String(color||'none');
    const msg=document.getElementById('hm-accurate-map-msg-'+productId+'-'+suffix);
    const select=document.getElementById('hm-accurate-map-'+productId+'-'+suffix);
    const say=function(t,ok){if(msg){msg.textContent=t;msg.style.color=ok?'#15803d':'#b91c1c';}};
    try{
      if(!isFinanceAdmin()) throw new Error('Akses pemetaan ditolak.');
      if(!select||!select.value){say('Pilih barang Accurate dulu.',false);return;}
      const item=window.__hmAccurateMapItems.find(function(x){return String(x.id)===String(select.value);});
      const product=window.__hmAccurateMapProducts.find(function(x){return String(x.id)===String(productId)&&String(x.hm_grade||'')===String(grade||'')&&String(x.hm_color||'')===String(color||'');});
      if(!item||!product) throw new Error('Produk atau barang Accurate tidak ditemukan. Buka ulang pemetaan.');
      say('Menyimpan...',true);
      let query=sb.from('stock_units').update({accurate_item_id:String(item.id),accurate_item_no:String(item.no||'')})
        .eq('product_id',productId).eq('outlet','Majesty Plaza iPhone').in('status',['READY','SOLD']);
      query=grade?query.eq('grade',grade):query.is('grade',null);
      query=color?query.eq('color',color):query.is('color',null);
      const result=await query.select('id,accurate_item_id,accurate_item_no');
      if(result.error) throw result.error;
      if(!result.data||!result.data.length) throw new Error('Tidak ada unit stok yang diperbarui. Mapping belum tersimpan.');
      product.accurate_item_id=String(item.id);
      product.accurate_item_no=String(item.no||'');
      say('Tersimpan untuk '+result.data.length+' unit: '+String(item.no||'-')+' ✓',true);
      const total=window.__hmAccurateMapProducts.length;
      const mapped=window.__hmAccurateMapProducts.filter(function(p){return p.accurate_item_id||p.accurate_item_no;}).length;
      const first=document.querySelector('#mb .box b');
      if(first) first.textContent='Mapping berdasarkan grade: '+mapped+' / '+total;
    }catch(e){
      console.error('[HM Accurate mapping save]',e);
      say(e?.message||String(e),false);
    }
  };

  window.hmOpenAccurateSyncMonitor=async function(){
    try{
      if(!isFinanceAdmin()) throw new Error('Akun ini belum dikenali sebagai Developer/Management. Role terbaca: '+String(window.profile?.role||'(kosong)'));
      openModal('🔗 Accurate Sync Monitor','<div class="box"><b>⏳ Memuat status sinkronisasi...</b><div class="small">Mengambil antrean, riwayat sinkronisasi, dan konflik.</div></div>');
      await load();
    }catch(e){
      const msg=String(e?.message||e||'Kesalahan tidak diketahui');
      console.error('[HM Accurate] Monitor gagal dibuka:',e);
      try{ openModal('🔗 Accurate Sync Monitor','<div class="danger box"><b>Monitor gagal memuat data</b><div style="margin-top:6px">'+esc(msg)+'</div></div>'); }
      catch(_){ alert('Accurate Sync gagal dibuka: '+msg); }
    }
  };
  window.addEventListener('DOMContentLoaded',function(){
    setTimeout(function(){
      try{
        if(!isFinanceAdmin()) return;
        // Accurate Sync sudah tersedia di grup ACCURATE; jangan sisipkan pintasan duplikat ke ACCOUNTING.
        return;
        const nodes=[...document.querySelectorAll('button')];
        const accounting=nodes.find(b=>/Dashboard Accounting/i.test(b.textContent||''));
        if(!accounting) return;
        const parent=accounting.parentElement;
        if(parent && !parent.querySelector('[data-hm-accurate-sync]')){
          const b=document.createElement('button');
          b.setAttribute('data-hm-accurate-sync','1');
          b.innerHTML='<b>🔗 Accurate Sync</b><span>Pantau data sinkron & konflik</span>';
          b.onclick=window.hmOpenAccurateSyncMonitor;
          parent.appendChild(b);
        }
      }catch(e){console.warn('[HM Accurate Monitor]',e);}
    },1500);
  });
})();
(function(){
  function hmAddFacilitatorReportButton(){
    try{
      const p=window.profile||{};
      const raw=String(p.role||'').trim().toUpperCase().replace(/_/g,' ');
      const isFacilitator=raw==='FASILITATOR'||(Array.isArray(p.roles)&&p.roles.some(r=>String(r).trim().toUpperCase().replace(/_/g,' ')==='FASILITATOR'));
      if(!p.is_management&&!isFacilitator)return;
      if(typeof window.openFacilitatorReports!=='function')return;
      const launcher=document.getElementById('inventoryLauncher');
      if(!launcher||launcher.querySelector('[data-hm-facilitator-reports]'))return;
      const row=launcher.querySelector('.row');
      if(!row)return;
      const b=document.createElement('button');
      b.className='secondary';
      b.type='button';
      b.setAttribute('data-hm-facilitator-reports','1');
      b.textContent='📲 Laporan Fasilitator';
      b.onclick=window.openFacilitatorReports;
      row.appendChild(b);
    }catch(e){console.warn('[HM Facilitator Report]',e);}
  }
  window.addEventListener('DOMContentLoaded',function(){
    setTimeout(hmAddFacilitatorReportButton,1800);
    setTimeout(hmAddFacilitatorReportButton,3500);
  });
})();
