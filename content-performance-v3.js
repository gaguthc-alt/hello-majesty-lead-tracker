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
   const rows=q.data||{};
   const teamQ=await sb.from('team_profiles').select('name').eq('active',true).ilike('role','%CONTENT CREATOR%');
   if(teamQ.error)throw teamQ.error;
   const activeCreators=[...new Set((teamQ.data||[]).map(x=>String(x.name||'').trim()).filter(Boolean))];
   const groups={};
   rows.forEach(r=>{
    const tracked=String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK';
    const creator=tracked?(String(r.content_creator||'').trim()||'—'):'—';
    const platform=tracked?(String(r.source_platform||'').trim().toUpperCase()||'LINK CONTENT CREATOR'):'WHATSAPP';
    const campaign=tracked?(String(r.source_campaign||'').trim()||'Tanpa kampanye'):'Tidak diketahui';
    const key=[creator,platform,campaign].join('|');
    if(!groups[key])groups[key]={creator,platform,campaign,leads:0};
    groups[key].leads++;
   });
   activeCreators.forEach(name=>{
    if(!Object.values(groups).some(x=>x.creator.toLocaleLowerCase('id')===name.toLocaleLowerCase('id'))){
     const key=[name,'—','—'].join('|');
     groups[key]={creator:name,platform:'—',campaign:'—',leads:0};
    }
   });
   const manualLeadOverrides={'Aca':7};
   Object.entries(manualLeadOverrides).forEach(([name,count])=>{
    const existing=Object.values(groups).find(x=>x.creator.toLocaleLowerCase('id')===name.toLocaleLowerCase('id'));
    if(existing){existing.leads=count;existing.platform='INPUT MANUAL';existing.campaign='Penyesuaian manual';existing.manual=true;}
    else groups[[name,'INPUT MANUAL','Penyesuaian manual'].join('|')]={creator:name,platform:'INPUT MANUAL',campaign:'Penyesuaian manual',leads:count,manual:true};
   });
   const list=Object.values(groups).sort((a,b)=>b.leads-a.leads||a.creator.localeCompare(b.creator,'id'));
   const creatorCount=activeCreators.length;
   const total=rows.length;
   body.innerHTML='<div class="stats"><div class="stat"><div class="small">Total Lead</div><div class="num">'+cpFmt(total)+'</div></div><div class="stat"><div class="small">Content Creator</div><div class="num">'+cpFmt(creatorCount)+'</div></div><div class="stat"><div class="small">Lead dari Link Terlacak</div><div class="num">'+cpFmt(rows.filter(r=>String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK').length)+'</div></div><div class="stat"><div class="small">Lead WhatsApp / Belum Teratribusi</div><div class="num">'+cpFmt(rows.filter(r=>String(r.source_confidence||'').toUpperCase()!=='TRACKED_LINK').length)+'</div></div></div><div class="small" style="margin:12px 0">Periode: <b>'+p.label+'</b> · dihitung dari lead yang dibuat pada periode tersebut.</div>'+
   (list.length?list.map(x=>'<div class="lead" style="margin-top:10px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b style="font-size:16px">🎬 '+cpEsc(x.creator)+'</b><span class="badge">'+cpFmt(x.leads)+' lead'+(x.manual?' · INPUT MANUAL':'')+'</span></div><div style="margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><div><div class="small">Sumber / Platform</div><b>'+cpEsc(x.platform)+'</b></div><div><div class="small">Kampanye</div><b>'+cpEsc(x.campaign)+'</b></div></div></div>').join(''):'<div class="small">Belum ada lead pada periode ini.</div>');
  }catch(e){body.innerHTML='<div style="color:#b42318">Gagal memuat pencapaian: '+cpEsc(e?.message||e)+'</div>'}
 };
 node.querySelectorAll('[data-cp-mode]').forEach(b=>b.onclick=()=>load(b.getAttribute('data-cp-mode')||'month'));
 await load('month');
};
})();