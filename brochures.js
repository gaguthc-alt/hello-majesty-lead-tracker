/* HELLO MAJESTY — Brand Brochure Library */
let hmBrochures=[];
const HM_BROCHURE_BRANDS=['Samsung','Infinix','Apple','Xiaomi','OPPO','vivo','realme','TECNO','itel','HONOR','Huawei','ASUS','Lenovo','Nokia','POCO','Redmi'];

function hmBrochureCanManage(){
  return !!profile?.is_management || !!window.hmCanFacilitator || String(profile?.role||'').toUpperCase()==='FASILITATOR';
}
function hmBrochureSlug(v){
  return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'lainnya';
}
function hmBrochureUrl(path){
  return sb.storage.from('brochures').getPublicUrl(path).data.publicUrl;
}
async function loadBrochures(){
  const r=await sb.from('brochures').select('*').eq('active',true).order('brand').order('created_at',{ascending:false});
  if(r.error)throw r.error;
  hmBrochures=r.data||[];
}
function hmBrochureBrands(){
  const all=[...HM_BROCHURE_BRANDS,...hmBrochures.map(x=>x.brand||'')].filter(Boolean);
  return [...new Map(all.map(x=>[String(x).trim().toLowerCase(),String(x).trim()])).values()].sort((a,b)=>a.localeCompare(b,'id'));
}
async function openBrochures(){
  try{await loadBrochures();}catch(e){return alert('Brosur gagal dimuat: '+(e?.message||e));}
  $('mt').textContent='📖 BROSUR';
  $('mb').innerHTML=
    '<div class="small" style="margin-bottom:10px">Pilih merk untuk melihat brosur yang tersedia.</div>'+
    '<div id="brochureBrandMenu" class="row">'+hmBrochureBrands().map(b=>'<button class="secondary" type="button" onclick="showBrochureBrand(\''+esc(b).replace(/'/g,"\\'")+'\')">📱 '+esc(b)+'</button>').join('')+'</div>'+
    '<div id="brochureBrandBody" style="margin-top:14px"><div class="small">Pilih salah satu merk.</div></div>';
  $('modal').classList.remove('hidden');
}
function showBrochureBrand(brand){
  const rows=hmBrochures.filter(x=>String(x.brand||'').trim().toLowerCase()===String(brand||'').trim().toLowerCase());
  const can=hmBrochureCanManage();
  const body=$('brochureBrandBody');if(!body)return;
  body.innerHTML=
    '<div class="row" style="justify-content:space-between;align-items:center"><div><h3 style="margin:0">📱 '+esc(brand)+'</h3><div class="small">'+rows.length+' brosur</div></div>'+
    (can?'<button class="success" type="button" onclick="openBrochureUpload(\''+esc(brand).replace(/'/g,"\\'")+'\')">＋ Upload Brosur</button>':'')+
    '</div>'+
    (rows.length?rows.map(brochureCard).join(''):'<div class="box"><div class="small">Belum ada brosur untuk merk ini.</div>'+(can?'<button class="secondary" style="margin-top:8px" type="button" onclick="openBrochureUpload(\''+esc(brand).replace(/'/g,"\\'")+'\')">＋ Tambah Brosur</button>':'')+'</div>');
}
function brochureCard(b){
  const url=hmBrochureUrl(b.storage_path),can=hmBrochureCanManage();
  return '<div class="lead">'+
    '<div class="row" style="justify-content:space-between;align-items:center"><b>'+esc(b.title||b.brand||'Brosur')+'</b><span class="badge">'+esc(b.brand||'-')+'</span></div>'+
    '<img src="'+esc(url)+'" alt="'+esc(b.title||'Brosur')+'" style="width:100%;max-height:520px;object-fit:contain;border:1px solid #ddd;border-radius:10px;margin-top:8px;background:#f8f8f8">'+
    '<div class="row" style="margin-top:8px">'+
      '<a class="secondary" style="display:inline-block;text-decoration:none;padding:10px;border-radius:8px;color:#111" href="'+esc(url)+'" target="_blank" rel="noopener">⬇️ Download</a>'+
      '<button class="success" type="button" onclick="shareBrochure(\''+esc(b.id).replace(/'/g,"\\'")+'\')">📲 Kirim ke WA</button>'+
      (can?'<button class="danger" type="button" onclick="deleteBrochure(\''+esc(b.id).replace(/'/g,"\\'")+'\')">🗑️ Hapus</button>':'')+
    '</div></div>';
}
function openBrochureUpload(defaultBrand){
  if(!hmBrochureCanManage())return alert('Hanya Management atau Facilitator yang dapat upload brosur.');
  $('mt').textContent='＋ Upload Brosur';
  $('mb').innerHTML=
    '<label>Merk</label><input id="brochureBrand" value="'+esc(defaultBrand||'')+'" placeholder="Contoh: Samsung">'+
    '<label>Judul Brosur</label><input id="brochureTitle" placeholder="Contoh: Samsung Oktober 2026">'+
    '<label>Foto Brosur</label><input id="brochureFile" type="file" accept="image/jpeg,image/png,image/webp">'+
    '<div class="small" style="margin-top:6px">Format JPG, PNG atau WebP • maksimal 8 MB.</div>'+
    '<button class="success" style="margin-top:12px" type="button" onclick="saveBrochure()">Upload Brosur</button>';
  $('modal').classList.remove('hidden');
}
async function saveBrochure(){
  if(!hmBrochureCanManage())return alert('Hanya Management atau Facilitator yang dapat upload brosur.');
  const brand=String($('brochureBrand')?.value||'').trim();
  const title=String($('brochureTitle')?.value||'').trim();
  const file=$('brochureFile')?.files?.[0];
  if(!brand)return alert('Merk wajib diisi.');
  if(!file)return alert('Foto brosur wajib dipilih.');
  if(!['image/jpeg','image/png','image/webp'].includes(String(file.type||'').toLowerCase()))return alert('Foto harus JPG, PNG atau WebP.');
  if(file.size>8*1024*1024)return alert('Foto brosur maksimal 8 MB.');
  const ext=String(file.type).split('/')[1].replace('jpeg','jpg');
  const id=crypto.randomUUID();
  const path=hmBrochureSlug(brand)+'/'+id+'.'+ext;
  const up=await sb.storage.from('brochures').upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
  if(up.error)return alert('Upload foto gagal: '+up.error.message);
  const ins=await sb.from('brochures').insert({brand,title:title||null,storage_path:path,created_by:profile.user_id});
  if(ins.error){
    await sb.storage.from('brochures').remove([path]);
    return alert('Data brosur gagal disimpan: '+ins.error.message);
  }
  await loadBrochures();
  showBrochureBrand(brand);
}
async function shareBrochure(id){
  const b=hmBrochures.find(x=>x.id===id);if(!b)return;
  const url=hmBrochureUrl(b.storage_path);
  const text='📖 Brosur '+(b.brand||'')+(b.title?' — '+b.title:'')+'\n\nHello Majesty';
  try{
    const r=await fetch(url);
    if(r.ok){
      const blob=await r.blob();
      const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
      const file=new File([blob],'brosur-'+hmBrochureSlug(b.brand)+'.'+ext,{type:blob.type||'image/jpeg'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({text,files:[file]});return;
      }
    }
  }catch(e){if(e?.name==='AbortError')return;}
  const wa='https://wa.me/?text='+encodeURIComponent(text+'\n'+url);
  window.open(wa,'_blank');
}
async function deleteBrochure(id){
  if(!hmBrochureCanManage())return alert('Hanya Management atau Facilitator yang dapat menghapus brosur.');
  const b=hmBrochures.find(x=>x.id===id);if(!b)return;
  if(!confirm('Hapus brosur '+(b.title||b.brand)+'?'))return;
  const rm=await sb.storage.from('brochures').remove([b.storage_path]);
  if(rm.error)return alert('Foto gagal dihapus: '+rm.error.message);
  const db=await sb.from('brochures').delete().eq('id',id);
  if(db.error)return alert('Data brosur gagal dihapus: '+db.error.message);
  await loadBrochures();
  showBrochureBrand(b.brand);
}
window.openBrochures=openBrochures;
window.showBrochureBrand=showBrochureBrand;
window.openBrochureUpload=openBrochureUpload;
window.saveBrochure=saveBrochure;
window.shareBrochure=shareBrochure;
window.deleteBrochure=deleteBrochure;
