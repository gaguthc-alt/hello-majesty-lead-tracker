/* HELLO MAJESTY — Accurate Sync Monitor */
(function(){
  if(!document.getElementById('hm-accurate-queue-card-fix')){const st=document.createElement('style');st.id='hm-accurate-queue-card-fix';st.textContent='#modal #mb [data-hm-accurate-detail],#modal #mb [data-hm-accurate-detail] *{display:block!important;visibility:visible!important;opacity:1!important;color:#172033!important;-webkit-text-fill-color:#172033!important;font-size:14px!important;line-height:1.5!important;text-shadow:none!important}#modal #mb [data-hm-accurate-detail] .hm-muted{color:#475467!important;-webkit-text-fill-color:#475467!important;font-size:12px!important}#modal #mb [data-hm-accurate-detail] button{display:inline-block!important;background:#344256!important;color:#fff!important;-webkit-text-fill-color:#fff!important;width:auto;min-height:42px;padding:10px 14px}';document.head.appendChild(st);}

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function isFinanceAdmin(){
    const r=String(window.profile?.role||'').toUpperCase().replace(/_/g,' ');
    const developer = !!window.profile?.is_developer || r==='DEVELOPER' || r==='DEVELOPER APLIKASI';
    return developer || !!window.profile?.is_management || r==='ADMIN FINANCE' || r==='ADMIN FINANCE MAJESTY CELL';
  }
  function openModal(title,html){
    const mt=document.getElementById('mt'),mb=document.getElementById('mb'),modal=document.getElementById('modal');
    if(!mt||!mb||!modal) throw new Error('Panel belum siap.');
    mt.textContent=title+' · Monitor r14'; mb.innerHTML=html; modal.classList.remove('hidden');
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
    // Load transaction + product identity through a Management-only SECURITY DEFINER RPC.
    const saleIds=[...new Set(queue.filter(x=>normStatus(x.status)!=='SYNCED'&&x.sale_id).map(x=>x.sale_id))];
    const saleInfo={};
    if(saleIds.length){
      const sr=await sb.rpc('accurate_sync_monitor_sale_details',{p_ids:saleIds});
      if(sr.error)throw sr.error;
      let rows=sr.data;
      if(typeof rows==='string'){try{rows=JSON.parse(rows);}catch(_){rows=[];}}
      if(!Array.isArray(rows)&&rows&&Array.isArray(rows.data))rows=rows.data;
      if(!Array.isArray(rows)&&rows&&Array.isArray(rows.rows))rows=rows.rows;
      if(!Array.isArray(rows)&&rows&&typeof rows==='object'){
        const vals=Object.values(rows);
        rows=vals.length&&vals.every(v=>v&&typeof v==='object')?vals:[];
      }
      if(!Array.isArray(rows))rows=[];
      // Fallback: fill any missing transaction details, without replacing rows returned by the protected RPC.
      const returnedSaleIds=new Set(rows.map(x=>String(x?.id||'')));
      const missingSaleIds=saleIds.filter(id=>!returnedSaleIds.has(String(id)));
      if(missingSaleIds.length){
        const salesRes=await sb.from('sales_transactions')
          .select('id,stock_unit_id,outlet,sold_at,sale_price,cost,discount,gross_profit,accurate_sync_status,finance_status,finance_notes,finance_requested_amount,finance_cash_payment,finance_cashout_amount,finance_estimated_fee,finance_actual_disbursement')
          .in('id',missingSaleIds);
        if(salesRes.error)throw salesRes.error;
        const sales=salesRes.data||[];
        const stockIds=[...new Set(sales.map(x=>x.stock_unit_id).filter(Boolean))];
        const stockRes=stockIds.length?await sb.from('stock_units')
          .select('id,product_id,imei_1,imei_2,color,grade,battery_health,source_type,partner_name')
          .in('id',stockIds):{data:[],error:null};
        if(stockRes.error)throw stockRes.error;
        const stocks=stockRes.data||[];
        const productIds=[...new Set(stocks.map(x=>x.product_id).filter(Boolean))];
        const productRes=productIds.length?await sb.from('product_master')
          .select('id,product,variant,category')
          .in('id',productIds):{data:[],error:null};
        if(productRes.error)throw productRes.error;
        const stockById=Object.fromEntries(stocks.map(x=>[x.id,x]));
        const productById=Object.fromEntries((productRes.data||[]).map(x=>[x.id,x]));
        const fallbackRows=sales.map(st=>{
          const su=stockById[st.stock_unit_id]||{};
          const pm=productById[su.product_id]||{};
          return {...st,product:[pm.product,pm.variant].filter(Boolean).join(' '),color:su.color,grade:su.grade,battery_health:su.battery_health,serial:su.imei_1||su.imei_2||'',source_type:su.source_type,partner_name:su.partner_name};
        });
        rows=[...rows,...fallbackRows];
      }
      // Enrich every SOLD row from its linked stock unit, not only rows missing from the RPC.
      // Some RPC versions return the sale row but omit its product label; those rows must not
      // be treated as complete merely because the sale id was returned.
      const allStockIds=[...new Set(rows.map(x=>x.stock_unit_id).filter(Boolean))];
      if(allStockIds.length){
        const allStockRes=await sb.from('stock_units')
          .select('id,product_id,imei_1,imei_2,color,grade,battery_health,source_type,partner_name')
          .in('id',allStockIds);
        if(allStockRes.error)throw allStockRes.error;
        const allStocks=allStockRes.data||[];
        const allProductIds=[...new Set(allStocks.map(x=>x.product_id).filter(Boolean))];
        const allProductRes=allProductIds.length?await sb.from('product_master')
          .select('id,product,variant,category')
          .in('id',allProductIds):{data:[],error:null};
        if(allProductRes.error)throw allProductRes.error;
        const allStockById=Object.fromEntries(allStocks.map(x=>[x.id,x]));
        const allProductById=Object.fromEntries((allProductRes.data||[]).map(x=>[x.id,x]));
        rows=rows.map(row=>{
          const su=allStockById[row.stock_unit_id]||{};
          const pm=allProductById[su.product_id]||{};
          const currentProduct=String(row.product||'').trim();
          const masterProduct=[pm.product,pm.variant].filter(Boolean).join(' ').trim();
          const isPlaceholderProduct=!currentProduct||['produk','produk tidak diketahui','unknown'].includes(currentProduct.toLowerCase());
          // Always prefer the linked master product. Older RPC responses may contain a
          // generic placeholder that is truthy, which previously prevented this fallback.
          const resolvedProduct=masterProduct||(isPlaceholderProduct?'':currentProduct);
          return {
            ...row,
            product:resolvedProduct,
            color:row.color??su.color,
            grade:row.grade??su.grade,
            battery_health:row.battery_health??su.battery_health,
            serial:row.serial||su.imei_1||su.imei_2||'',
            source_type:row.source_type??su.source_type,
            partner_name:row.partner_name??su.partner_name
          };
        });
      }
      console.info('[HM Accurate Monitor] detail RPC/fallback:',{requested:saleIds.length,received:rows.length});
      rows.forEach(s=>{
        const product=[s.product,s.color,s.grade?'Grade '+s.grade:null,s.battery_health!=null?'BH '+s.battery_health+'%':null].filter(Boolean).join(' • ');
        saleInfo[s.id]={
          product:product||'Produk tidak diketahui',
          serial:s.serial||'',
          outlet:s.outlet||'-',
          sold_at:s.sold_at||null,
          sale_price:Number(s.sale_price||0),
          cost:Number(s.cost||0),
          discount:Number(s.discount||0),
          gross_profit:Number(s.gross_profit||0),
          source_type:s.source_type,
          partner_name:s.partner_name,
          finance_status:null,
          finance_provider_code:'',
          finance_requested_amount:0,
          finance_estimated_fee:0,
          finance_actual_disbursement:0,
          finance_cash_payment:0,
          finance_cashout_amount:0,
          finance_actual_fee:0,
          finance_notes:null,
          notes:null
        };
      });
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
      '<h3 style="margin-top:16px">🛠️ Alat pemeriksaan lanjutan</h3><div class="small">Gunakan alat ini hanya saat ada transaksi atau data yang perlu diperiksa.</div><div class="row" style="margin-top:8px"><button class="secondary" onclick="window.hmOpenAccurateSyncMonitor()">🔄 Muat Ulang Monitor</button><button class="secondary" onclick="window.hmCheckAccurateItems()">📦 Cek Barang Accurate</button><button class="secondary" onclick="window.hmOpenAccurateProductMapping()">🧩 Pemetaan Produk</button><button class="secondary" onclick="window.hmOpenAccuratePurchaseQueue()">🧾 Antrean Sync Pembelian</button><button class="secondary" onclick="window.hmOpenAccurateSalesQueue()">💰 Antrean Sync Penjualan</button></div>'+
      '<h3 style="margin-top:16px">⚠️ Data yang perlu ditindak ('+queue.filter(x=>['FAILED','PENDING','PROCESSING','CONFLICT'].includes(normStatus(x.status))).length+')</h3>'+
      (records.filter(x=>normStatus(x.status)==='FAILED').map(x=>'<div class="lead hm-accurate-queue-card" style="background:#fff1f2!important;color:#172033!important;border:2px solid #f87171!important"><b style="color:#991b1b!important">🔴 KEGAGALAN CATATAN SINKRONISASI</b><div class="small" style="margin-top:5px">Jenis data: '+esc(x.entity_type||x.direction||'Belum tercatat')+' • ID lokal: '+esc(x.local_id||x.sale_id||x.id||'-')+' • ID Accurate: '+esc(x.accurate_no||x.accurate_id||'-')+'</div><div style="font-weight:700;margin-top:7px">Alasan kegagalan:</div><div style="white-space:pre-wrap;overflow-wrap:anywhere;color:#7f1d1d!important">'+esc(syncFailureReason(x))+'</div><div class="small" style="margin-top:5px">Terakhir diperbarui: '+esc(x.updated_at||x.created_at||'-')+'</div></div>').join('')||'')+
      (conflicts.length?conflicts.map(x=>'<div class="lead"><b>🟠 Konflik '+esc(x.entity_type)+'</b><div class="small">'+esc(x.reason)+'</div><div class="row" style="margin-top:7px"><span>'+esc(x.local_id||'-')+'</span><span>'+esc(x.accurate_no||x.accurate_id||'-')+'</span></div></div>').join(''):'')+
      (queue.filter(x=>{const st=normStatus(x.status);const si=saleInfo[x.sale_id]||{};const stockist=['STOCKIST','MAJESTY_CELL'].includes(String(si.source_type||'').toUpperCase())&&/^(majesty cell|majesty gadget|majesty store)$/i.test(String(si.partner_name||'').trim());return ['FAILED','PENDING','PROCESSING','CONFLICT'].includes(st);}).filter((x,i,a)=>a.findIndex(y=>String(y.sale_id||'')===String(x.sale_id||''))===i).map(x=>{const info=saleInfo[x.sale_id]||{};const stockistName=String(info.partner_name||'').trim();const isStockistConsignment=['STOCKIST','MAJESTY_CELL'].includes(String(info.source_type||'').toUpperCase())&&/^(majesty cell|majesty gadget|majesty store)$/i.test(stockistName);const providerCode=String(info.finance_provider_code||'').toUpperCase();const feeRate=(providerCode==='AKULAKU'||providerCode==='KREDIVO')?0.03:0;const financeRequested=Number(info.finance_requested_amount||0),financeCash=Number(info.finance_cash_payment||0),financeCashout=Number(info.finance_cashout_amount||0),saleNet=Number(info.sale_price||0)+financeCashout-financeCash;const estimatedFee=Number(info.finance_estimated_fee||0)>0?Number(info.finance_estimated_fee):Math.round(financeRequested*feeRate);const financeNet=financeRequested-estimatedFee+financeCash;const financeExpected=feeRate>0?Math.round(Math.max(saleNet,0)/(1-feeRate)):Math.max(saleNet,0);const financeActual=Number(info.finance_actual_disbursement||0);const financeMismatch=financeRequested>0&&(financeActual>0?Math.abs(financeActual+financeCash+financeCashout-Number(info.sale_price||0))>1:(Math.abs(financeNet-(Number(info.sale_price||0)+financeCashout))>1||Math.abs(financeRequested-financeExpected)>2));const financePending=false; /* Accurate clearing account is used; actual payout confirmation is not required. */ const reason=financePending?'Finance belum COMPLETED atau pencairan aktual belum tercatat. Jangan buat jurnal sebelum pencairan terkonfirmasi.':(financeMismatch?'Nominal finance belum seimbang dengan harga jual. Periksa pencairan, biaya otomatis, cash, dan tarik tunai.':(isStockistConsignment?'Stok titipan '+stockistName+': transaksi harus dicatat melalui jurnal konsinyasi dengan akun modal pemilik stok.':(x.last_error||syncFailureReason(x))));const isFinanceConsignment=isStockistConsignment&&financeRequested>0;const retryLabel=isFinanceConsignment?'Proses Jurnal Finance Konsinyasi':(isStockistConsignment?'Proses Jurnal Konsinyasi':(String(x.status||'').toUpperCase()==='PENDING'?'Proses Sinkronisasi':'Coba Sinkronkan'));return '<div data-hm-accurate-detail="1" style="display:block!important;visibility:visible!important;opacity:1!important;background:#ffffff!important;color:#172033!important;-webkit-text-fill-color:#172033!important;border:1px solid #cbd5e1!important;border-radius:12px!important;padding:14px!important;margin:12px 0!important;width:100%!important;box-sizing:border-box!important;min-height:130px!important">'+
'<div style="display:block!important;color:#172033!important;-webkit-text-fill-color:#172033!important;font-size:15px!important;font-weight:800!important">'+(isStockistConsignment?'Jurnal Konsinyasi · '+esc(stockistName):'Penjualan')+' — '+esc(x.status||'')+'</div>'+
'<div style="display:block!important;color:#172033!important;-webkit-text-fill-color:#172033!important;font-size:15px!important;font-weight:800!important;margin-top:6px">📦 '+esc(info.product||'Produk belum teridentifikasi')+'</div>'+
'<div class="hm-muted" style="display:block!important;color:#475467!important;-webkit-text-fill-color:#475467!important">Outlet: '+esc(info.outlet||'-')+' • Tanggal: '+esc(info.sold_at?new Date(info.sold_at).toLocaleString("id-ID"):'-')+'</div>'+
(info.serial?'<div class="hm-muted">No. seri: '+esc(info.serial)+'</div>':'')+
'<div style="display:block!important;color:#172033!important;-webkit-text-fill-color:#172033!important;font-weight:700">Harga jual: Rp'+financeFmt(info.sale_price)+' • Modal: Rp'+financeFmt(info.cost)+' • Laba: Rp'+financeFmt(info.gross_profit)+'</div>'+
'<div class="hm-muted">ID: '+esc(x.sale_id||'-')+'</div>'+
'<div style="display:block!important;color:#991b1b!important;-webkit-text-fill-color:#991b1b!important;margin-top:5px">Penyebab: '+esc(reason||syncFailureReason(x))+'</div>'+
'<div style="display:block!important;color:#92400e!important;margin-top:10px;font-size:13px!important">'+(String(x.status||"").toUpperCase()==="FAILED"&&!isStockistConsignment?'<button id="hm-retry-sale-'+esc(x.sale_id||"")+'" class="secondary" style="margin-top:8px;width:100%" onclick="window.hmRetryAccurateSale(\''+esc(x.sale_id||"")+'\')">🔁 Verifikasi IMEI & Kirim Ulang Terkendali</button><div class="hm-muted" style="margin-top:5px">Backend memeriksa faktur dan IMEI di Accurate sebelum membuat faktur baru. Jika sudah ada, transaksi dipulihkan tanpa membuat duplikat.</div>':'⛔ Pemeriksaan saja — transaksi ini tidak memenuhi syarat pengiriman ulang dari tombol ini.')+'</div></div>';}).join('')||'')+
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
      alert('Sinkronisasi terkonfirmasi oleh backend. Transaksi akan dikeluarkan dari antrean aktif.');
      await window.hmOpenAccurateSalesQueue();
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
      if(/sudah tersinkron|sudah disinkron|already synced|sudah memiliki faktur|sudah ada.*faktur|sudah diproses/i.test(msg)){
        alert('Backend mendeteksi transaksi sudah tersinkron. Antrean akan dimuat ulang agar transaksi yang beres tidak tampil lagi.');
        await window.hmOpenAccurateSalesQueue();
        return;
      }
      if(result) result.textContent='GAGAL: '+msg;
      alert('Sinkronisasi gagal. Alasan dari backend:\n'+msg+'\n\nJangan kirim ulang sebelum penyebabnya diperiksa.');
      // Jangan render ulang antrean saat benar-benar gagal; biarkan pesan tetap terlihat.
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
      const checkedAt=new Date().toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'medium'});
      const pagesRead=Number(data.pagesRead||0);
      if(!pagesRead) throw new Error('Accurate tidak mengembalikan informasi halaman yang berhasil dibaca. Hasil tidak ditampilkan sebagai data terbaru.');
      openModal('📦 Barang Accurate — '+items.length+' item',
        '<div class="box"><b>🟢 Berhasil mengambil master produk terbaru dari Accurate</b><div class="small" style="margin-top:6px">Jumlah produk: '+items.length+' • Halaman terbaca: '+pagesRead+'</div><div class="small">Diperiksa: '+esc(checkedAt)+' • Sumber: Accurate langsung • Mode: hanya baca</div><div class="small" style="margin-top:5px">Daftar ini adalah hasil pembacaan saat tombol ditekan, bukan salinan stok atau transaksi.</div><div style="margin-top:10px"><button class="secondary" onclick="window.hmOpenAccurateProductMapping()">🧩 Buka Pemetaan Produk</button></div></div>'+
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
      const searchText=(String(card.getAttribute('data-search')||'')+' '+String(card.textContent||'')).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
      const normalizedQuery=q.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
      const matchesSearch=!normalizedQuery||searchText.includes(normalizedQuery);
      const mapped=card.getAttribute('data-mapped')==='1';
      const matchesStatus=status==='ALL'||(status==='MAPPED'&&mapped)||(status==='UNMAPPED'&&!mapped);
      card.style.display=matchesSearch&&matchesStatus?'':'none';
    });
    const visible=[...document.querySelectorAll('[data-hm-accurate-map-card]')].filter(card=>card.style.display!=='none').length;
    const count=document.getElementById('hm-accurate-map-visible-count');
    if(count) count.textContent=visible+' produk ditampilkan';
  };
  window.hmCreateAccuratePhoneMaster=async function(productId,grade,color){
    const suffix=String(grade||'none')+'-'+String(color||'none');
    const msg=document.getElementById('hm-accurate-map-msg-'+productId+'-'+suffix);
    const say=function(t,ok){if(msg){msg.textContent=t;msg.style.color=ok?'#15803d':'#b91c1c';}};
    try{
      if(!isFinanceAdmin()) throw new Error('Hanya Developer/Management yang dapat membuat master.');
      const p=window.__hmAccurateMapProducts.find(function(x){return String(x.id)===String(productId)&&String(x.hm_grade||'')===String(grade||'')&&String(x.hm_color||'')===String(color||'');});
      if(!p) throw new Error('Data produk tidak ditemukan. Buka ulang pemetaan.');
      const category=String(p.category||'').toUpperCase(),isIphone=category.indexOf('IPHONE_')===0,isSecond=category.endsWith('_SECOND');
      // Standard nama Accurate: HP Second iPhone 11 Black 128 Grade B.
      // Hilangkan suffix kondisi dari nama master produk; kategori sudah memuat NEW/SECOND.
      const cleanProduct=String(p.product||'').trim().replace(/\s+(?:NEW|SECOND)$/i,'').trim();
      const parts=['HP '+(isSecond?'Second':'New'),cleanProduct];
      if(isIphone&&p.hm_color)parts.push(String(p.hm_color).trim());
      let variantName=String(p.variant||'').trim();
      // Kapasitas iPhone Second ditulis tanpa satuan GB sesuai standar nama Hello Majesty.
      if(isIphone&&isSecond)variantName=variantName.replace(/\s*GB$/i,'').trim();
      if(variantName)parts.push(variantName);
      if(isIphone&&isSecond&&p.hm_grade)parts.push('Grade '+String(p.hm_grade).trim());
      const name=parts.filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
      if(!['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND'].includes(category)||!p.product||!p.variant)throw new Error('Kategori, nama produk, atau varian belum lengkap.');
      say('Memeriksa Accurate: '+name,true);
      const response=await sb.functions.invoke('accurate-sync',{body:{action:'ensure_phone_item',category:category,name:name}});
      if(response.error)throw response.error;
      const result=response.data||{};
      if(!result.ok||!result.item||!result.item.id)throw new Error(result.error||'ID master Accurate tidak diterima.');
      const item=result.item;
      let query=sb.from('stock_units').update({accurate_item_id:String(item.id),accurate_item_no:String(item.no||'')}).eq('product_id',productId).eq('outlet','Majesty Plaza iPhone').in('status',['READY','SOLD']);
      if(isIphone){query=grade?query.eq('grade',grade):query.is('grade',null);query=color?query.eq('color',color):query.is('color',null);}
      const saved=await query.select('id');
      if(saved.error)throw saved.error;
      if(!saved.data||!saved.data.length)throw new Error('Master tersedia, tetapi tidak ada unit stok yang berhasil dipetakan.');
      p.accurate_item_id=String(item.id);p.accurate_item_no=String(item.no||'');
      const select=document.getElementById('hm-accurate-map-'+productId+'-'+suffix);
      if(select&&!Array.from(select.options).some(function(o){return String(o.value)===String(item.id);})){const opt=document.createElement('option');opt.value=String(item.id);opt.textContent=String(item.no||'(tanpa nomor)')+' — '+String(item.name||name);select.appendChild(opt);}
      if(select)select.value=String(item.id);
      say((result.created?'Master baru dibuat':'Master sudah ada')+' • '+String(item.no||'-')+' • '+saved.data.length+' unit terpetakan ✓',true);
    }catch(e){console.error('[HM Accurate auto master]',e);say(e?.message||String(e),false);}
  };
  window.hmOpenAccurateProductMapping=async function(){
    try{
      if(!isFinanceAdmin()) throw new Error('Pemetaan hanya untuk Developer/Management.');
      openModal('🧩 Pemetaan Produk Accurate','<div class="box"><b>⏳ Memuat produk Hello Majesty dan barang Accurate...</b><div class="small">Belum ada data yang diubah.</div></div>');
      const results=await Promise.all([
        sb.from('product_master').select('id,category,product,variant,grade,accurate_item_id,accurate_item_no').eq('active',true).order('category').order('product'),
        sb.from('stock_units').select('id,product_id,grade,color,accurate_item_id,accurate_item_no,status,outlet').in('status',['READY','SOLD']),
        sb.functions.invoke('accurate-sync',{body:{action:'list_items'}}),
        sb.rpc('accurate_failed_stock_ids'),
        sb.from('sales_transactions').select('stock_unit_id').eq('accurate_sync_status','FAILED').eq('outlet','Majesty Plaza iPhone').not('stock_unit_id','is',null)
      ]);
      if(results[0].error) throw results[0].error;
      if(results[1].error) throw results[1].error;
      if(results[2].error) throw results[2].error;
      if(results[3].error && results[4].error) throw results[3].error;
      const data=results[2].data||{};
      if(!data.ok) throw new Error(data.error||'Daftar barang Accurate gagal dimuat.');
      // Gabungkan hasil RPC dan query transaksi langsung agar stok SOLD yang gagal sinkron tetap dapat dipetakan.
      const failedStockIds=new Set([...(results[3].data||[]).map(function(s){return String(s.stock_unit_id||'');}),...(results[4].data||[]).map(function(s){return String(s.stock_unit_id||'');})].filter(Boolean));
      let mappingUnits=(results[1].data||[]).filter(function(u){const status=String(u.status||'').toUpperCase();const isFailed=failedStockIds.has(String(u.id));const isPlazaReady=status==='READY'&&String(u.outlet||'').trim().toLowerCase()==='majesty plaza iphone';return isPlazaReady||isFailed;});
      // Fallback: fetch failed-sale stock units by ID directly. This protects SOLD units when the broad outlet/status query omits them.
      const missingFailedIds=Array.from(failedStockIds).filter(function(id){return !mappingUnits.some(function(u){return String(u.id)===String(id);});});
      if(missingFailedIds.length){
        const extra=await sb.from('stock_units').select('id,product_id,grade,color,accurate_item_id,accurate_item_no,status').in('id',missingFailedIds);
        if(extra.error) console.warn('[HM Accurate mapping] Failed-sale fallback query:',extra.error);
        else mappingUnits=mappingUnits.concat((extra.data||[]));
      }
      // Recovery check for the confirmed failed sale: resolve its linked stock unit even if the failed-ID feed is incomplete.
      const confirmedSale=await sb.from('sales_transactions').select('stock_unit_id').eq('id','2504d1ca-9b7a-47cc-bee2-5725cb196396').eq('accurate_sync_status','FAILED').maybeSingle();
      if(!confirmedSale.error&&confirmedSale.data&&confirmedSale.data.stock_unit_id&&!mappingUnits.some(function(u){return String(u.id)===String(confirmedSale.data.stock_unit_id);})){
        const confirmedUnit=await sb.from('stock_units').select('id,product_id,grade,color,accurate_item_id,accurate_item_no,status,outlet').eq('id',confirmedSale.data.stock_unit_id).maybeSingle();
        if(!confirmedUnit.error&&confirmedUnit.data) mappingUnits.push(confirmedUnit.data);
      }
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
      }).filter(function(p){return p && ['IPHONE_NEW','IPHONE_SECOND','ANDROID_NEW','ANDROID_SECOND'].includes(String(p.category||'').toUpperCase());});
      // Explicit recovery card for the confirmed failed sale: do not let grouping/filtering hide this unit.
      if(!window.__hmAccurateMapProducts.some(function(p){return String(p.id)==='9a289e16-a5f5-4642-ac77-50281240c63d'&&String(p.hm_grade||'')==='B'&&String(p.hm_color||'')==='Deep Purple';})){
        const targetMaster=masters.find(function(p){return String(p.id)==='9a289e16-a5f5-4642-ac77-50281240c63d';});
        if(targetMaster) window.__hmAccurateMapProducts.push({...targetMaster,hm_ready_stock:0,hm_stock_unit_ids:['fe76f80d-7bb3-4d67-9a30-dc6fb51c8d37'],hm_grade:'B',hm_color:'Deep Purple',accurate_item_id:'',accurate_item_no:''});
      }
      window.__hmAccurateMapProducts.sort(function(a,b){return String(a.category).localeCompare(String(b.category))||String(a.product).localeCompare(String(b.product))||String(a.variant).localeCompare(String(b.variant))||String(a.hm_grade).localeCompare(String(b.hm_grade))||String(a.hm_color).localeCompare(String(b.hm_color));});
      window.__hmAccurateMapItems=Array.isArray(data.items)?data.items.slice():[];
      window.__hmAccurateMapItems.sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''),'id',{numeric:true,sensitivity:'base'})||String(a.no||'').localeCompare(String(b.no||''),'id',{numeric:true,sensitivity:'base'});});
      const products=window.__hmAccurateMapProducts, items=window.__hmAccurateMapItems;
      // Show unmapped products first, then mapped products.
      window.__hmAccurateMapProducts.sort(function(a,b){
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
        const suffix=String(p.hm_grade||'none')+'-'+String(p.hm_color||'none');
        return '<div class="lead" data-hm-accurate-map-card="1" data-mapped="'+(isMapped?'1':'0')+'" data-search="'+esc(search)+'" style="margin-bottom:9px">'+
          '<div style="font-weight:800">'+esc(label)+'</div><div class="small" style="margin:3px 0 8px">Kategori: '+esc(p.category||'-')+' • Stok READY: '+esc(p.hm_ready_stock||0)+' unit</div>'+
          '<div class="small" style="margin-bottom:5px">'+(current?'Barang Accurate saat ini: '+esc(current.no)+' — '+esc(current.name):((p.accurate_item_no||p.accurate_item_id)?'Mapping tersimpan: '+esc(p.accurate_item_no||p.accurate_item_id)+' (tidak ditemukan dalam daftar saat ini)':'Belum dipetakan'))+'</div>'+
          '<label style="display:block;font-weight:700;margin:8px 0 5px">Pilih barang Accurate yang benar</label>'+
          '<select id="hm-accurate-map-'+esc(p.id)+'-'+esc(suffix)+'" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827">'+optionsFor(p)+'</select>'+
          '<div class="row" style="margin-top:8px;align-items:center"><button class="secondary" onclick="window.hmSaveAccurateProductMapping(\''+esc(p.id)+'\',\''+esc(p.hm_grade||'')+'\',\''+esc(p.hm_color||'')+'\')">💾 Simpan Mapping</button><button onclick="window.hmCreateAccuratePhoneMaster(\''+esc(p.id)+'\',\''+esc(p.hm_grade||'')+'\',\''+esc(p.hm_color||'')+'\')">＋ Buat/Pakai Master Otomatis</button><span id="hm-accurate-map-msg-'+esc(p.id)+'-'+esc(suffix)+'" class="small"></span></div>'+
        '</div>';
      }).join('');
      openModal('🧩 Pemetaan Produk Accurate',
        '<div class="box"><b>Mapping stok Plaza (non-Majesty Cell): '+mapped+' / '+products.length+'</b><div class="small">Menampilkan kategori iPhone/Android New dan Second dengan stok READY serta stok SOLD yang memiliki transaksi penjualan FAILED di Majesty Plaza iPhone. Stok titipan/kategori Majesty Cell dikecualikan. Barang Accurate tersedia untuk dipilih: '+items.length+'.</div><div class="small" style="margin-top:6px">Stok pusat dan outlet lain tidak masuk tahap ini. Mapping produk yang tersembunyi tetap tersimpan. Tidak membuat barang baru, tidak mengubah stok, dan tidak mengirim transaksi.</div></div>'+
        '<input id="hm-accurate-map-search" type="search" placeholder="Cari produk, varian, kategori..." oninput="window.hmFilterAccurateMappings(this.value)" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:12px;margin:10px 0">'+
        '<div class="row" style="align-items:center;gap:10px;margin-bottom:8px"><select id="hm-accurate-map-status" onchange="window.hmFilterAccurateMappings()" style="flex:1;min-width:0;padding:11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827"><option value="ALL" selected>Semua produk</option><option value="UNMAPPED">Belum mapping</option><option value="MAPPED">Sudah mapping</option></select><span id="hm-accurate-map-visible-count" class="small">'+(products.length-mapped)+' produk ditampilkan</span></div>'+
        '<div style="max-height:55vh;overflow:auto;padding-right:3px">'+(cards||'<div class="box">Tidak ada produk aktif.</div>')+'</div>');

      // Targeted recovery: automatically create-or-reuse the exact Accurate inventory master
      // for the failed iPhone 14 Pro Max unit, then persist its mapping to matching Plaza stock.
      // ensure_phone_item performs an exact-name duplicate check before creating anything.
      const recoveryTarget=products.find(function(p){
        return String(p.id)==='9a289e16-a5f5-4642-ac77-50281240c63d' &&
          String(p.hm_grade||'')==='B' && String(p.hm_color||'')==='Deep Purple';
      });
      if(recoveryTarget && !(recoveryTarget.accurate_item_id||recoveryTarget.accurate_item_no)){
        await window.hmCreateAccuratePhoneMaster(recoveryTarget.id,recoveryTarget.hm_grade,recoveryTarget.hm_color);
      }

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


  window.hmOpenAccurateSalesQueue=async function(){
    try{
      if(!isFinanceAdmin()) throw new Error('Akses hanya untuk Developer/Management/Finance Admin.');
      openModal('💰 Antrean Sync Penjualan','<div class="box">Memuat antrean penjualan...</div>');
      const [res,itemRes]=await Promise.all([
        sb.from('accurate_sync_records').select('id,local_id,status,attempts,accurate_id,accurate_no,last_error,queued_at,last_attempt_at,synced_at,updated_at,metadata').eq('entity_type','sales_invoice').eq('direction','HM_TO_ACCURATE').order('queued_at',{ascending:false}).limit(100),
        sb.functions.invoke('accurate-sync',{body:{action:'list_items'}})
      ]);
      if(res.error) throw res.error;
      if(itemRes.error) throw itemRes.error;
      const itemData=itemRes.data||{};
      if(!itemData.ok) throw new Error(itemData.error||'Daftar Barang & Jasa Accurate gagal dimuat.');
      const items=Array.isArray(itemData.items)?itemData.items:[];
      window.__hmSalesItems=items;
      // Keep successful sales in the database for audit, but hide them from the active queue.
      const allRows=res.data||[];
      const rows=allRows.filter(x=>normStatus(x.status)!=='SYNCED');
      const ids=rows.map(x=>x.local_id).filter(Boolean);
      const detail={};
      if(ids.length){
        const rpc=await sb.rpc('accurate_sync_monitor_sale_details',{p_ids:ids});
        if(!rpc.error){
          let data=rpc.data;
          if(typeof data==='string'){try{data=JSON.parse(data)}catch(_){data=[]}}
          if(!Array.isArray(data)&&Array.isArray(data?.data))data=data.data;
          if(!Array.isArray(data)&&Array.isArray(data?.rows))data=data.rows;
          if(Array.isArray(data)) data.forEach(x=>{detail[String(x.id)]={product:x.product,outlet:x.outlet,sale_price:x.sale_price,sold_at:x.sold_at,stock_unit_id:x.stock_unit_id,color:x.color,grade:x.grade,battery_health:x.battery_health}});
        }
      }
      const counts=rows.reduce((a,x)=>{const s=normStatus(x.status)||'UNKNOWN';a[s]=(a[s]||0)+1;return a;},{});
      const cards=rows.map(x=>{
        const d=detail[String(x.local_id)]||{};
        const status=normStatus(x.status);
        const reason=x.last_error||syncFailureReason(x);
        const unitId=d.stock_unit_id||'';
        const options='<option value="">— Pilih item Accurate —</option>'+items.map(it=>'<option value="'+esc(it.id)+'"> '+esc(it.no||'-')+' — '+esc(it.name||'-')+'</option>').join('');
        const mapping=status==='FAILED'&&unitId
          ? '<div style="margin-top:10px;padding-top:9px;border-top:1px solid #e2e8f0"><label style="font-weight:700">Mapping Barang Accurate</label><select id="hm-sales-map-'+esc(x.local_id)+'" style="width:100%;padding:10px;margin-top:5px">'+options+'</select><button class="secondary" style="width:100%;margin-top:8px" onclick="window.hmSaveSalesMapping(\''+esc(x.local_id)+'\',\''+esc(unitId)+'\')">🧩 Simpan Mapping</button><div id="hm-sales-map-msg-'+esc(x.local_id)+'" class="small"></div></div>'
          : (status==='FAILED'?'<div class="small" style="margin-top:8px;color:#92400e">Unit stok tidak ditemukan; mapping manual tidak tersedia.</div>':'');
        const retry=status==='FAILED' && !x.accurate_id && !x.accurate_no
          ? '<button class="secondary" id="hm-retry-sale-'+esc(x.local_id)+'" style="width:100%;margin-top:9px" onclick="window.hmRetryAccurateSale(\''+esc(x.local_id)+'\')">🔁 Periksa & Sync Ulang</button><div class="small" style="margin-top:5px">Gunakan setelah mapping tersimpan. Backend tetap memeriksa status dokumen.</div>'
          : (status==='FAILED'?'<div class="small" style="margin-top:8px;color:#92400e">⛔ Referensi dokumen Accurate terdeteksi. Pengiriman ulang ditahan.</div>':'');
        return '<div class="lead" style="margin:10px 0;border:1px solid #cbd5e1;padding:12px;border-radius:12px">'+
          '<div style="font-weight:800;font-size:15px">💰 Penjualan · '+statusBadge(status)+'</div>'+
          '<div style="font-weight:700;margin-top:6px">'+esc(d.product||'Transaksi penjualan')+'</div>'+
          '<div class="small" style="font-weight:700;color:#334155">Identitas unit: '+esc([d.color||null,d.grade?'Grade '+d.grade:null,d.battery_health?'BH '+d.battery_health+'%':null].filter(Boolean).join(' • ')||'Detail unit belum tersedia')+'</div>'+
          '<div class="small">Outlet: '+esc(d.outlet||'-')+' • Nilai: Rp'+financeFmt(d.sale_price)+'</div>'+
          '<div class="small">ID transaksi: '+esc(x.local_id||'-')+'</div>'+
          '<div class="small">ID/No. Accurate: '+esc(x.accurate_id||'-')+' / '+esc(x.accurate_no||'-')+'</div>'+
          '<div class="small">Percobaan: '+Number(x.attempts||0)+' • Diperbarui: '+esc(x.updated_at||'-')+'</div>'+
          (status==='FAILED'?'<div style="color:#991b1b;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere"><b>Alasan:</b> '+esc(reason)+'</div>':'')+
          mapping+retry+'</div>';
      }).join('');
      const summary=['PENDING','PROCESSING','FAILED'].map(s=>'<span style="display:inline-block;margin:3px;padding:7px 9px;background:#eef2f7;border-radius:8px">'+s+': <b>'+Number(counts[s]||0)+'</b></span>').join('');
      openModal('💰 Antrean Sync Penjualan','<div class="box"><b>'+rows.length+' transaksi perlu dipantau / ditindak</b><div style="margin-top:8px">'+summary+'</div><div class="small" style="margin-top:6px">Transaksi SYNCED disembunyikan dari antrean aktif, tetapi riwayatnya tetap tersimpan di database. Pengiriman ulang transaksi FAILED tetap melewati pemeriksaan backend.</div></div>'+
        '<div class="row" style="margin:10px 0"><button class="secondary" onclick="window.hmOpenAccurateSalesQueue()">🔄 Muat Ulang Antrean</button><button class="secondary" onclick="window.hmOpenAccurateProductMapping()">🧩 Periksa Pemetaan Produk</button></div>'+
        (cards||'<div class="box">Belum ada antrean penjualan.</div>'));
    }catch(e){
      console.error('[HM sales queue]',e);
      openModal('💰 Antrean Sync Penjualan','<div class="danger box">'+esc(e?.message||e)+'</div>');
    }
  };

  window.hmSaveSalesMapping=async function(saleId,stockUnitId){
    const msg=document.getElementById('hm-sales-map-msg-'+saleId), select=document.getElementById('hm-sales-map-'+saleId);
    const say=(v,ok)=>{if(msg){msg.textContent=v;msg.style.color=ok?'#15803d':'#b91c1c';}};
    try{
      if(!isFinanceAdmin()) throw new Error('Akses mapping ditolak.');
      if(!select||!select.value) throw new Error('Pilih item Accurate terlebih dahulu.');
      const item=(window.__hmSalesItems||[]).find(x=>String(x.id)===String(select.value));
      if(!item) throw new Error('Item Accurate tidak ditemukan. Muat ulang antrean.');
      say('Menyimpan mapping...',true);
      const saved=await sb.from('stock_units').update({accurate_item_id:String(item.id),accurate_item_no:String(item.no||'')}).eq('id',stockUnitId).select('id').single();
      if(saved.error) throw saved.error;
      say('Mapping tersimpan: '+String(item.no||'-')+' — '+String(item.name||'')+'. Faktur belum dikirim ulang.',true);
    }catch(e){say(e?.message||String(e),false);}
  };

  window.hmOpenAccuratePurchaseQueue=async function(){
    try{
      if(!isFinanceAdmin()) throw new Error('Akses hanya untuk Developer/Management/Finance Admin.');
      openModal('🧾 Antrean Sync Pembelian','<div class="box">Memuat pembelian yang perlu dipetakan...</div>');
      const [stockRes,masterRes,itemRes]=await Promise.all([
        sb.from('stock_units').select('id,product_id,imei_1,imei_2,outlet,supplier,cost,status,accurate_item_id,accurate_item_no,accurate_purchase_sync_status,accurate_purchase_last_error,accurate_purchase_invoice_id,accurate_purchase_invoice_no,product_master!stock_units_product_id_fkey(category,product,variant,color,grade,accurate_item_id,accurate_item_no)').eq('accurate_purchase_sync_status','FAILED').is('accurate_purchase_invoice_id',null).order('received_at',{ascending:false}).limit(100),
        sb.from('product_master').select('id,category,product,variant,accurate_item_id,accurate_item_no').eq('active',true),
        sb.functions.invoke('accurate-sync',{body:{action:'list_items'}})
      ]);
      if(stockRes.error) throw stockRes.error;
      if(masterRes.error) throw masterRes.error;
      if(itemRes.error) throw itemRes.error;
      const units=stockRes.data||[], masters=masterRes.data||[], data=itemRes.data||{};
      if(!data.ok) throw new Error(data.error||'Daftar item Accurate gagal dimuat.');
      const items=Array.isArray(data.items)?data.items:[];
      window.__hmPurchaseQueue=units; window.__hmPurchaseItems=items;
      const cards=units.map(function(u){
        const p=u.product_master||{}, label=[p.product,p.variant,u.color||p.color,u.grade||p.grade?'Grade '+(u.grade||p.grade):null].filter(Boolean).join(' ');
        const current=items.find(x=>(u.accurate_item_id&&String(x.id)===String(u.accurate_item_id))||(u.accurate_item_no&&String(x.no)===String(u.accurate_item_no)));
        const opts='<option value="">— Pilih item Accurate —</option>'+items.map(x=>'<option value="'+esc(x.id)+'"'+(current&&String(current.id)===String(x.id)?' selected':'')+'>'+esc(x.no||'-')+' — '+esc(x.name||'-')+'</option>').join('');
        return '<div class="lead" style="margin:10px 0"><b>'+esc(label||'Produk tidak diketahui')+'</b><div class="small">IMEI: '+esc(u.imei_1||u.imei_2||'-')+' • Supplier: '+esc(u.supplier||'-')+' • Outlet: '+esc(u.outlet||'-')+'</div><div class="small">Modal: Rp'+financeFmt(u.cost)+' • Status stok: '+esc(u.status)+' • '+statusBadge(u.accurate_purchase_sync_status)+'</div><div class="small" style="color:#b91c1c;margin:5px 0">'+esc(u.accurate_purchase_last_error||'Perlu mapping item Accurate')+'</div><label>Mapping master Accurate</label><select id="hm-purchase-map-'+esc(u.id)+'" style="width:100%;padding:10px">'+opts+'</select><div class="row" style="margin-top:8px"><button class="secondary" onclick="window.hmSavePurchaseMapping(\''+esc(u.id)+'\')">Simpan Mapping</button><button onclick="window.hmSyncPurchaseUnit(\''+esc(u.id)+'\')">Sync Pembelian</button></div><div id="hm-purchase-msg-'+esc(u.id)+'" class="small"></div></div>';
      }).join('');
      openModal('🧾 Antrean Sync Pembelian','<div class="box"><b>'+units.length+' pembelian gagal menunggu tindakan</b><div class="small">Mapping yang sudah cocok dapat langsung dipakai. Jika belum cocok, pilih item Accurate yang benar. Jika item belum tersedia, buat master terlebih dahulu melalui Accurate, lalu muat ulang daftar item. Tidak ada master duplikat yang dibuat otomatis.</div></div>'+(cards||'<div class="box">Tidak ada pembelian gagal yang menunggu pemetaan.</div>')+'<button class="secondary" onclick="window.hmOpenAccuratePurchaseQueue()">🔄 Muat Ulang Antrean Pembelian</button>');
      // Auto-sync only when the product master already carries an explicit Accurate
      // mapping and the mapped id + item number both resolve to the same live item.
      // The backend performs its own product validation and duplicate-invoice guard.
      const canonicalName=function(u){
        const p=u.product_master||{}, category=String(p.category||'').toUpperCase();
        const raw=String(p.product||'').trim(), base=raw.replace(/\\s+(NEW|SECOND)\\s*$/i,'').trim();
        const variant=String(p.variant||'').trim(), color=String(u.color||p.color||'').trim();
        const grade=String(u.grade||p.grade||'').replace(/^grade\\s*/i,'').trim();
        if(category==='IPHONE_SECOND' && /^iphone\\s+/i.test(base)) return ['HP Second Iphone',base.replace(/^iphone\\s*/i,''),'SECOND',color,variant,grade?'Grade '+grade:''].filter(Boolean).join(' ').replace(/\\s+/g,' ').trim();
        if(category==='IPHONE_NEW' && /^iphone\\s+/i.test(base)) return ['HP New Iphone',base.replace(/^iphone\\s*/i,''),color,variant.replace(/GB$/i,'')].filter(Boolean).join(' ').replace(/\\s+/g,' ').trim();
        if(category==='ANDROID_SECOND'||category==='ANDROID_NEW') return [category==='ANDROID_NEW'?'HP New':'HP Second',base.replace(/^HP\\s+/i,'').replace(/\\s+(NEW|SECOND)\\s*$/i,''),category==='ANDROID_NEW'?'NEW':'SECOND',variant].filter(Boolean).join(' ').replace(/\\s+/g,' ').trim();
        return '';
      };
      const autoCandidates=units.filter(function(u){
        const p=u.product_master||{};
        const id=String(p.accurate_item_id||u.accurate_item_id||''), no=String(p.accurate_item_no||u.accurate_item_no||'');
        if(!id||!no) return false;
        const byId=items.find(x=>String(x.id)===id), byNo=items.find(x=>String(x.no)===no);
        const expected=canonicalName(u);
        return !!byId && !!byNo && String(byId.id)===String(byNo.id) && !!expected && String(byNo.name||'').replace(/\\s+/g,' ').trim().toLocaleLowerCase('id-ID')===expected.toLocaleLowerCase('id-ID');
      }).slice(0,10);
      for(const u of autoCandidates){
        const p=u.product_master||{}, id=String(p.accurate_item_id||u.accurate_item_id||''), no=String(p.accurate_item_no||u.accurate_item_no||'');
        if(String(u.accurate_item_id||'')!==id || String(u.accurate_item_no||'')!==no){
          const mapped=await sb.from('stock_units').update({accurate_item_id:id,accurate_item_no:no}).eq('id',u.id);
          if(mapped.error) continue;
        }
        const msg=document.getElementById('hm-purchase-msg-'+u.id);
        if(msg) msg.textContent='Nama dan kode master cocok. Menjalankan sync otomatis...';
        try{
          const sync=await sb.functions.invoke('accurate-management-purchase-sync',{body:{stock_unit_id:u.id}});
          if(sync.error){
            let detail='';
            try{const ctx=sync.error.context;const payload=ctx&&typeof ctx.json==='function'?await ctx.json():null;detail=payload?.error||payload?.message||'';}catch(_){}
            throw new Error(detail||sync.error.message||'Permintaan sync ditolak backend.');
          }
          const d=sync.data||{};
          if(!d.ok) throw new Error(d.error||'Sync otomatis belum berhasil.');
          if(msg) msg.textContent=d.already_synced?'Sudah tersinkron sebelumnya.':'Sync otomatis berhasil • Faktur '+String(d.invoice?.number||'-');
        }catch(e){if(msg)msg.textContent='Auto-sync ditahan: '+String(e?.message||e);}
      }
    }catch(e){console.error('[HM purchase queue]',e);openModal('🧾 Antrean Sync Pembelian','<div class="danger box">'+esc(e?.message||e)+'</div>');}
  };
  window.hmSavePurchaseMapping=async function(stockId){
    const msg=document.getElementById('hm-purchase-msg-'+stockId), select=document.getElementById('hm-purchase-map-'+stockId);
    try{
      if(!isFinanceAdmin()) throw new Error('Akses mapping ditolak.');
      if(!select||!select.value) throw new Error('Pilih item Accurate terlebih dahulu.');
      const item=(window.__hmPurchaseItems||[]).find(x=>String(x.id)===String(select.value));
      if(!item) throw new Error('Item Accurate tidak ditemukan.');
      const saved=await sb.from('stock_units').update({accurate_item_id:String(item.id),accurate_item_no:String(item.no||'')}).eq('id',stockId).select('id').single();
      if(saved.error) throw saved.error;
      if(msg) msg.textContent='Mapping tersimpan: '+String(item.no||'-')+' — '+String(item.name||'')+'. Periksa kecocokan master, lalu tekan Sync Pembelian.';
    }catch(e){if(msg)msg.textContent=e?.message||String(e);}
  };
  window.hmSyncPurchaseUnit=async function(stockId){
    const msg=document.getElementById('hm-purchase-msg-'+stockId);
    try{
      if(!isFinanceAdmin()) throw new Error('Akses sync ditolak.');
      const u=(window.__hmPurchaseQueue||[]).find(x=>String(x.id)===String(stockId));
      if(!u) throw new Error('Unit pembelian tidak ditemukan. Muat ulang antrean.');
      const select=document.getElementById('hm-purchase-map-'+stockId);
      if(select&&select.value) await window.hmSavePurchaseMapping(stockId);
      const latest=await sb.from('stock_units').select('accurate_item_id,accurate_item_no').eq('id',stockId).single();
      if(latest.error) throw latest.error;
      if(!latest.data.accurate_item_id&&!latest.data.accurate_item_no) throw new Error('Mapping master belum tersedia.');
      if(msg)msg.textContent='Mengirim faktur pembelian...';
      const result=await sb.functions.invoke('accurate-management-purchase-sync',{body:{stock_unit_id:stockId}});
      if(result.error) throw result.error;
      const d=result.data||{};
      if(!d.ok) throw new Error(d.error||'Sinkronisasi pembelian gagal.');
      if(msg)msg.textContent=d.already_synced?'Faktur sudah tersinkron sebelumnya.':'Berhasil sync • Faktur '+String(d.invoice?.number||'-');
      setTimeout(window.hmOpenAccuratePurchaseQueue,1200);
    }catch(e){console.error('[HM purchase sync]',e);if(msg)msg.textContent=e?.message||String(e);}
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
