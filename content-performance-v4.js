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
   const q=await sb.from('leads').select('lead_id,content_creator,source_platform,source_campaign,source_confidence,created_at').gte('created_at',p.start.toISOString()).lt('created_at',p.end.toISOString());
   if(q.error)throw q.error;
   const rows=q.data||{};
   const teamQ=await sb.from('team_profiles').select('name').eq('active',true).ilike('role','%CONTENT CREATOR%');
   if(teamQ.error)throw teamQ.error;
   const activeCreators=[...new Set((teamQ.data||[]).map(x=>String(x.name||'').trim()).filter(Boolean))];
   const groups={};
   rows.forEach(r=>{
    // Preserve historical/manual creator attribution even when the lead
    // does not carry the newer TRACKED_LINK confidence marker.
    const tracked=String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK';
    const creator=String(r.content_creator||'').trim()||'—';
    const platform=String(r.source_platform||'').trim().toUpperCase()||(tracked?'LINK CONTENT CREATOR':(creator==='—'?'WHATSAPP':'WHATSAPP'));
    const campaign=String(r.source_campaign||'').trim()||(tracked?'Tanpa kampanye':(creator==='—'?'Tidak diketahui':'Atribusi tersimpan'));
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
   // Aca's 7 manually reported leads belong to November 2026 only.
   // Never carry this adjustment into today-only or previous-month reports.
   const isNovember2026=p.start.getFullYear()===2026&&p.start.getMonth()===10&&mode==='month';
   const manualLeadOverrides=isNovember2026?{'Aca':7}:{};
   Object.entries(manualLeadOverrides).forEach(([name,count])=>{
    const existing=Object.values(groups).find(x=>x.creator.toLocaleLowerCase('id')===name.toLocaleLowerCase('id'));
    if(existing){existing.leads+=count;existing.platform='INPUT MANUAL';existing.campaign='Penyesuaian manual';existing.manual=true;}
    else groups[[name,'INPUT MANUAL','Penyesuaian manual'].join('|')]={creator:name,platform:'INPUT MANUAL',campaign:'Penyesuaian manual',leads:count,manual:true};
   });
   const list=Object.values(groups).sort((a,b)=>b.leads-a.leads||a.creator.localeCompare(b.creator,'id'));
   const creatorCount=new Set(list.map(x=>String(x.creator||'').trim().toLocaleLowerCase('id')).filter(x=>x&&x!=='—')).size;
   const total=rows.length+Object.values(manualLeadOverrides).reduce((sum,n)=>sum+Number(n||0),0);
   const rawRole=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
   const activeRoles=typeof getActiveRoles==='function'?getActiveRoles():[];
   const isManagement=!!profile?.is_management||activeRoles.includes('MANAGEMENT')||rawRole.includes('MANAGEMENT')||activeRoles.includes('DIVISI')||rawRole==='DIVISI';
   const trackedCount=rows.filter(r=>String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK').length;
   const unattributedCount=rows.filter(r=>!String(r.content_creator||'').trim()).length;
   const creatorTotals={};
   list.forEach(x=>{if(x.creator&&x.creator!=='—')creatorTotals[x.creator]=(creatorTotals[x.creator]||0)+Number(x.leads||0);});
   const periodEnd=new Date(p.end.getTime()-86400000);
   const dateFmt=d=>d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
   const reportMessage=[
    '🎬 *LAPORAN PENCAPAIAN CONTENT CREATOR*',
    '*HELLO MAJESTY — Built on Trust*',
    '',
    '*Periode:* '+p.label+' ('+dateFmt(p.start)+' – '+dateFmt(periodEnd)+')',
    '*Total lead:* '+cpFmt(total),
    '*Content Creator aktif/tercatat:* '+cpFmt(creatorCount),
    '*Lead dari link terlacak:* '+cpFmt(trackedCount),
    '*Lead WhatsApp / belum teratribusi:* '+cpFmt(unattributedCount),
    '',
    '*PERFORMA TIM CONTENT*',
    ...Object.entries(creatorTotals).sort((a,b)=>b[1]-a[1]).map(([name,count],i)=>(i+1)+'. '+name+' — *'+cpFmt(count)+' lead*'),
    '',
    '*Rincian sumber & kampanye*',
    ...list.filter(x=>x.creator!=='—').map(x=>'• '+x.creator+': '+x.platform+' / '+x.campaign+' — '+cpFmt(x.leads)+' lead'),
    '',
    'Laporan ini dibuat dari data Lead Tracker berdasarkan tanggal lead dibuat.',
    '— HELLO MAJESTY'
   ].join('\\n');
   body.innerHTML='<div class="stats"><div class="stat"><div class="small">Total Lead</div><div class="num">'+cpFmt(total)+'</div></div><div class="stat"><div class="small">Content Creator</div><div class="num">'+cpFmt(creatorCount)+'</div></div><div class="stat"><div class="small">Lead dari Link Terlacak</div><div class="num">'+cpFmt(trackedCount)+'</div></div><div class="stat"><div class="small">Lead WhatsApp / Belum Teratribusi</div><div class="num">'+cpFmt(unattributedCount)+'</div></div></div><div class="small" style="margin:12px 0">Periode: <b>'+p.label+'</b> · dihitung dari lead yang dibuat pada periode tersebut.</div>'+
   (list.length?list.map(x=>'<div class="lead" style="margin-top:10px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b style="font-size:16px">🎬 '+cpEsc(x.creator)+'</b><span class="badge">'+cpFmt(x.leads)+' lead</span></div><div style="margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><div><div class="small">Sumber / Platform</div><b>'+cpEsc(x.platform)+'</b></div><div><div class="small">Kampanye</div><b>'+cpEsc(x.campaign)+'</b></div></div></div>').join(''):'<div class="small">Belum ada lead pada periode ini.</div>')+
   (isManagement?'<div style="margin-top:16px"><button id="cpShareWa" type="button" style="width:100%;background:#128c7e;color:#fff;border:0;border-radius:12px;padding:13px 16px;font-weight:700">🟢 Kirim Laporan ke WhatsApp (Management)</button><div class="small" style="margin-top:6px">WhatsApp akan terbuka dengan laporan siap dikirim. Pilih grup atau kontak Management.</div></div>':'');
   const shareButton=document.getElementById('cpShareWa');
   if(shareButton)shareButton.onclick=()=>{window.location.href='https://wa.me/?text='+encodeURIComponent(reportMessage);};
  }catch(e){body.innerHTML='<div style="color:#b42318">Gagal memuat pencapaian: '+cpEsc(e?.message||e)+'</div>'}
 };
 node.querySelectorAll('[data-cp-mode]').forEach(b=>b.onclick=()=>load(b.getAttribute('data-cp-mode')||'month'));
 await load('month');
};
})();