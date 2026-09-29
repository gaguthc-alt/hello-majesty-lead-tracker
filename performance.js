(function(){
function perfFmt(n){return Number(n||0).toLocaleString('id-ID')}
function perfDate(d){return d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
function perfPeriod(mode){
 const now=new Date();
 if(mode==='today') return {start:new Date(now.getFullYear(),now.getMonth(),now.getDate()),end:new Date(now.getFullYear(),now.getMonth(),now.getDate()),label:'HARI INI'};
 return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,0),label:'BULAN INI'};
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
async function perfGetTarget(){
 const x=await sb.rpc('dashboard_target_summary');
 if(x.error)throw x.error;
 return x.data||{};
}
async function perfBuild(mode){
 const p=perfPeriod(mode), roles=perfRoles(), sales=await perfGetSales(mode), target=await perfGetTarget();
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
     const c=await perfGetContent(mode), o=c.own||{};
     lines.push('🎬 *CONTENT CREATOR*');
     lines.push('• Content: '+perfFmt(o.content_count));
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
     const rc=target.role_contribution?.facilitator||{}, o=(target.outlets||[]).find(x=>x.outlet===profile?.outlet)||{};
     lines.push('🧭 *FASILITATOR PERFORMANCE*');
     lines.push('• WA Tim: '+perfFmt(rc.wa)+' / '+perfFmt(o.wa_target));
     lines.push('• Qualified Tim: '+perfFmt(rc.qualified)+' / '+perfFmt(o.qualified_target));
     lines.push('• Closing Tim: '+perfFmt(rc.closing)+' / '+perfFmt(o.closing_target));
     lines.push('');
   }
   if(role==='Hunter'){
     const own=target.own_contribution||{};
     lines.push('🏹 *HUNTER PERFORMANCE*');
     lines.push('• Unit Hunter SOLD: '+perfFmt(own.hunter));
     lines.push('');
   }
 }
 if(mode==='month'){
   const o=(target.outlets||[]).find(x=>x.outlet===profile?.outlet);
   if(o){
     lines.push('🎯 *TARGET OUTLET BULAN INI*');
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
window.openPerformance=async function(){
 const mg=!!profile?.is_management;
 let box=document.getElementById('performance');
 if(!box){box=document.createElement('div');box.id='performance';box.className='box';document.getElementById('dashboard').prepend(box)}
 box.classList.remove('hidden');
 box.innerHTML='<h3>'+ (mg?'📊 Laporan Management':'📊 Performa Saya')+'</h3>'+
   (mg?'<div class="small" style="margin-bottom:10px">Management dapat melihat laporan performa tim. Untuk tim, gunakan Performa Saya.</div>':'<div class="small" style="margin-bottom:10px">Pilih periode lalu kirim laporan sesuai peran akun secara otomatis.</div>')+
   '<div class="row"><button class="secondary" id="perfToday">📅 Hari Ini</button><button class="secondary" id="perfMonth">📊 Bulan Ini</button></div>'+
   '<div id="perfBody" style="margin-top:10px"></div>';
 if(mg){
   box.querySelector('#perfBody').innerHTML='<p class="small">Pilih anggota tim melalui menu Laporan Management yang sudah tersedia di bawah.</p>';
   return;
 }
 box.querySelector('#perfToday').onclick=()=>perfShow('today');
 box.querySelector('#perfMonth').onclick=()=>perfShow('month');
 await perfShow('today');
};
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