(function(){
function cpFmt(n){return Number(n||0).toLocaleString('id-ID')}
function cpEsc(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function cpPeriod(mode){
 const now=new Date(),y=now.getFullYear(),m=now.getMonth();
 if(mode==='today')return {start:new Date(y,m,now.getDate()),end:new Date(y,m,now.getDate()+1),label:'HARI INI'};
 if(mode==='last_month')return {start:new Date(y,m-1,1),end:new Date(y,m,1),label:'BULAN KEMARIN'};
 return {start:new Date(y,m,1),end:new Date(y,m+1,1),label:'BULAN INI'};
}
window.renderContentPerformance=async function(){
 const node=document.getElementById('contentPerformance');
 if(!node)throw new Error('Panel Pencapaian Content Creator tidak ditemukan.');
 node.innerHTML='<h3 style="margin-top:0">🎬 PENCAPAIAN CONTENT CREATOR</h3><div class="small" style="margin-bottom:12px">Jumlah lead yang berhasil dihadirkan setiap Content Creator, dikelompokkan berdasarkan platform dan kampanye. Hanya sumber yang tercatat di sistem yang ditampilkan.</div><div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="secondary" type="button" data-cp-mode="today">Hari Ini</button><button class="secondary" type="button" data-cp-mode="month">Bulan Ini</button><button class="secondary" type="button" data-cp-mode="last_month">Bulan Kemarin</button></div><div id="cpBody"><div class="small">⏳ Memuat...</div></div>';
 const load=async mode=>{
  const body=document.getElementById('cpBody');if(!body)return;
  body.innerHTML='<div class="small">⏳ Memuat pencapaian...</div>';
  try{
   const p=cpPeriod(mode);
   const q=await sb.from('leads').select('lead_id,content_creator,source_platform,source_campaign,source_confidence,created_at').gte('created_at',p.start.toISOString()).lt('created_at',p.end.toISOString()).is('archived_at',null);
   if(q.error)throw q.error;
   const rows=q.data||[],groups={};
   rows.forEach(r=>{
    const creator=String(r.content_creator||'—').trim()||'—';
    const tracked=String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK';
    const platform=tracked?(String(r.source_platform||'').trim().toUpperCase()||'LINK CONTENT CREATOR'):'WHATSAPP';
    const campaign=tracked?(String(r.source_campaign||'').trim()||'Tanpa kampanye'):'Tidak diketahui';
    const key=[creator,platform,campaign].join('|');
    if(!groups[key])groups[key]={creator,platform,campaign,leads:0};
    groups[key].leads++;
   });
   const list=Object.values(groups).sort((a,b)=>b.leads-a.leads||a.creator.localeCompare(b.creator,'id'));
   const creators={};list.forEach(x=>creators[x.creator]=(creators[x.creator]||0)+x.leads);
   const creatorCount=Object.keys(creators).filter(x=>x!=='—').length;
   const total=rows.length;
   body.innerHTML='<div class="stats"><div class="stat"><div class="small">Total Lead</div><div class="num">'+cpFmt(total)+'</div></div><div class="stat"><div class="small">Content Creator</div><div class="num">'+cpFmt(creatorCount)+'</div></div><div class="stat"><div class="small">Lead dari Link Terlacak</div><div class="num">'+cpFmt(rows.filter(r=>String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK').length)+'</div></div><div class="stat"><div class="small">Lead WhatsApp / Belum Teratribusi</div><div class="num">'+cpFmt(rows.filter(r=>String(r.source_confidence||'').toUpperCase()!=='TRACKED_LINK').length)+'</div></div></div><div class="small" style="margin:12px 0">Periode: <b>'+p.label+'</b> · dihitung dari lead yang dibuat pada periode tersebut.</div>'+
   (list.length?list.map(x=>'<div class="lead" style="margin-top:10px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b style="font-size:16px">🎬 '+cpEsc(x.creator)+'</b><span class="badge">'+cpFmt(x.leads)+' lead</span></div><div style="margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><div><div class="small">Sumber / Platform</div><b>'+cpEsc(x.platform)+'</b></div><div><div class="small">Kampanye</div><b>'+cpEsc(x.campaign)+'</b></div></div></div>').join(''):'<div class="small">Belum ada lead pada periode ini.</div>');
  }catch(e){body.innerHTML='<div style="color:#b42318">Gagal memuat pencapaian: '+cpEsc(e?.message||e)+'</div>'}
 };
 node.querySelectorAll('[data-cp-mode]').forEach(b=>b.onclick=()=>load(b.getAttribute('data-cp-mode')||'month'));
 await load('month');
};
})();