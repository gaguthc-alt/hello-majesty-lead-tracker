(function(){
function perfFmt(n){return Number(n||0).toLocaleString('id-ID')}
function perfDate(d){return d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
function perfPeriod(mode){
 const now=new Date(), parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 const y=parts.year,m=parts.month,d=parts.day;
 if(mode==='today'){
   const start=new Date(Date.UTC(y,m-1,d)-8*3600000);
   return {start,end:new Date(start),label:'HARI INI'};
 }
 if(mode==='last_month'){
   const first=new Date(Date.UTC(y,m-2,1)-8*3600000);
   const last=new Date(Date.UTC(y,m-1,0)-8*3600000);
   return {start:first,end:last,label:'BULAN KEMARIN'};
 }
 const first=new Date(Date.UTC(y,m-1,1)-8*3600000);
 const last=new Date(Date.UTC(y,m,0)-8*3600000);
 return {start:first,end:last,label:'BULAN INI'};
}
function perfWa(text){window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank')}
function perfRoles(){
 if(profile?.is_management)return ['Management'];
 const roles=Array.isArray(window.hmRoles)?window.hmRoles.filter(Boolean):[];
 return roles.length?roles:[String(profile?.role||'').trim()].filter(Boolean);
}
async function perfGetSales(mode){
 const p=perfPeriod(mode), pad=n=>String(n).padStart(2,'0'), fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const x=await sb.rpc('my_performance_report',{p_start:fmt(p.start),p_end:fmt(p.end)});
 if(x.error)throw x.error;
 return x.data?.[0]||{};
}
async function perfGetContent(mode){
 const p=perfPeriod(mode);
 const monthStart=new Date(p.start.getFullYear(),p.start.getMonth(),1);
 const v=monthStart.getFullYear()+'-'+String(monthStart.getMonth()+1).padStart(2,'0')+'-01';
 const x=await sb.rpc('content_dashboard_summary',{p_month_start:v});
 if(x.error)throw x.error;
 return x.data||{};
}
async function perfGetTodaySales(){
 const p=perfPeriod('today'), start=p.start.toISOString(), end=new Date(p.end.getTime()+86400000).toISOString();
 const name=profile?.name, outlet=profile?.outlet;
 const [ev,cl,st]=await Promise.all([
   sb.from('lead_events').select('event_type').eq('employee_name',name).gte('event_at',start).lt('event_at',end),
   sb.from('leads').select('lead_id').eq('cs_claimed_by',name).gte('claimed_at',start).lt('claimed_at',end),
   sb.from('sales_transactions').select('id').eq('sales_user_id',profile?.user_id).gte('sold_at',start).lt('sold_at',end)
 ]);
 if(ev.error)throw ev.error; if(cl.error)throw cl.error; if(st.error)throw st.error;
 const a=ev.data||[], count=t=>a.filter(x=>x.event_type===t).length;
 return {cs_claim:cl.data?.length||0,cs_qualified:count('CS_QUALIFIED'),cs_potensial:count('CS_POTENSIAL'),cs_gagal:count('CS_GAGAL'),cs_qualification_rate:count('CS_CLAIM')?Math.round(count('CS_QUALIFIED')/count('CS_CLAIM')*1000)/10:0,sales_claim:count('SALES_CLAIM'),sales_closing:st.data?.length||0,sales_potensial:count('SALES_POTENSIAL'),sales_gagal:count('SALES_GAGAL')};
}
async function perfGetTodayContent(){
 const p=perfPeriod('today'), start=p.start.toISOString(), end=new Date(p.end.getTime()+86400000).toISOString();
 const x=await sb.from('content_posts').select('views,comments,dms').eq('active',true).eq('outlet',profile?.outlet).eq('content_creator',profile?.name).gte('posted_at',start).lt('posted_at',end);
 if(x.error)throw x.error; const a=x.data||[];
 return {content_count:a.length,views:a.reduce((s,r)=>s+Number(r.views||0),0),comments:a.reduce((s,r)=>s+Number(r.comments||0),0),dms:a.reduce((s,r)=>s+Number(r.dms||0),0)};
}
async function perfGetTeamMetrics(mode,outlet){
 const p=perfPeriod(mode), start=p.start.toISOString(), end=new Date(p.end.getTime()+86400000).toISOString();
 const [l,q,s,h]=await Promise.all([
  sb.from('leads').select('lead_id').eq('outlet',outlet).gte('created_at',start).lt('created_at',end),
  sb.from('lead_events').select('lead_id').eq('outlet',outlet).in('event_type',['CS_QUALIFIED','CS_POTENSIAL']).gte('event_at',start).lt('event_at',end),
  sb.from('sales_transactions').select('id').eq('outlet',outlet).gte('sold_at',start).lt('sold_at',end),
  sb.from('sales_transactions').select('id').eq('outlet',outlet).eq('hunter_user_id',profile?.user_id).gte('sold_at',start).lt('sold_at',end)
 ]);
 for(const x of [l,q,s,h])if(x.error)throw x.error;
 const handoverIds=new Set((q.data||[]).map(x=>x.lead_id).filter(Boolean));
 return {wa:l.data?.length||0,qualified:handoverIds.size,closing:s.data?.length||0,hunter:h.data?.length||0};
}
async function perfGetTarget(mode='month'){
 if(mode==='last_month'){
   const p=perfPeriod('last_month'), pad=n=>String(n).padStart(2,'0'), monthStart=p.start.getFullYear()+'-'+pad(p.start.getMonth()+1)+'-'+pad(p.start.getDate());
   const x=await sb.from('monthly_outlet_targets').select('*').eq('month_start',monthStart);
   if(x.error)throw x.error;
   return {outlets:(x.data||[]).map(o=>({outlet:o.outlet,wa_target:Number(o.wa_target||0),qualified_target:Number(o.qualified_target||0),closing_target:Number(o.closing_target||0),bonus_label:o.bonus_label||'',bonus_amount:Number(o.bonus_amount||0)})),roles:[]};
 }
 const x=await sb.rpc('dashboard_target_summary');
 if(x.error)throw x.error;
 return x.data||{};
}
async function perfBuild(mode){
 const p=perfPeriod(mode), target=await perfGetTarget(mode); const roles=profile?.is_management?['Management']:(target.roles?.length?target.roles:perfRoles()); const sales=mode==='today'?await perfGetTodaySales():await perfGetSales(mode);
 const lines=[];
 lines.push('📊 *PERFORMANCE '+p.label+'*');
 lines.push('🏪 *Outlet:* '+(profile?.outlet||'Management'));
 lines.push('👤 *Nama:* '+(profile?.name||'-'));
 lines.push('🎯 *Peran:* '+roles.join(', '));
 lines.push('📅 *Periode:* '+perfDate(p.start)+(mode==='month'?'':''));
 lines.push('━━━━━━━━━━━━━━━━━━');
 for(const role of roles){
   if(role==='Management') continue;
   if(role==='Content Creator'){
     const c=mode==='today'?{own:await perfGetTodayContent()}:await perfGetContent(mode), o=c.own||{};
     const team=await perfGetTeamMetrics(mode,profile?.outlet);
     lines.push('🎬 *CONTENT CREATOR*');
     lines.push('• Content: '+perfFmt(o.content_count));
     lines.push('• WA Dihasilkan: '+perfFmt(team.wa));
     lines.push('• Views: '+perfFmt(o.views));
     lines.push('• Comments: '+perfFmt(o.comments));
     lines.push('• DM: '+perfFmt(o.dms));
     lines.push('');
   }
   if(role==='CS'){
     lines.push('💬 *CS PERFORMANCE*');
     lines.push('• Claim: '+perfFmt(sales.cs_claim));
     lines.push('• Qualified: '+perfFmt(sales.cs_qualified));
     lines.push('• Potensial: '+perfFmt(sales.cs_potensial));
     lines.push('• Gagal: '+perfFmt(sales.cs_gagal));
     lines.push('• Qualification Rate: '+perfFmt(sales.cs_qualification_rate)+'%');
     lines.push('');
   }
   if(role==='Sales'){
     lines.push('🏆 *SALES PERFORMANCE*');
     lines.push('• Claim: '+perfFmt(sales.sales_claim));
     lines.push('• Closing: '+perfFmt(sales.sales_closing));
     lines.push('• Potensial: '+perfFmt(sales.sales_potensial));
     lines.push('• Gagal: '+perfFmt(sales.sales_gagal));
     lines.push('• Closing Rate: '+perfFmt(sales.sales_closing_rate)+'%');
     lines.push('');
   }
   if(role==='Fasilitator'){
     const rc=mode==='today'?await perfGetTeamMetrics('today',profile?.outlet):(target.role_contribution?.facilitator||{}), o=(target.outlets||[]).find(x=>x.outlet===profile?.outlet)||{};
     lines.push('🧭 *FASILITATOR PERFORMANCE*');
     lines.push('• WA Tim: '+perfFmt(rc.wa)+' / '+perfFmt(o.wa_target));
     lines.push('• Qualified Tim: '+perfFmt(rc.qualified)+' / '+perfFmt(o.qualified_target));
     lines.push('• Closing Tim: '+perfFmt(rc.closing)+' / '+perfFmt(o.closing_target));
     lines.push('');
   }
   if(role==='Hunter'){
     const own=mode==='today'?await perfGetTeamMetrics('today',profile?.outlet):target.own_contribution||{};
     lines.push('🏹 *HUNTER PERFORMANCE*');
     lines.push('• Unit Hunter SOLD: '+perfFmt(own.hunter));
     lines.push('');
   }
 }
 if(mode==='month'||mode==='last_month'){
   const o=(target.outlets||[]).find(x=>x.outlet===profile?.outlet);
   if(o){
     lines.push('🎯 *TARGET OUTLET '+(mode==='last_month'?'BULAN KEMARIN':'BULAN INI')+'*');
     lines.push('• WA: '+perfFmt(o.wa_actual)+' / '+perfFmt(o.wa_target));
     lines.push('• Qualified: '+perfFmt(o.qualified_actual)+' / '+perfFmt(o.qualified_target));
     lines.push('• Closing: '+perfFmt(o.closing_actual)+' / '+perfFmt(o.closing_target));
     lines.push('');
   }
 }
 lines.push('━━━━━━━━━━━━━━━━━━');
 lines.push('— HELLO MAJESTY');
 lines.push('Built on Trust.');
 return lines.join('\n');
}
async function perfManagement(mode){
 const p=perfPeriod(mode), pad=n=>String(n).padStart(2,'0'), fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const x=await sb.rpc('management_performance_report',{p_start:fmt(p.start),p_end:fmt(p.end),p_employee:null});
 if(x.error)throw x.error;
 const perf=x.data||[];
 const tp=await sb.from('team_profiles').select('user_id,name,outlet,active,is_management').eq('active',true).eq('is_management',false).order('name');
 if(tp.error)throw tp.error;
 const profiles=tp.data||[];
 const pm=await sb.from('team_permissions').select('name,outlet,can_cs,can_sales,can_facilitator,can_content_creator,can_hunter,active').eq('active',true);
 if(pm.error)throw pm.error;
 const perms=pm.data||[];
 const rolesFor=(p)=>{const a=perms.filter(q=>q.name===p.name&&q.outlet===p.outlet);const r=[];if(a.some(q=>q.can_content_creator))r.push('Content Creator');if(a.some(q=>q.can_facilitator))r.push('Fasilitator');if(a.some(q=>q.can_cs))r.push('CS');if(a.some(q=>q.can_sales))r.push('Sales');if(a.some(q=>q.can_hunter))r.push('Hunter');return r.length?r:[p.role||'Staff']};
 const contentMonth=p.start.getFullYear()+'-'+String(p.start.getMonth()+1).padStart(2,'0')+'-01';
 const cp=await sb.from('content_posts').select('content_creator,outlet,views,comments,dms').eq('active',true).eq('month_start',contentMonth);
 if(cp.error)throw cp.error;
 const contentMap={};
 for(const r of (cp.data||[])){const k=r.outlet+'|'+r.content_creator;(contentMap[k]??={content_count:0,views:0,comments:0,dms:0,wa_generated:0});contentMap[k].content_count++;contentMap[k].views+=Number(r.views||0);contentMap[k].comments+=Number(r.comments||0);contentMap[k].dms+=Number(r.dms||0)}
 const target=await perfGetTarget(mode);
 const contentRows=await sb.from('content_posts').select('content_creator,outlet,posted_at').eq('active',true).gte('posted_at',p.start.toISOString()).lt('posted_at',new Date(p.end.getTime()+86400000).toISOString());
 if(contentRows.error)throw contentRows.error;
 const baliDate=x=>{
   const z=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(x));
   return z.find(v=>v.type==='year')?.value+'-'+z.find(v=>v.type==='month')?.value+'-'+z.find(v=>v.type==='day')?.value;
 };
 const contentDateMap={};
 for(const w of (contentRows.data||[])){
   const k=w.outlet+'|'+w.content_creator;
   (contentDateMap[k]??=new Set()).add(baliDate(w.posted_at));
 }
 const waRows=await sb.from('leads').select('created_at,outlet').eq('outlet',profile?.outlet).gte('created_at',p.start.toISOString()).lt('created_at',new Date(p.end.getTime()+86400000).toISOString());
 if(waRows.error)throw waRows.error;
 for(const w of (waRows.data||[])){
   const k=w.outlet;
   const matches=Object.keys(contentDateMap).filter(x=>x.startsWith(k+'|')&&contentDateMap[x].has(baliDate(w.created_at)));
   for(const mk of matches){
     (contentMap[mk]??={content_count:0,views:0,comments:0,dms:0,wa_generated:0}).wa_generated++;
   }
 }
 const salesRows=await sb.from('sales_transactions').select('sales_user_id,customer_source').gte('sold_at',p.start.toISOString()).lt('sold_at',new Date(p.end.getTime()+86400000).toISOString());
 if(salesRows.error)throw salesRows.error;
 const salesMap={};for(const s of (salesRows.data||[])){if(s.sales_user_id)salesMap[s.sales_user_id]=(salesMap[s.sales_user_id]||0)+1;}
 const hunterRows=await sb.from('sales_transactions').select('hunter_user_id').not('hunter_user_id','is',null).gte('sold_at',p.start.toISOString()).lt('sold_at',new Date(p.end.getTime()+86400000).toISOString());
 if(hunterRows.error)throw hunterRows.error;
 const hunterMap={};for(const h of (hunterRows.data||[]))hunterMap[h.hunter_user_id]=(hunterMap[h.hunter_user_id]||0)+1;
 const outletMap=Object.fromEntries((target.outlets||[]).map(o=>[o.outlet,o]));
 const byName=Object.fromEntries(perf.map(r=>[r.employee_name,r]));
 const teamMetrics={};
 for(const pr of profiles){
   if(!teamMetrics[pr.outlet])teamMetrics[pr.outlet]=await perfGetTeamMetrics(mode,pr.outlet);
 }
 const claimRows=await sb.from('leads').select('cs_claimed_by,outlet').gte('claimed_at',p.start.toISOString()).lt('claimed_at',new Date(p.end.getTime()+86400000).toISOString()).not('cs_claimed_by','is',null);
 if(claimRows.error)throw claimRows.error;
 const claimMap={};
 for(const row of (claimRows.data||[])){
   const k=row.outlet+'|'+row.cs_claimed_by;
   claimMap[k]=(claimMap[k]||0)+1;
 }
 return profiles.map(pr=>{
   const roles=rolesFor(pr), r=byName[pr.name]||{}, cm=contentMap[pr.outlet+'|'+pr.name]||{};
   const o=outletMap[pr.outlet]||{}, facilitator=teamMetrics[pr.outlet]||{};
   const teamClaim=claimMap[pr.outlet+'|'+pr.name]||0;
   const cs={...r,cs_claim:teamClaim,cs_qualification_rate:teamClaim>0?Math.round((Number(r.cs_qualified||0)/teamClaim)*1000)/10:0};
   const actualClosing=Number(salesMap[pr.user_id]||0);
   const sales={...r,sales_claim:Math.max(Number(r.sales_claim||0),actualClosing),sales_closing:actualClosing,sales_closing_rate:Math.max(Number(r.sales_claim||0),actualClosing)>0?Math.round(actualClosing/Math.max(Number(r.sales_claim||0),actualClosing)*1000)/10:0};
   return {name:pr.name,outlet:pr.outlet,roles,cs,sales,content:cm,facilitator,hunter:hunterMap[pr.user_id]||0,target:o};
 });
}
function perfManagementCard(row,mode){
 const r=row.cs||{}, roles=row.roles||[];
 let h='<div class="lead"><div class="row" style="justify-content:space-between;align-items:center"><div><b>'+esc(row.name)+'</b><div class="small">'+esc(row.outlet||'-')+'</div></div><span class="badge">'+esc(roles.join(' • '))+'</span></div>';
 for(const role of roles){
   if(role==='Content Creator') h+='<div style="margin-top:10px"><b>🎬 Content Creator</b><div class="small">Content '+perfFmt(row.content.content_count)+' • WA Dihasilkan '+perfFmt(row.facilitator.wa||0)+' • Views '+perfFmt(row.content.views)+' • Comments '+perfFmt(row.content.comments)+' • DM '+perfFmt(row.content.dms)+'</div></div>';
   if(role==='CS') h+='<div style="margin-top:10px"><b>💬 CS</b><div class="small">Claim '+perfFmt(r.cs_claim)+' • Qualified '+perfFmt(r.cs_qualified)+' • Potensial '+perfFmt(r.cs_potensial)+' • Gagal '+perfFmt(r.cs_gagal)+' • Rate '+perfFmt(r.cs_qualification_rate)+'%</div></div>';
   if(role==='Sales') h+='<div style="margin-top:10px"><b>🏆 Sales</b><div class="small">Claim '+perfFmt(r.sales_claim)+' • Closing '+perfFmt(r.sales_closing)+' • Potensial '+perfFmt(r.sales_potensial)+' • Gagal '+perfFmt(r.sales_gagal)+' • Rate '+perfFmt(r.sales_closing_rate)+'%</div></div>';
   if(role==='Fasilitator') h+='<div style="margin-top:10px"><b>🧭 Fasilitator</b><div class="small">WA Tim '+perfFmt(row.facilitator.wa)+' / '+perfFmt(row.target.wa_target)+' • Qualified '+perfFmt(row.facilitator.qualified)+' / '+perfFmt(row.target.qualified_target)+' • Closing '+perfFmt(row.facilitator.closing)+' / '+perfFmt(row.target.closing_target)+'</div></div>';
   if(role==='Hunter') h+='<div style="margin-top:10px"><b>🏹 Hunter</b><div class="small">Unit Hunter SOLD '+perfFmt(row.hunter)+'</div></div>';
 }
 return h+'</div>';
}
window.openPerformance=async function(){
 const mg=!!profile?.is_management;
 let box=document.getElementById('performance');
 if(!box){box=document.createElement('div');box.id='performance';box.className='box';document.getElementById('dashboard').prepend(box)}
 box.classList.remove('hidden');
 box.innerHTML='<h3>'+ (mg?'📊 Laporan Performa Tim':'📊 Performa Saya')+'</h3>'+
   (mg?'<div class="small" style="margin-bottom:10px">Performance seluruh karyawan • data langsung dari sistem.</div>':'<div class="small" style="margin-bottom:10px">Pilih periode lalu kirim laporan sesuai peran akun secara otomatis.</div>')+
   '<div class="row" style="flex-wrap:wrap"><button class="secondary" id="perfToday">📅 Hari Ini</button><button class="secondary" id="perfMonth">📊 Bulan Ini</button><button class="secondary" id="perfLastMonth">↩️ Bulan Kemarin</button>'+(mg?'<button class="secondary" id="perfSalesReport">📋 Laporan Penjualan</button>':'')+'</div>'+
   '<div id="perfBody" style="margin-top:10px"></div>';
 if(mg){box.querySelector('#perfToday').onclick=()=>perfShowManagement('today');box.querySelector('#perfMonth').onclick=()=>perfShowManagement('month');box.querySelector('#perfLastMonth').onclick=()=>perfShowManagement('last_month');box.querySelector('#perfSalesReport').onclick=()=>perfShowSalesReport(window.perfManagementMode||'today');window.perfManagementMode='today';await perfShowManagement('today');return}
 box.querySelector('#perfToday').onclick=()=>perfShow('today');
 box.querySelector('#perfMonth').onclick=()=>perfShow('month');
 box.querySelector('#perfLastMonth').onclick=()=>perfShow('last_month');
 await perfShow('today');
};
async function perfShowSalesReport(mode){
 const body=document.getElementById('perfBody');if(!body)return;
 body.innerHTML='<p class="small">Memuat laporan penjualan...</p>';
 try{
   const p=perfPeriod(mode);
   const end=new Date(p.end.getTime()+86400000);
   const x=await sb.from('sales_transactions').select('*').gte('sold_at',p.start.toISOString()).lt('sold_at',end.toISOString()).order('sold_at',{ascending:false});
   if(x.error)throw x.error;
   const rows=x.data||[];
   const stockIds=[...new Set(rows.map(r=>r.stock_unit_id).filter(Boolean))];
   const salesIds=[...new Set(rows.map(r=>r.sales_user_id).filter(Boolean))];
   const [sr,ur]=await Promise.all([
     stockIds.length?sb.from('stock_units').select('id,product_id').in('id',stockIds):Promise.resolve({data:[]}),
     salesIds.length?sb.from('team_profiles').select('user_id,name').in('user_id',salesIds):Promise.resolve({data:[]})
   ]);
   if(sr.error)throw sr.error;if(ur.error)throw ur.error;
   const stocks=sr.data||[],pids=[...new Set(stocks.map(r=>r.product_id).filter(Boolean))];
   const pr=pids.length?await sb.from('product_master').select('id,product,variant').in('id',pids):{data:[]};
   if(pr.error)throw pr.error;
   const phones=[...new Set(rows.map(r=>String(r.customer_phone||'').replace(/\\D/g,'').replace(/^0/,'' )).filter(Boolean))];
   const lr=phones.length?await sb.from('leads').select('whatsapp,cs,cs_claimed_by,updated_at').order('updated_at',{ascending:false}):{data:[]};
   if(lr.error)throw lr.error;
   const sm=Object.fromEntries(stocks.map(r=>[r.id,r])),pm=Object.fromEntries((pr.data||[]).map(r=>[r.id,r])),um=Object.fromEntries((ur.data||[]).map(r=>[r.user_id,r.name]));
   const lm={};(lr.data||[]).forEach(l=>{const k=String(l.whatsapp||'').replace(/\\D/g,'').replace(/^0/,'');if(k&&!lm[k])lm[k]=l});
   const norm=v=>String(v||'').replace(/\\D/g,'').replace(/^0/,'');
   const total=rows.reduce((a,r)=>a+Number(r.sale_price||0)-Number(r.discount||0),0),profit=rows.reduce((a,r)=>a+Number(r.gross_profit||0),0);
   body.innerHTML='<div class="box"><h3 style="margin-top:0">📋 LAPORAN PENJUALAN TIM</h3><div class="small">'+esc(mode==='today'?'Hari Ini':mode==='month'?'Bulan Ini':'Bulan Kemarin')+' • '+rows.length+' transaksi</div><div class="stats" style="margin-top:10px">'+invStat('Omzet',total)+invStat('Laba',profit)+'</div>'+
   (rows.length?rows.map(r=>{const st=sm[r.stock_unit_id]||{},p=pm[st.product_id]||{},lead=lm[norm(r.customer_phone)],cs=r.customer_source==='WALK-IN'?'Walk-In':(lead?.cs||lead?.cs_claimed_by||'-');return '<div class="lead"><div class="row" style="justify-content:space-between"><b>'+esc([p.product,p.variant].filter(Boolean).join(' — ')||'Produk tidak ditemukan')+'</b><span>'+new Date(r.sold_at).toLocaleDateString('id-ID')+'</span></div><div class="small"><b>Outlet:</b> '+esc(r.outlet||'-')+' • <b>CS:</b> '+esc(cs)+' • <b>Sales:</b> '+esc(um[r.sales_user_id]||r.sales_user_id||'-')+'</div><div class="small">Sumber: '+(r.customer_source==='WALK-IN'?'🚶 WALK-IN':'📱 DIGITAL')+'</div><div>Jual Rp'+(Number(r.sale_price||0)-Number(r.discount||0)).toLocaleString('id-ID')+' • Laba Rp'+Number(r.gross_profit||0).toLocaleString('id-ID')+'</div></div>'}).join(''):'<p class="small">Belum ada penjualan pada periode ini.</p>')+'</div>';
 }catch(e){body.innerHTML='<p class="small">Laporan penjualan error: '+esc(e?.message||e)+'</p>'}
}
async function perfShowManagement(mode){
 window.perfManagementMode=mode;
 const body=document.getElementById('perfBody');if(!body)return;
 body.innerHTML='<p class="small">Memuat performance seluruh karyawan...</p>';
 try{
   const rows=await perfManagement(mode);
   const counts={};rows.forEach(r=>r.roles.forEach(role=>counts[role]=(counts[role]||0)+1));
   const summary=Object.entries(counts).map(([k,v])=>'<div class="stat"><div class="small">'+esc(k)+'</div><div class="num">'+v+'</div></div>').join('');
   body.innerHTML='<div class="stats">'+summary+'</div>'+rows.map(r=>perfManagementCard(r,mode)).join('')+(rows.length?'':'<p class="small">Belum ada data karyawan aktif.</p>');
 }catch(e){body.innerHTML='<p class="small">Laporan error: '+esc(e?.message||e)+'</p>'}
}
async function perfShow(mode){
 const body=document.getElementById('perfBody'); if(!body)return;
 body.innerHTML='<p class="small">Menyusun laporan...</p>';
 try{
   const text=await perfBuild(mode);
   body.innerHTML='<div class="box" style="white-space:pre-wrap;background:#f8fafc">'+esc(text)+'</div>'+
     '<button class="success" style="width:100%;margin-top:8px" onclick="perfSendCurrent()">📲 Kirim Performance ke WhatsApp</button>';
   window.perfCurrentText=text;
 }catch(e){body.innerHTML='<p class="small">Laporan error: '+esc(e?.message||e)+'</p>'}
}
window.perfSendCurrent=function(){if(window.perfCurrentText)perfWa(window.perfCurrentText)};
})();