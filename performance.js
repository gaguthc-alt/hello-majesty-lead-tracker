(async function(){
window.openPerformance=async function(){
 const mg=profile?.is_management;
 let box=document.getElementById('performance');
 if(!box){box=document.createElement('div');box.id='performance';box.className='box';document.getElementById('dashboard').prepend(box)}
 box.classList.remove('hidden');
 box.innerHTML='<h3>'+ (mg?'📊 Laporan Management':'📊 Performa Saya')+'</h3><div class="row"><select id="perfPeriod"><option value="month">Bulan ini</option><option value="week">Minggu ini</option><option value="today">Hari ini</option><option value="custom">Custom</option></select>'+(mg?'<select id="perfEmployee"><option value="">Semua Karyawan</option></select>':'')+'</div><div id="customDates" class="row hidden"><input id="perfStart" type="date"><input id="perfEnd" type="date"></div><div id="perfBody">Memuat...</div>';
 if(mg){const t=await sb.from('team_profiles').select('name').eq('active',true).order('name');if(!t.error)document.getElementById('perfEmployee').innerHTML='<option value="">Semua Karyawan</option>'+(t.data||[]).map(x=>'<option>'+esc(x.name)+'</option>').join('')}
 document.getElementById('perfPeriod').onchange=function(){document.getElementById('customDates').classList.toggle('hidden',this.value!=='custom');loadPerformance()};
 if(mg)document.getElementById('perfEmployee').onchange=loadPerformance;
 document.getElementById('perfStart').onchange=loadPerformance;document.getElementById('perfEnd').onchange=loadPerformance;await loadPerformance();
};
window.loadPerformance=async function(){
 const mode=document.getElementById('perfPeriod').value,now=new Date(),pad=n=>String(n).padStart(2,'0'),fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());let s=new Date(now),e=new Date(now);
 if(mode==='week'){s.setDate(now.getDate()-((now.getDay()+6)%7))}else if(mode==='month'){s=new Date(now.getFullYear(),now.getMonth(),1)}else if(mode==='custom'){s=new Date(document.getElementById('perfStart').value||fmt(now));e=new Date(document.getElementById('perfEnd').value||fmt(now))}
 const mg=profile?.is_management;let x=mg?await sb.rpc('management_performance_report',{p_start:fmt(s),p_end:fmt(e),p_employee:document.getElementById('perfEmployee')?.value||null}):await sb.rpc('my_performance_report',{p_start:fmt(s),p_end:fmt(e)});
 if(x.error){document.getElementById('perfBody').innerHTML='<p>'+esc(x.error.message)+'</p>';return}
 document.getElementById('perfBody').innerHTML=(x.data||[]).map(r=>'<div class="lead"><h3>'+esc(r.employee_name)+'</h3><b>CS</b><div class="row">'+m('Claim',r.cs_claim)+m('Qualified',r.cs_qualified)+m('Potensial',r.cs_potensial)+m('Gagal',r.cs_gagal)+m('Rate',r.cs_qualification_rate+'%')+'</div><br><b>SALES</b><div class="row">'+m('Claim',r.sales_claim)+m('Closing',r.sales_closing)+m('Potensial',r.sales_potensial)+m('Gagal',r.sales_gagal)+m('Rate',r.sales_closing_rate+'%')+'</div></div>').join('')||'<p class="small">Belum ada data performa pada periode ini.</p>';
};
function m(a,b){return '<div class="stat"><div class="small">'+a+'</div><div class="num">'+esc(b)+'</div></div>'}
function inject(){if(!profile)return;let b=document.getElementById('refreshBtn');if(!b||document.getElementById('perfBtn'))return;let x=document.createElement('button');x.id='perfBtn';x.className='secondary';x.textContent=profile.is_management?'📊 Laporan Management':'📊 Performa Saya';x.onclick=openPerformance;b.parentNode.insertBefore(x,b.nextSibling)}
const oldStart=window.start;window.start=async function(u){const r=await oldStart(u);inject();return r};
const oldChange=window.changePassword;window.changePassword=async function(){const r=await oldChange();inject();return r};
setTimeout(inject,1500);
})();