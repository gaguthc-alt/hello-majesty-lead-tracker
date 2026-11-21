(function(){
function cpFmt(n){return Number(n||0).toLocaleString('id-ID')}
function cpEsc(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function cpPeriod(mode){
 const now=new Date(),y=now.getFullYear(),m=now.getMonth();
 if(mode==='today')return {start:new Date(y,m,now.getDate()),end:new Date(y,m,now.getDate()+1),label:'HARI INI'};
 if(mode==='last_month')return {start:new Date(y,m-1,1),end:new Date(y,m,1),label:'BULAN KEMARIN'};
 return {start:new Date(y,m,1),end:new Date(y,m,now.getDate()+1),label:'BULAN INI'};
}
window.renderContentPerformance=async function(){
 const node=document.getElementById('contentPerformance');
 if(!node)throw new Error('Panel Pencapaian Content Creator tidak ditemukan.');
 node.innerHTML='<h3 style="margin-top:0">🎬 PENCAPAIAN CONTENT CREATOR</h3><div class="small" style="margin-bottom:12px">Jumlah seluruh lead setiap Content Creator dari semua sumber, digabung dalam satu ringkasan.</div><div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="secondary" type="button" data-cp-mode="today">Hari Ini</button><button class="secondary" type="button" data-cp-mode="month">Bulan Ini</button><button class="secondary" type="button" data-cp-mode="last_month">Bulan Kemarin</button></div><div id="cpBody"><div class="small">⏳ Memuat...</div></div>';
 const load=async mode=>{
  const body=document.getElementById('cpBody');if(!body)return;
  body.innerHTML='<div class="small">⏳ Memuat pencapaian...</div>';
  try{
   const p=cpPeriod(mode);
   const q=await sb.from('leads').select('lead_id,content_creator,source_platform,source_campaign,source_confidence,created_at').gte('created_at',p.start.toISOString()).lt('created_at',p.end.toISOString());
   if(q.error)throw q.error;
   const rows=q.data||{};
   const monthStart=new Date(p.start.getFullYear(),p.start.getMonth(),1).toISOString().slice(0,10);
   const adjQ=await sb.rpc('get_content_funnel_manual_adjustments',{p_month_start:monthStart});
   if(adjQ.error)throw adjQ.error;
   const historical=(adjQ.data||[]).filter(a=>a.outlet==='Hello Majesty'&&a.metric==='claim_cs');
   const historicalTotal=historical.reduce((s,a)=>s+Math.max(0,Number(a.amount)||0),0);
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
   const list=Object.values(groups).sort((a,b)=>b.leads-a.leads||a.creator.localeCompare(b.creator,'id'));
   const creatorCards=Object.values(list.reduce((acc,x)=>{
    if(!x.creator||x.creator==='—')return acc;
    const key=x.creator.trim().toLocaleLowerCase('id');
    if(!acc[key])acc[key]={creator:x.creator.trim(),leads:0};
    acc[key].leads+=Number(x.leads||0);
    return acc;
   },{})).sort((a,b)=>b.leads-a.leads||a.creator.localeCompare(b.creator,'id'));
   const creatorCount=new Set(list.map(x=>String(x.creator||'').trim().toLocaleLowerCase('id')).filter(x=>x&&x!=='—')).size;
   const total=rows.length+historicalTotal;
   const rawRole=String(profile?.role||'').trim().toUpperCase().replace(/_/g,' ');
   const activeRoles=typeof getActiveRoles==='function'?getActiveRoles():[];
   const isManagement=!!profile?.is_management||activeRoles.includes('MANAGEMENT')||rawRole.includes('MANAGEMENT')||activeRoles.includes('DIVISI')||rawRole==='DIVISI';
   const trackedCount=rows.filter(r=>String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK').length;
   const unattributedCount=rows.filter(r=>!String(r.content_creator||'').trim()).length;
   const creatorTotals={};
   list.forEach(x=>{if(x.creator&&x.creator!=='—')creatorTotals[x.creator]=(creatorTotals[x.creator]||0)+Number(x.leads||0);});
   historical.forEach(a=>{const name=String(a.employee_name||'').trim();if(name)creatorTotals[name]=(creatorTotals[name]||0)+Math.max(0,Number(a.amount)||0);});
   const periodEnd=new Date(p.end.getTime()-86400000);
   const dateFmt=d=>d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
   const reportMessage=[
    '🎬 *LAPORAN PENCAPAIAN CONTENT CREATOR*',
    '*HELLO MAJESTY — Built on Trust*',
    '',
    '*Periode:* '+p.label+' ('+dateFmt(p.start)+' – '+dateFmt(periodEnd)+')',
    '*Total lead:* '+cpFmt(total+historicalTotal),
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
   ].join('\n');
   body.innerHTML='<div class="stats"><div class="stat"><div class="small">Total Lead</div><div class="num">'+cpFmt(total)+'</div></div><div class="stat"><div class="small">Content Creator</div><div class="num">'+cpFmt(creatorCount)+'</div></div><div class="stat"><div class="small">Lead dari Link Terlacak</div><div class="num">'+cpFmt(trackedCount)+'</div></div><div class="stat"><div class="small">Lead WhatsApp / Belum Teratribusi</div><div class="num">'+cpFmt(unattributedCount)+'</div></div></div><div class="small" style="margin:12px 0">Periode: <b>'+p.label+'</b> · dihitung dari lead yang dibuat pada periode tersebut.</div>'+
   (creatorCards.length?creatorCards.map(x=>'<div class="lead" style="margin-top:10px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b style="font-size:16px">🎬 '+cpEsc(x.creator)+'</b><span class="badge">'+cpFmt(x.leads)+' lead</span></div></div>').join(''):'<div class="small">Belum ada lead pada periode ini.</div>')+
   (isManagement?'<div style="margin-top:16px"><button id="cpShareWa" type="button" style="width:100%;background:#128c7e;color:#fff;border:0;border-radius:12px;padding:13px 16px;font-weight:700">🟢 Kirim Laporan ke WhatsApp (Management)</button><div class="small" style="margin-top:6px">WhatsApp akan terbuka dengan laporan siap dikirim. Pilih grup atau kontak Management.</div></div>':'');
   const shareButton=document.getElementById('cpShareWa');
   if(shareButton)shareButton.onclick=async()=>{
    try{
     shareButton.disabled=true;shareButton.textContent='⏳ Menyiapkan laporan...';
     const todayMode='today',monthMode='month';
     const [todayQ,monthQ]=await Promise.all([
      sb.from('leads').select('lead_id,content_creator,source_platform,source_campaign,source_confidence,created_at').gte('created_at',cpPeriod(todayMode).start.toISOString()).lt('created_at',cpPeriod(todayMode).end.toISOString()),
      sb.from('leads').select('lead_id,content_creator,source_platform,source_campaign,source_confidence,created_at').gte('created_at',cpPeriod(monthMode).start.toISOString()).lt('created_at',cpPeriod(monthMode).end.toISOString())
     ]);
     if(todayQ.error)throw todayQ.error;if(monthQ.error)throw monthQ.error;
     const summarize=(sourceRows,mode)=>{
      const gs={};
      (sourceRows||[]).forEach(r=>{
       const tracked=String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK';
       const creator=String(r.content_creator||'').trim()||'—';
       const platform=String(r.source_platform||'').trim().toUpperCase()||(tracked?'LINK CONTENT CREATOR':'WHATSAPP');
       const campaign=String(r.source_campaign||'').trim()||(tracked?'Tanpa kampanye':(creator==='—'?'Tidak diketahui':'Atribusi tersimpan'));
       const key=[creator,platform,campaign].join('|');
       if(!gs[key])gs[key]={creator,platform,campaign,leads:0};gs[key].leads++;
      });
      activeCreators.forEach(name=>{if(!Object.values(gs).some(x=>x.creator.toLocaleLowerCase('id')===name.toLocaleLowerCase('id')))gs[[name,'—','—'].join('|')]={creator:name,platform:'—',campaign:'—',leads:0};});
      const items=Object.values(gs).sort((a,b)=>b.leads-a.leads||a.creator.localeCompare(b.creator,'id'));
      const totals={};items.forEach(x=>{if(x.creator!=='—')totals[x.creator]=(totals[x.creator]||0)+x.leads;});
      return {items,total:(sourceRows||[]).length,creatorCount:Object.keys(totals).length,tracked:(sourceRows||[]).filter(r=>String(r.source_confidence||'').toUpperCase()==='TRACKED_LINK').length,unattributed:(sourceRows||[]).filter(r=>!String(r.content_creator||'').trim()).length,totals};
     };
     const dateFmt=d=>d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
     const todayP=cpPeriod('today'),monthP=cpPeriod('month');
     const today=summarize(todayQ.data,'today'),month=summarize(monthQ.data,'month');
     const section=(heading,p,d,mode)=>[
      '*'+heading+'*',
      '*Periode:* '+(mode==='today'?dateFmt(p.start):dateFmt(p.start)+' – '+dateFmt(new Date(p.end.getTime()-86400000))),
      '*Total lead:* '+cpFmt(d.total),
      '',
      '*PERFORMA TIM CONTENT*',
      ...Object.entries(d.totals).sort((a,b)=>b[1]-a[1]).map(([name,count],i)=>(i+1)+'. '+name+' — *'+cpFmt(count)+' lead*')
     ].join('\n');
     const combined=[
      '🎬 *LAPORAN PENCAPAIAN CONTENT CREATOR*',
      '*HELLO MAJESTY — Built on Trust*','',
      section('📅 PERFORMA HARI INI',todayP,today,'today'),'',
      section('📊 PERFORMA BULAN INI (BERJALAN)',monthP,month,'month'),'',
      'Laporan dibuat dari Lead Tracker berdasarkan tanggal lead dibuat.',
      '— HELLO MAJESTY'
     ].join('\n');
     window.location.href='https://wa.me/?text='+encodeURIComponent(combined);
    }catch(err){alert('Gagal menyiapkan laporan: '+(err?.message||err));shareButton.disabled=false;shareButton.textContent='🟢 Kirim Laporan ke WhatsApp (Management)';}
   };
  }catch(e){body.innerHTML='<div style="color:#b42318">Gagal memuat pencapaian: '+cpEsc(e?.message||e)+'</div>'}
 };
 node.querySelectorAll('[data-cp-mode]').forEach(b=>b.onclick=()=>load(b.getAttribute('data-cp-mode')||'month'));
 await load('month');
};
})();