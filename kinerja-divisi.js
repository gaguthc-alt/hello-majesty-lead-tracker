/* Hello Majesty — Kinerja Divisi dashboard */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const rp = n => 'Rp'+Math.round(Number(n||0)).toLocaleString('id-ID');
const num = n => Number(n||0).toLocaleString('id-ID');
const pct = (a,t) => Number(t)>0 ? Math.round(Number(a||0)/Number(t)*100) : 0;
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe = (n,t) => Math.max(0,Number(t||0)-Number(n||0));
let latestData=null, activeDivision='';

function metric(label,actual,target,format){
 const f=format==='money'?rp:num, p=pct(actual,target);
 const rows=latestData?.outlets||[], count=Math.max(1,rows.length); return '<div class="hm-kd-metric"><div class="hm-kd-label">'+label+'</div><strong>'+f(actual)+' <span>/ '+f(target)+'</span></strong><div class="hm-kd-bar"><i style="width:'+Math.min(100,p)+'%"></i></div><div class="hm-kd-foot">'+p+'% tercapai · kurang '+f(safe(actual,target))+'</div><div class="hm-kd-foot">Rata-rata/outlet: '+f(Number(actual||0)/count)+' aktual · '+f(Number(target||0)/count)+' target</div></div>';
}
function total(rows,a){return rows.reduce((s,r)=>s+Number(r[a]||0),0)}
function avg(rows,a,t){return rows.length?Math.round(rows.reduce((s,r)=>s+pct(r[a],r[t]),0)/rows.length):0}
function advice(rows, totals){
 const out=[];
 const leadPct=pct(totals.lead_actual,totals.wa_target), handPct=pct(totals.handover_actual,totals.handover_target), closePct=pct(totals.unit_actual,totals.closing_target), profitPct=pct(totals.profit_actual,totals.profit_target);
 if(leadPct<closePct) out.push('Lead baru tertinggal dari kebutuhan hasil. Prioritaskan konten dan CTA yang menghasilkan WhatsApp masuk, bukan hanya tayangan.');
 if(handPct<leadPct) out.push('Handover CS tertinggal dibanding lead masuk. Periksa kecepatan respons, lead yang belum dikualifikasi, dan disiplin serah-terima.');
 if(closePct<handPct) out.push('Closing/unit tertinggal dari volume handover. Audit kualitas lead, konsultasi Sales, follow-up, dan alasan lead gagal.');
 if(profitPct<closePct) out.push('Pencapaian laba tertinggal dari pencapaian unit. Periksa margin per transaksi, diskon, biaya, dan komposisi produk.');
 const worst=rows.slice().sort((a,b)=>Math.min(pct(a.lead_actual,a.wa_target),pct(a.handover_actual,a.handover_target),pct(a.unit_actual,a.closing_target),pct(a.profit_actual,a.profit_target))-Math.min(pct(b.lead_actual,b.wa_target),pct(b.handover_actual,b.handover_target),pct(b.unit_actual,b.closing_target),pct(b.profit_actual,b.profit_target)))[0];
 if(worst) out.push('Mulai evaluasi di '+worst.outlet+': cek indikator dengan persentase terendah dan tetapkan target harian sampai akhir bulan.');
 if(!out.length)out.push('Seluruh indikator utama bergerak seimbang. Pertahankan aktivitas yang menghasilkan lead berkualitas, closing, dan laba; pantau kembali setiap hari.');
 return out;
}
function renderDivisions(){
 const rows=latestData?.outlets||[];
 const leads=total(rows,'lead_actual'),handover=total(rows,'handover_actual'),unit=total(rows,'unit_actual'),profit=total(rows,'profit_actual');
 const divisions=[
  {id:'hello',name:'Divisi Hello',sub:'Promotion',icon:'📣',desc:'Lead baru, WA masuk, konten, dan kualitas lead.',stats:[['Lead baru',leads,total(rows,'wa_target'),'num']]},
  {id:'majesty',name:'Divisi Majesty',sub:'Sales',icon:'🛍️',desc:'Closing, unit terjual, dan laba outlet.',stats:[['Unit terjual',unit,total(rows,'closing_target'),'num'],['Laba aktual',profit,total(rows,'profit_target'),'money']]},
  {id:'refill',name:'Divisi Refill',sub:'Finance & Administration',icon:'⚙️',desc:'CS, handover, administrasi, Accurate, dan Management System termasuk aplikasi Hello Majesty.',stats:[['Handover CS',handover,total(rows,'handover_target'),'num']]}
 ];
 const detail=activeDivision?divisions.find(d=>d.id===activeDivision):null;
 const outletTable=(items)=>'<div class="hm-kd-table-wrap"><table class="hm-kd-table"><thead><tr><th>Outlet</th><th>Target</th><th>Aktual</th><th>Pencapaian</th><th>Kekurangan</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.outlet)+'</td><td>'+x.fmt(x.target)+'</td><td>'+x.fmt(x.actual)+'</td><td><b>'+pct(x.actual,x.target)+'%</b></td><td>'+x.fmt(safe(x.actual,x.target))+'</td></tr>').join('')+'</tbody></table></div>';
 let html='<div class="hm-kd-head"><div><div class="hm-kd-eyebrow">HELLO MAJESTY · MONITORING BERSAMA</div><h2>Kinerja Divisi</h2><p>Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'})+'</p></div><button class="secondary" type="button" onclick="window.hmOpenKinerjaDivisi()">↻ Refresh</button></div>';
 if(detail){
  html+='<button class="secondary hm-kd-back" type="button" onclick="window.hmKinerjaDivision('')">← Ringkasan seluruh divisi</button><div class="hm-kd-section-title">'+detail.icon+' '+detail.name+' <span>'+detail.sub+'</span></div><p>'+detail.desc+'</p>';
  const specs=detail.id==='hello'?[['Lead baru / WA masuk','lead_actual','wa_target','num']]:detail.id==='majesty'?[['Unit terjual','unit_actual','closing_target','num'],['Laba aktual','profit_actual','profit_target','money']]:[['Handover CS','handover_actual','handover_target','num'],['Closing dari lead','lead_closing_actual','closing_target','num']];
  specs.forEach(sp=>{const items=rows.map(r=>({outlet:r.outlet,actual:Number(r[sp[1]]||0),target:Number(r[sp[2]]||0),fmt:sp[3]==='money'?rp:num}));html+='<div class="hm-kd-panel"><h3>'+sp[0]+'</h3>'+outletTable(items)+'</div>';});
  if(detail.id==='refill') html+='<div class="hm-kd-note">CS berada di bawah Divisi Refill. Data handover dan closing lead ditampilkan dari catatan lead; kontrol finance, Accurate, dan stabilitas aplikasi perlu dievaluasi dari laporan operasional masing-masing.</div>';
 }else{
  const totalTarget={wa_target:total(rows,'wa_target'),lead_actual:leads,handover_target:total(rows,'handover_target'),handover_actual:handover,closing_target:total(rows,'closing_target'),unit_actual:unit,profit_target:total(rows,'profit_target'),profit_actual:profit};
  html+='<div class="hm-kd-summary"><div><span>Outlet dipantau</span><b>'+num(rows.length)+'</b></div><div><span>Rata-rata pencapaian lead</span><b>'+avg(rows,'lead_actual','wa_target')+'%</b><small>Lead baru · outlet</small></div><div><span>Rata-rata pencapaian handover</span><b>'+avg(rows,'handover_actual','handover_target')+'%</b><small>Handover · outlet</small></div><div><span>Rata-rata pencapaian closing</span><b>'+avg(rows,'lead_closing_actual','closing_target')+'%</b><small>Closing lead · outlet</small></div><div><span>Rata-rata pencapaian unit</span><b>'+avg(rows,'unit_actual','closing_target')+'%</b><small>Unit terjual · outlet</small></div><div><span>Rata-rata pencapaian laba</span><b>'+avg(rows,'profit_actual','profit_target')+'%</b><small>Laba aktual · outlet</small></div></div>';
  html+='<div class="hm-kd-panel"><h3>Target Hasil</h3><div class="hm-kd-grid">'+metric('Unit terjual',unit,totalTarget.closing_target,'num')+metric('Nominal laba',profit,totalTarget.profit_target,'money')+'</div></div>';
  html+='<div class="hm-kd-panel"><h3>Target Proses</h3><div class="hm-kd-grid">'+metric('Lead baru / WA masuk',leads,totalTarget.wa_target,'num')+metric('Handover ke CS/Sales',handover,totalTarget.handover_target,'num')+metric('Closing dari lead',total(rows,'lead_closing_actual'),totalTarget.closing_target,'num')+'</div></div>';
  html+='<div class="hm-kd-panel"><h3>Pencapaian per Outlet</h3><div class="hm-kd-table-wrap"><table class="hm-kd-table"><thead><tr><th>Outlet</th><th>Lead %</th><th>Handover %</th><th>Unit %</th><th>Laba %</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.outlet)+'</td><td>'+pct(r.lead_actual,r.wa_target)+'%<small>Kurang '+num(safe(r.lead_actual,r.wa_target))+'</small></td><td>'+pct(r.handover_actual,r.handover_target)+'%<small>Kurang '+num(safe(r.handover_actual,r.handover_target))+'</small></td><td>'+pct(r.unit_actual,r.closing_target)+'%<small>Kurang '+num(safe(r.unit_actual,r.closing_target))+'</small></td><td>'+pct(r.profit_actual,r.profit_target)+'%<small>Kurang '+rp(safe(r.profit_actual,r.profit_target))+'</small></td></tr>').join('')+'</tbody></table></div></div>';
  html+='<div class="hm-kd-panel"><h3>Analisis AI · Prioritas Tindakan</h3><ol class="hm-kd-advice">'+advice(rows,totalTarget).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p class="hm-kd-note">Rekomendasi otomatis berdasarkan selisih indikator aktual dan target. Gunakan sebagai bahan evaluasi tim, bukan pengganti pemeriksaan data.</p></div>';
  html+='<div class="hm-kd-panel"><h3>Masuk ke Detail Divisi</h3><div class="hm-kd-divisions">'+divisions.map(d=>'<button type="button" class="hm-kd-division" onclick="window.hmKinerjaDivision(\''+d.id+'\')"><b>'+d.icon+' '+d.name+'</b><span>'+d.sub+'</span><small>'+d.desc+'</small></button>').join('')+'</div></div>';
 }
 const host=$('hmKinerjaDivisiPanel');
 if(host)host.innerHTML=html;
}
window.hmKinerjaDivision=id=>{activeDivision=String(id||'');renderDivisions();};
window.hmOpenKinerjaDivisi=async function(){
 const panel=$('hmMenuPanel'),body=$('hmMenuPanelBody'),title=$('hmMenuPanelTitle');
 if(!panel||!body){alert('Panel menu belum siap.');return;}
 if(title)title.textContent='📊 Kinerja Divisi';
 body.innerHTML='<div class="box">Memuat target dan pencapaian seluruh outlet…</div>';
 panel.classList.remove('hidden');
 const old=$('hmKinerjaDivisiPanel');if(old)old.remove();
 const host=document.createElement('div');host.id='hmKinerjaDivisiPanel';body.appendChild(host);
 try{
  const result=await (typeof sb!=='undefined' ? sb.rpc('kinerja_divisi_summary') : Promise.resolve(null));
  if(!result)throw new Error('Koneksi database belum siap.');
  if(result.error)throw result.error;
  latestData=result.data||{};
  if(!Array.isArray(latestData.outlets)||!latestData.outlets.length)throw new Error('Belum ada target aktif untuk bulan ini.');
  renderDivisions();
 }catch(e){host.innerHTML='<div class="box" style="color:#b42318"><b>Kinerja Divisi gagal dimuat</b><p>'+esc(e?.message||e)+'</p><button class="secondary" onclick="window.hmOpenKinerjaDivisi()">Coba lagi</button></div>';}
 if($('modal'))$('modal').classList.add('hidden');
 panel.scrollIntoView({behavior:'smooth',block:'start'});
};
})();