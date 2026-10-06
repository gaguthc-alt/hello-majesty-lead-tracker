/* HELLO MAJESTY — Inventory operational modules */
(function(){
  const escx=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>'Rp'+Number(v||0).toLocaleString('id-ID');
  const role=()=>String(window.profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
  function can(){return !!window.profile?.is_management||['DEVELOPER','DEVELOPER APLIKASI','FASILITATOR','ADMIN FINANCE','ADMIN FINANCE MAJESTY CELL'].includes(role());}
  function panel(title,html){
    const p=document.getElementById('hmMenuPanel'),b=document.getElementById('hmMenuPanelBody'),t=document.getElementById('hmMenuPanelTitle');
    if(!p||!b) throw new Error('Panel Menu Utama belum siap.');
    if(t)t.textContent=title;b.innerHTML=html;p.classList.remove('hidden');
    requestAnimationFrame(()=>p.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  async function products(ids){
    const u=[...new Set(ids.filter(Boolean))];
    if(!u.length)return {};
    const r=await sb.from('product_master').select('id,product,variant,category').in('id',u);
    if(r.error)throw r.error;
    return Object.fromEntries((r.data||[]).map(x=>[x.id,x]));
  }
  window.hmOpenInventoryFeature=async function(feature){
    try{
      if(feature==='mutasi')return await openMutasi();
      if(feature==='riwayat')return await openRiwayat();
      if(feature==='penyesuaian')return await openPenyesuaian();
      if(feature==='opname')return await openOpname();
      panel('📦 Inventory','<div class="box">Modul inventory tidak dikenal.</div>');
    }catch(e){
      console.error('[HM] inventory feature',e);
      panel('⚠️ Inventory','<div class="box"><b>Gagal membuka modul.</b><div class="small" style="margin-top:6px">'+escx(e?.message||e)+'</div></div>');
    }
  };

  async function openMutasi(){
    if(!can())return alert('Anda tidak memiliki akses Mutasi Stok.');
    const r=await sb.from('stock_units').select('id,product_id,outlet,color,imei_1,asking_price,battery_health,status').eq('status','READY').order('outlet').order('created_at',{ascending:false});
    if(r.error)throw r.error;
    const pm=await products((r.data||[]).map(x=>x.product_id));
    const outlets=[...new Set((r.data||[]).map(x=>x.outlet).filter(Boolean))];
    const html='<div class="small" style="margin-bottom:10px">Pilih stock READY lalu tentukan outlet tujuan. Mutasi langsung tercatat ke Riwayat Stok.</div>'+
      '<div class="box"><label>Outlet tujuan cepat</label><select id="hmMutasiDefault"><option value="">— pilih saat mutasi —</option>'+outlets.map(o=>'<option>'+escx(o)+'</option>').join('')+'</select></div>'+
      ((r.data||[]).length?(r.data||[]).map((s,i)=>{const p=pm[s.product_id]||{};return '<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+escx(p.product||'Produk')+(p.variant?' — '+escx(p.variant):'')+'</b><div class="small">'+escx(s.outlet||'-')+' • '+escx(s.color||'-')+(s.battery_health!=null?' • BH '+escx(s.battery_health)+'%':'')+' • '+escx(s.imei_1?'IMEI ••••'+String(s.imei_1).slice(-4):'IMEI -')+'</div><div style="margin-top:5px">Harga jual: <b>'+money(s.asking_price)+'</b></div><button class="success" style="margin-top:8px" onclick="hmDoMutasi(\''+s.id+'\')">🔄 Mutasikan</button></div>';}).join(''):'<div class="box"><b>Tidak ada stock READY untuk dimutasi.</b></div>');
    panel('🔄 Mutasi Stok',html);
  }
  window.hmDoMutasi=async function(id){
    const to=document.getElementById('hmMutasiDefault')?.value||prompt('Outlet tujuan:')||'';
    if(!to.trim())return;
    const note=prompt('Catatan mutasi (opsional):')||null;
    const r=await sb.rpc('create_stock_transfer',{p_stock_unit_id:id,p_to_outlet:to.trim(),p_notes:note});
    if(r.error)return alert('Mutasi gagal: '+r.error.message);
    alert('Mutasi berhasil: '+(r.data?.transfer_no||'OK'));
    await openMutasi();
  };

  async function openRiwayat(){
    if(!can())return alert('Anda tidak memiliki akses Riwayat Stok.');
    const r=await sb.from('stock_movements').select('id,stock_unit_id,movement_type,from_status,to_status,actor_user_id,note,created_at').order('created_at',{ascending:false}).limit(100);
    if(r.error)throw r.error;
    const ids=(r.data||[]).map(x=>x.stock_unit_id), us=[...new Set((r.data||[]).map(x=>x.actor_user_id).filter(Boolean))];
    const [pm,users]=await Promise.all([products(await stockProductIds(ids)),loadUsers(us)]);
    const stocks=await loadStocks(ids);
    panel('📋 Riwayat Stok',(r.data||[]).length?(r.data||[]).map((m,i)=>{const s=stocks[m.stock_unit_id]||{},p=pm[s.product_id]||{},u=users[m.actor_user_id]||{};return '<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+escx(p.product||'Produk')+(p.variant?' — '+escx(p.variant):'')+'</b><div class="small">'+new Date(m.created_at).toLocaleString('id-ID')+' • '+escx(m.movement_type||'-')+'</div><div>Status: '+escx(m.from_status||'-')+' → <b>'+escx(m.to_status||'-')+'</b></div><div class="small">Oleh: '+escx(u.name||'-')+(m.note?' • '+escx(m.note):'')+'</div></div>';}).join(''):'<div class="box"><b>Belum ada riwayat pergerakan stok.</b></div>');
  }
  async function stockProductIds(ids){const s=await loadStocks(ids);return Object.values(s).map(x=>x.product_id).filter(Boolean);}
  async function loadStocks(ids){const u=[...new Set(ids.filter(Boolean))];if(!u.length)return {};const r=await sb.from('stock_units').select('id,product_id,outlet,color,imei_1,status').in('id',u);if(r.error)throw r.error;return Object.fromEntries((r.data||[]).map(x=>[x.id,x]));}
  async function loadUsers(ids){if(!ids.length)return {};const r=await sb.from('team_profiles').select('user_id,name,role').in('user_id',ids);if(r.error)return {};return Object.fromEntries((r.data||[]).map(x=>[x.user_id,x]));}

  async function openPenyesuaian(){
    if(!can())return alert('Anda tidak memiliki akses Penyesuaian Stok.');
    const r=await sb.from('stock_units').select('id,product_id,outlet,color,imei_1,status,battery_health').neq('status','SOLD').order('outlet').order('updated_at',{ascending:false}).limit(150);
    if(r.error)throw r.error;
    const pm=await products((r.data||[]).map(x=>x.product_id));
    panel('⚠️ Penyesuaian Stok',(r.data||[]).length?(r.data||[]).map((s,i)=>{const p=pm[s.product_id]||{};return '<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+escx(p.product||'Produk')+(p.variant?' — '+escx(p.variant):'')+'</b><div class="small">'+escx(s.outlet||'-')+' • '+escx(s.color||'-')+' • Status: <b>'+escx(s.status)+'</b></div><div class="row" style="margin-top:8px"><select id="hmAdjStatus-'+s.id+'" style="flex:1;min-width:180px"><option value="READY">READY</option><option value="RESERVED">RESERVED</option><option value="SERVICE">SERVICE</option><option value="RETURN">RETURN</option><option value="MISSING">MISSING</option><option value="REJECTED">REJECTED</option></select><button class="success" onclick="hmApplyAdjustment(\''+s.id+'\')">Simpan Penyesuaian</button></div></div>';}).join(''):'<div class="box"><b>Tidak ada stock yang bisa disesuaikan.</b></div>');
  }
  window.hmApplyAdjustment=async function(id){
    const status=document.getElementById('hmAdjStatus-'+id)?.value;
    const note=prompt('Alasan penyesuaian stok (wajib):')||'';
    if(!note.trim())return;
    const r=await sb.rpc('adjust_stock_unit',{p_stock_unit_id:id,p_new_status:status,p_note:note.trim()});
    if(r.error)return alert('Penyesuaian gagal: '+r.error.message);
    alert('Penyesuaian stok berhasil disimpan.');
    await openPenyesuaian();
  };

  async function openOpname(){
    if(!can())return alert('Anda tidak memiliki akses Stock Opname.');
    const outlets=await getOutlets();
    const open=await sb.from('stock_opnames').select('id,opname_no,outlet,status,notes,created_at').in('status',['OPEN','IN_PROGRESS']).order('created_at',{ascending:false}).limit(10);
    if(open.error)throw open.error;
    let html='<div class="box"><b>Buat Stock Opname Baru</b><label>Outlet</label><select id="hmOpOutlet"><option value="">— pilih outlet —</option>'+outlets.map(o=>'<option>'+escx(o)+'</option>').join('')+'</select><label>Catatan</label><input id="hmOpNote" placeholder="Opsional"><button class="success" style="margin-top:8px" onclick="hmCreateOpname()">＋ Buat Opname</button></div>';
    html+=(open.data||[]).map(x=>'<div class="lead"><div class="row" style="justify-content:space-between"><b>🔎 '+escx(x.opname_no)+'</b><span class="badge">'+escx(x.status)+'</span></div><div class="small">'+escx(x.outlet)+' • '+new Date(x.created_at).toLocaleString('id-ID')+'</div><button class="secondary" style="margin-top:8px" onclick="hmOpenOpname(\''+x.id+'\')">Buka Opname</button></div>').join('');
    panel('🔎 Stock Opname',html||'<div class="box">Belum ada opname.</div>');
  }
  async function getOutlets(){const r=await sb.from('stock_units').select('outlet').not('outlet','is',null);if(r.error)throw r.error;return [...new Set((r.data||[]).map(x=>String(x.outlet||'').trim()).filter(Boolean))].sort();}
  window.hmCreateOpname=async function(){
    const outlet=document.getElementById('hmOpOutlet')?.value||'',note=document.getElementById('hmOpNote')?.value||null;
    if(!outlet)return alert('Pilih outlet terlebih dahulu.');
    const r=await sb.rpc('create_stock_opname',{p_outlet:outlet,p_notes:note});
    if(r.error)return alert('Gagal membuat Stock Opname: '+r.error.message);
    alert('Stock Opname dibuat: '+(r.data?.opname_no||'OK'));
    await hmOpenOpname(r.data?.opname_id);
  };
  window.hmOpenOpname=async function(id){
    const r=await sb.from('stock_opnames').select('id,opname_no,outlet,status,notes,created_at').eq('id',id).single();
    if(r.error)throw r.error;
    const it=await sb.from('stock_opname_items').select('stock_unit_id,system_status,counted_present,counted_status,notes').eq('opname_id',id).order('created_at');
    if(it.error)throw it.error;
    const ids=(it.data||[]).map(x=>x.stock_unit_id),stocks=await loadStocks(ids),pm=await products(Object.values(stocks).map(x=>x.product_id));
    const done=(it.data||[]).filter(x=>x.counted_present!==null).length;
    const html='<div class="box"><b>'+escx(r.data.opname_no)+'</b><div class="small">'+escx(r.data.outlet)+' • '+done+'/'+(it.data||[]).length+' item diperiksa</div>'+(r.data.status==='POSTED'?'<div style="margin-top:8px">🟢 Sudah diposting.</div>':'<button class="success" style="margin-top:8px" onclick="hmPostOpname(\''+id+'\')">✓ POST Stock Opname</button>')+'</div>'+
      ((it.data||[]).map((x,i)=>{const s=stocks[x.stock_unit_id]||{},p=pm[s.product_id]||{};return '<div class="lead"><b>'+String(i+1).padStart(2,'0')+'. '+escx(p.product||'Produk')+(p.variant?' — '+escx(p.variant):'')+'</b><div class="small">'+escx(s.color||'-')+' • Sistem: <b>'+escx(x.system_status)+'</b></div><div class="row" style="margin-top:8px"><button class="success" onclick="hmCountOpname(\''+id+'\',\''+x.stock_unit_id+'\',true)">✓ Barang Ada</button><button class="danger" onclick="hmCountOpname(\''+id+'\',\''+x.stock_unit_id+'\',false)">✕ Tidak Ada</button></div><div class="small" style="margin-top:5px">Hasil: '+(x.counted_present?'ADA':'BELUM DIHITUNG')+'</div></div>';}).join('')||'<div class="box">Tidak ada stock untuk outlet ini.</div>');
    panel('🔎 '+r.data.opname_no,html);
  };
  window.hmCountOpname=async function(opnameId,stockId,present){
    const note=present?null:(prompt('Catatan barang tidak ditemukan:')||'');
    const r=await sb.rpc('record_stock_opname_count',{p_opname_id:opnameId,p_stock_unit_id:stockId,p_counted_present:present,p_counted_status:null,p_note:note||null});
    if(r.error)return alert('Gagal menyimpan hitungan: '+r.error.message);
    await hmOpenOpname(opnameId);
  };
  window.hmPostOpname=async function(id){
    if(!confirm('POST Stock Opname? Setelah diposting, hasil akan menjadi penyesuaian stok.'))return;
    const r=await sb.rpc('post_stock_opname',{p_opname_id:id,p_actor_user_id:window.profile?.user_id||null});
    if(r.error)return alert('POST Stock Opname gagal: '+r.error.message);
    alert('Stock Opname berhasil diposting. Penyesuaian: '+Number(r.data?.adjusted||0)+' unit.');
    await hmOpenOpname(id);
  };
})();