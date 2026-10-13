/* HELLO MAJESTY — Accurate Sync Monitor */
(function(){
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
  function statusBadge(s){
    const x=String(s||'').toUpperCase();
    const map={SYNCED:['🟢','Sinkron'],PENDING:['🟡','Menunggu'],PROCESSING:['🔵','Diproses'],FAILED:['🔴','Gagal'],CONFLICT:['🟠','Konflik'],CANCELLED:['⚪','Dibatalkan']};
    const m=map[x]||['⚪',x||'Tidak diketahui'];
    return '<span class="badge">'+m[0]+' '+m[1]+'</span>';
  }
  async function load(){
    if(!isFinanceAdmin()) return;
    const [q,r,c]=await Promise.all([
      sb.from('accurate_sync_queue').select('*').order('updated_at',{ascending:false}).limit(30),
      sb.from('accurate_sync_records').select('*').order('updated_at',{ascending:false}).limit(30),
      sb.from('accurate_sync_conflicts').select('*').eq('status','OPEN').order('detected_at',{ascending:false}).limit(30)
    ]);
    if(q.error) throw q.error; if(r.error) throw r.error; if(c.error) throw c.error;
    const queue=q.data||[], records=r.data||[], conflicts=c.data||[];
    const failed=queue.filter(x=>x.status==='FAILED').length+records.filter(x=>x.status==='FAILED').length;
    const pending=queue.filter(x=>['PENDING','PROCESSING'].includes(x.status)).length+records.filter(x=>['PENDING','PROCESSING'].includes(x.status)).length;
    const synced=queue.filter(x=>x.status==='SYNCED').length+records.filter(x=>x.status==='SYNCED').length;
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
      '<div class="row" style="margin-top:10px"><button class="secondary" onclick="window.hmOpenAccurateSyncMonitor()">🔄 Periksa Lagi</button><button class="secondary" onclick="window.hmCheckAccurateItems()">📦 Cek Barang Accurate</button><button class="secondary" onclick="window.hmDiagnoseAccurateItems()">🧪 Diagnosa Daftar</button><button class="secondary" onclick="window.hmOpenAccurateProductMapping()">🧩 Pemetaan Produk</button></div>'+
      '<h3 style="margin-top:16px">⚠️ Data yang perlu ditindak</h3>'+
      (conflicts.length?conflicts.map(x=>'<div class="lead"><b>🟠 Konflik '+esc(x.entity_type)+'</b><div class="small">'+esc(x.reason)+'</div><div class="row" style="margin-top:7px"><span>'+esc(x.local_id||'-')+'</span><span>'+esc(x.accurate_no||x.accurate_id||'-')+'</span></div></div>').join(''):'')+
      (queue.filter(x=>x.status!=='SYNCED').map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>Penjualan</b>'+statusBadge(x.status)+'</div><div class="small">ID: '+esc(x.sale_id)+'</div><div class="small" style="margin-top:4px">'+esc(x.last_error||'Menunggu sinkronisasi')+'</div></div>').join('')||'')+
      (records.filter(x=>x.status!=='SYNCED').map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc(x.entity_type)+'</b>'+statusBadge(x.status)+'</div><div class="small">'+esc(x.direction)+' • '+esc(x.local_id||x.accurate_no||x.accurate_id||'-')+'</div><div class="small" style="margin-top:4px">'+esc(x.last_error||'Menunggu sinkronisasi')+'</div></div>').join('')||'')+
      (!conflicts.length&&!queue.some(x=>x.status!=='SYNCED')&&!records.some(x=>x.status!=='SYNCED')?'<div class="box"><b>🟢 Tidak ada data bermasalah.</b><div class="small">Sistem akan menampilkan masalah di sini jika terjadi kegagalan, keterlambatan, atau konflik.</div></div>':'')+
      '<div class="small" style="margin-top:10px">Catatan: konflik tidak ditimpa otomatis. Management menentukan sumber data yang benar.</div>'
    );
  }
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
          return '<div class="lead"><b>'+esc(x.mode)+' • HTTP '+esc(x.httpStatus)+'</b>'+
            '<div class="small">Berhasil: '+esc(x.success)+' • Total baris: '+esc(pg.rowCount??'tidak tersedia')+' • Halaman: '+esc(pg.pageCount??'tidak tersedia')+' • Ukuran halaman: '+esc(pg.pageSize??'tidak tersedia')+'</div>'+
            (x.error?'<div class="small" style="color:#b91c1c">'+esc(x.error)+'</div>':'')+
            '<div style="margin-top:6px">'+(sample.map(function(i){return '<div class="small">'+esc(i.no||'-')+' — '+esc(i.name||'-')+' • tipe '+esc(i.itemType||'-')+' • ID '+esc(i.id||'-')+'</div>';}).join('')||'<div class="small">Tidak ada sampel.</div>')+'</div></div>';
        }).join('')+
        '<div class="small" style="margin-top:8px">Kirim screenshot hasil ini untuk menentukan filter dan pagination yang tepat.</div>');
    }catch(e){
      openModal('🧪 Diagnosa Daftar Accurate','<div class="danger box">Gagal: '+esc(e?.message||e)+'</div>');
    }
  };
  window.__hmAccurateMapItems = [];
  window.__hmAccurateMapProducts = [];
  window.hmFilterAccurateMappings = function(value){
    const q=String(value||'').trim().toLowerCase();
    document.querySelectorAll('[data-hm-accurate-map-card]').forEach(function(card){
      card.style.display=(!q||String(card.getAttribute('data-search')||'').includes(q))?'':'none';
    });
  };
  window.hmOpenAccurateProductMapping=async function(){
    try{
      if(!isFinanceAdmin()) throw new Error('Pemetaan hanya untuk Developer/Management.');
      openModal('🧩 Pemetaan Produk Accurate','<div class="box"><b>⏳ Memuat produk Hello Majesty dan barang Accurate...</b><div class="small">Belum ada data yang diubah.</div></div>');
      const results=await Promise.all([
        sb.from('product_master').select('id,category,product,variant,grade,accurate_item_id,accurate_item_no').eq('active',true).order('category').order('product'),
        sb.functions.invoke('accurate-sync',{body:{action:'list_items'}})
      ]);
      if(results[0].error) throw results[0].error;
      if(results[1].error) throw results[1].error;
      const data=results[1].data||{};
      if(!data.ok) throw new Error(data.error||'Daftar barang Accurate gagal dimuat.');
      window.__hmAccurateMapProducts=results[0].data||[];
      window.__hmAccurateMapItems=Array.isArray(data.items)?data.items:[];
      const products=window.__hmAccurateMapProducts, items=window.__hmAccurateMapItems;
      const mapped=products.filter(p=>p.accurate_item_id||p.accurate_item_no).length;
      const options='<option value="">— Pilih barang Accurate —</option>'+items.map(function(x){
        return '<option value="'+esc(x.id)+'">'+esc(x.no||'(tanpa nomor)')+' — '+esc(x.name||'(tanpa nama)')+' • '+esc(x.category||'Tanpa kategori')+' [ID '+esc(x.id)+']</option>';
      }).join('');
      const cards=products.map(function(p){
        const current=items.find(function(x){return (p.accurate_item_id&&String(x.id)===String(p.accurate_item_id))||(p.accurate_item_no&&String(x.no)===String(p.accurate_item_no));});
        const label=[p.product,p.variant,p.grade?'Grade '+p.grade:null].filter(Boolean).join(' • ');
        const search=[p.category,p.product,p.variant,p.grade,p.accurate_item_no,current&&current.name,current&&current.category].filter(Boolean).join(' ').toLowerCase();
        return '<div class="lead" data-hm-accurate-map-card="1" data-search="'+esc(search)+'" style="margin-bottom:9px">'+
          '<div style="font-weight:800">'+esc(label)+'</div><div class="small" style="margin:3px 0 8px">Kategori: '+esc(p.category||'-')+'</div>'+
          '<div class="small" style="margin-bottom:5px">'+(current?'Terpetakan saat ini: '+esc(current.no)+' — '+esc(current.name):((p.accurate_item_no||p.accurate_item_id)?'Mapping tersimpan: '+esc(p.accurate_item_no||p.accurate_item_id)+' (tidak ditemukan dalam daftar saat ini)':'Belum dipetakan'))+'</div>'+
          '<select id="hm-accurate-map-'+esc(p.id)+'" style="width:100%;min-height:42px;padding:8px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827">'+
            options.replace('value="'+esc(current?current.id:'')+'"','value="'+esc(current?current.id:'')+'" selected')+
          '</select>'+
          '<div class="row" style="margin-top:8px;align-items:center"><button class="secondary" onclick="window.hmSaveAccurateProductMapping(\''+esc(p.id)+'\')">💾 Simpan Mapping</button><span id="hm-accurate-map-msg-'+esc(p.id)+'" class="small"></span></div>'+
        '</div>';
      }).join('');
      openModal('🧩 Pemetaan Produk Accurate',
        '<div class="box"><b>Mapping produk: '+mapped+' / '+products.length+'</b><div class="small">Barang Accurate tersedia: '+items.length+'. Pilih barang yang benar untuk setiap produk, lalu simpan per baris.</div><div class="small" style="margin-top:6px">Tidak membuat barang baru dan tidak mengirim transaksi.</div></div>'+
        '<input type="search" placeholder="Cari produk, varian, kategori..." oninput="window.hmFilterAccurateMappings(this.value)" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:12px;margin:10px 0">'+
        '<div style="max-height:55vh;overflow:auto;padding-right:3px">'+(cards||'<div class="box">Tidak ada produk aktif.</div>')+'</div>');
    }catch(e){
      console.error('[HM Accurate mapping]',e);
      openModal('🧩 Pemetaan Produk Accurate','<div class="danger box"><b>Gagal membuka pemetaan</b><div style="margin-top:6px">'+esc(e?.message||e)+'</div></div>');
    }
  };
  window.hmSaveAccurateProductMapping=async function(productId){
    const msg=document.getElementById('hm-accurate-map-msg-'+productId);
    const select=document.getElementById('hm-accurate-map-'+productId);
    const say=function(t,ok){if(msg){msg.textContent=t;msg.style.color=ok?'#15803d':'#b91c1c';}};
    try{
      if(!isFinanceAdmin()) throw new Error('Akses pemetaan ditolak.');
      if(!select||!select.value){say('Pilih barang Accurate dulu.',false);return;}
      const item=window.__hmAccurateMapItems.find(function(x){return String(x.id)===String(select.value);});
      const product=window.__hmAccurateMapProducts.find(function(x){return String(x.id)===String(productId);});
      if(!item||!product) throw new Error('Produk atau barang Accurate tidak ditemukan. Buka ulang pemetaan.');
      say('Menyimpan...',true);
      const result=await sb.from('product_master').update({
        accurate_item_id:String(item.id),
        accurate_item_no:String(item.no||'')
      }).eq('id',productId).select('id,accurate_item_id,accurate_item_no');
      if(result.error) throw result.error;
      if(!result.data||!result.data.length) throw new Error('Tidak ada baris yang tersimpan. Periksa izin Management pada product_master.');
      product.accurate_item_id=String(item.id);
      product.accurate_item_no=String(item.no||'');
      say('Tersimpan: '+String(item.no||'-')+' ✓',true);
      const total=window.__hmAccurateMapProducts.length;
      const mapped=window.__hmAccurateMapProducts.filter(function(p){return p.accurate_item_id||p.accurate_item_no;}).length;
      const first=document.querySelector('#mb .box b');
      if(first&&first.textContent.indexOf('Mapping produk:')===0) first.textContent='Mapping produk: '+mapped+' / '+total;
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
