/* Hello Majesty — Kinerja Divisi dashboard */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const rp = n => 'Rp'+Math.round(Number(n||0)).toLocaleString('id-ID');
const num = n => Number(n||0).toLocaleString('id-ID');
const pct = (a,t) => Number(t)>0 ? Math.round(Number(a||0)/Number(t)*100) : 0;
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe = (n,t) => Math.max(0,Number(t||0)-Number(n||0));
let latestData=null, activeDivision='', lastUpdatedAt=null, refreshTimer=null, refreshBusy=false;

function metric(label,actual,target,format){
 const f=format==='money'?rp:num, p=pct(actual,target);
 const rows=latestData?.outlets||[], count=Math.max(1,rows.length); return '<div class="hm-kd-metric"><div class="hm-kd-label">'+label+'</div><strong>'+f(actual)+' <span>/ '+f(target)+'</span></strong><div class="hm-kd-bar"><i style="width:'+Math.min(100,p)+'%"></i></div><div class="hm-kd-foot">'+p+'% tercapai · kurang '+f(safe(actual,target))+'</div><div class="hm-kd-foot">Rata-rata/outlet: '+f(Number(actual||0)/count)+' aktual · '+f(Number(target||0)/count)+' target</div></div>';
}
function total(rows,a){return rows.reduce((s,r)=>s+Number(r[a]||0),0)}
function avg(rows,a,t){return rows.length?Math.round(rows.reduce((s,r)=>s+pct(r[a],r[t]),0)/rows.length):0}
function monthPace(monthStart){
 const d=new Date(),start=new Date(monthStart+'T12:00:00'),days=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
 const elapsed=Math.min(days,d.getDate()),remaining=Math.max(0,days-elapsed);
 return {days,elapsed,remaining,ratio:elapsed/days};
}
function paceLine(actual,target,pace){
 const expected=Number(target||0)*pace.ratio, gap=Math.max(0,Math.ceil(expected-Number(actual||0)));
 if(Number(actual||0)>=expected)return 'Di atas laju minimum bulan berjalan; tetap pantau kualitas dan laba.';
 return 'Tertinggal sekitar '+num(gap)+' dari laju yang seharusnya sudah dicapai hari ini.';
}
function advice(rows, totals){
 const out=[],pace=monthPace(latestData?.month_start);
 const leadPct=pct(totals.lead_actual,totals.wa_target), handPct=pct(totals.handover_actual,totals.handover_target), closePct=pct(totals.unit_actual,totals.closing_target), profitPct=pct(totals.profit_actual,totals.profit_target);
 if(leadPct<Math.round(pace.ratio*100)) out.push('PRIORITAS HELLO: lead '+leadPct+'% dari target, sedangkan waktu bulan berjalan sudah '+Math.round(pace.ratio*100)+'%. '+paceLine(totals.lead_actual,totals.wa_target,pace)+' Perbanyak konten dengan CTA WhatsApp dan ukur lead valid per sumber.');
 if(handPct<leadPct) out.push('PRIORITAS REFILL: handover '+handPct+'% tertinggal dari lead '+leadPct+'%. Audit antrean, kecepatan respons, kelengkapan kualifikasi, PIC, dan jadwal follow-up.');
 if(closePct<handPct) out.push('PRIORITAS MAJESTY: unit '+closePct+'% tertinggal dari handover '+handPct+'%. Tinjau lead potensial, waktu respons Sales, stok yang cocok, penawaran, dan alasan lost.');
 if(profitPct<closePct) out.push('PERLINDUNGAN LABA: laba '+profitPct+'% tertinggal dari unit '+closePct+'%. Audit margin, diskon, biaya finance/tarik tunai, dan transaksi bermargin rendah sebelum mendorong volume.');
 const metrics=[['Lead',r=>pct(r.lead_actual,r.wa_target)],['Handover',r=>pct(r.handover_actual,r.handover_target)],['Unit',r=>pct(r.unit_actual,r.closing_target)],['Laba',r=>pct(r.profit_actual,r.profit_target)]];
 const ranking=rows.flatMap(r=>metrics.map(([label,fn])=>({outlet:r.outlet,label,p:fn(r)}))).sort((a,b)=>a.p-b.p);
 if(ranking[0])out.push('KEPUTUSAN MANAGEMENT: mulai dari '+ranking[0].outlet+' — indikator '+ranking[0].label+' baru '+ranking[0].p+'% dari target. Tetapkan PIC, tindakan harian, dan tenggat; periksa kembali pada refresh berikutnya.');
 if(!out.length)out.push('Indikator utama tidak menunjukkan ketertinggalan relatif yang terdeteksi. Pastikan kualitas lead, laba per unit, dan validitas data tetap terjaga; angka agregat saja belum membuktikan seluruh proses sehat.');
 return out;
}
function divisionAdvice(id,rows){
 const items=[]; const sum=k=>total(rows,k);
 const leadA=sum('lead_actual'),leadT=sum('wa_target'),handoverA=sum('handover_actual'),handoverT=sum('handover_target'),unitA=sum('unit_actual'),unitT=sum('closing_target'),profitA=sum('profit_actual'),profitT=sum('profit_target'),closingA=sum('lead_closing_actual');
 const add=(priority,title,detail,actions)=>items.push({priority,title,detail,actions});
 if(id==='hello'){
  const p=pct(leadA,leadT),gap=safe(leadA,leadT);
  add(p<50?'Kritis':p<80?'Perlu dikejar':'Pantau','Pintu masuk lead adalah tanggung jawab utama Divisi Hello','Lead/WA masuk '+num(leadA)+' dari target '+num(leadT)+' ('+p+'%). '+(gap?'Masih kurang '+num(gap)+' lead untuk mencapai target.':'Target lead tercapai; jaga konsistensi volume dan kualitas.'),['Prioritaskan konten dengan CTA jelas ke WhatsApp, bukan tayangan semata.','Catat sumber lead per konten/host agar terlihat konten yang menghasilkan chat.','Pantau harian WA masuk, lead valid, dan lead yang berhasil diteruskan.']);
  if(pct(handoverA,handoverT)<p)add('Bocor di funnel','Pastikan lead yang dihasilkan ditindaklanjuti','Pencapaian handover '+pct(handoverA,handoverT)+'% dibanding lead '+p+'%; periksa agar peluang tidak berhenti di inbox.',['Selaraskan definisi lead valid dengan Divisi Refill.','Review lead yang belum direspons atau belum diserahkan; jangan mengukur sukses hanya dari views.']);
  add('Kolaborasi','Serahkan konteks lead yang lengkap','Lead perlu memiliki sumber konten, kebutuhan awal, produk yang dicari, dan kontak yang dapat dihubungi.',['Gunakan format handover seragam dan minta umpan balik Refill tentang kualitas lead.']);
 }else if(id==='majesty'){
  const up=pct(unitA,unitT),pp=pct(profitA,profitT);
  add(up<50?'Kritis':up<80?'Perlu dikejar':'Pantau','Fokus pada konversi sampai unit terjual','Unit terjual '+num(unitA)+' dari target '+num(unitT)+' ('+up+'%). Closing lead '+num(closingA)+'; pencapaian laba '+pp+'%.',['Audit lead potensial yang belum closing dan tetapkan follow-up berikutnya per PIC.','Periksa respons Sales, kecocokan produk, stok, keberatan harga, dan alasan lost.','Review harian konsultasi → penawaran → follow-up → closing.']);
  if(pp<up)add('Perhatian margin','Laba tertinggal dari unit','Pencapaian laba ('+pp+'%) di bawah pencapaian unit ('+up+'%).',['Tinjau margin per transaksi, diskon, biaya finance/tarik tunai, dan komposisi produk.','Jangan mengejar unit dengan mengorbankan laba tanpa persetujuan Management.']);
  add('Kolaborasi','Berikan umpan balik ke Hello dan Refill','Alasan gagal closing membantu memperbaiki kualitas lead dan handover.',['Catat alasan lost secara konsisten dan laporkan produk/pertanyaan yang sering dicari customer.']);
 }else{
  const hp=pct(handoverA,handoverT),lp=pct(leadA,leadT);
  add(hp<50?'Kritis':hp<80?'Perlu dikejar':'Pantau','Jaga kecepatan respons dan kelengkapan handover','Handover '+num(handoverA)+' dari target '+num(handoverT)+' ('+hp+'%). Lead masuk '+num(leadA)+' dan closing lead '+num(closingA)+'.',['Pantau lead belum direspons, belum dikualifikasi, atau belum memiliki PIC dan jadwal follow-up.','Pastikan handover menyertakan kebutuhan customer, sumber lead, produk, status, dan langkah berikutnya.','Audit sampel percakapan untuk menemukan keterlambatan respons dan alasan lead berhenti.']);
  add('Kontrol data','Pastikan data operasional bisa dipercaya','Indikator ini mencakup lead/handover; finance, rekonsiliasi Accurate, dan stabilitas aplikasi perlu dicocokkan dengan laporan operasional masing-masing.',['Cocokkan transaksi dan akun kas Accurate yang belum tersinkron, lalu catat selisih dan penanggung jawabnya.','Catat error aplikasi beserta waktu, menu, langkah reproduksi, dan screenshot; jangan mengubah transaksi tanpa verifikasi.']);
  if(hp<lp)add('Bocor di funnel','Handover tertinggal dari volume lead','Pencapaian handover '+hp+'% lebih rendah daripada lead '+lp+'%; periksa antrean dan disiplin follow-up.',['Buat daftar lead tanpa status/PIC dan tetapkan pemilik serta tenggat tindak lanjut.']);
 } return items;
}
function renderDivisionAnalysis(id,rows){
 const list=divisionAdvice(id,rows);
 return '<div class="hm-kd-panel hm-kd-ai-analysis"><h3>🤖 Analisis AI Divisi · Prioritas Tindakan</h3><p class="hm-kd-note">Analisis otomatis berdasarkan target dan pencapaian yang tersedia; validasi penyebab melalui laporan operasional terkait.</p><div class="hm-kd-ai-list">'+list.map((x,i)=>'<article class="hm-kd-ai-item"><div class="hm-kd-ai-kicker">'+esc(x.priority)+'</div><h4>'+(i+1)+'. '+esc(x.title)+'</h4><p>'+esc(x.detail)+'</p><b>Tindakan yang disarankan</b><ul>'+x.actions.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul></article>').join('')+'</div></div>';
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
  html+='<button class="secondary hm-kd-back" type="button" onclick="window.hmKinerjaDivision(&quot;&quot;)">← Ringkasan seluruh divisi</button><div class="hm-kd-section-title">'+detail.icon+' '+detail.name+' <span>'+detail.sub+'</span></div><p>'+detail.desc+'</p>';
  const specs=detail.id==='hello'?[['Lead baru / WA masuk','lead_actual','wa_target','num']]:detail.id==='majesty'?[['Unit terjual','unit_actual','closing_target','num'],['Laba aktual','profit_actual','profit_target','money']]:[['Handover CS','handover_actual','handover_target','num'],['Closing dari lead','lead_closing_actual','closing_target','num']];
  specs.forEach(sp=>{const items=rows.map(r=>({outlet:r.outlet,actual:Number(r[sp[1]]||0),target:Number(r[sp[2]]||0),fmt:sp[3]==='money'?rp:num}));html+='<div class="hm-kd-panel"><h3>'+sp[0]+'</h3>'+outletTable(items)+'</div>';});
  if(detail.id==='refill') html+='<div class="hm-kd-note">CS berada di bawah Divisi Refill. Data handover dan closing lead ditampilkan dari catatan lead; kontrol finance, Accurate, dan stabilitas aplikasi perlu dievaluasi dari laporan operasional masing-masing.</div>';
  html+=renderDivisionAnalysis(detail.id,rows);
 }else{
  const totalTarget={wa_target:total(rows,'wa_target'),lead_actual:leads,handover_target:total(rows,'handover_target'),handover_actual:handover,closing_target:total(rows,'closing_target'),unit_actual:unit,profit_target:total(rows,'profit_target'),profit_actual:profit};
  html+='<div class="hm-kd-summary"><div><span>Outlet dipantau</span><b>'+num(rows.length)+'</b></div><div><span>Rata-rata pencapaian lead</span><b>'+avg(rows,'lead_actual','wa_target')+'%</b><small>Lead baru · outlet</small></div><div><span>Rata-rata pencapaian handover</span><b>'+avg(rows,'handover_actual','handover_target')+'%</b><small>Handover · outlet</small></div><div><span>Rata-rata pencapaian closing</span><b>'+avg(rows,'lead_closing_actual','closing_target')+'%</b><small>Closing lead · outlet</small></div><div><span>Rata-rata pencapaian unit</span><b>'+avg(rows,'unit_actual','closing_target')+'%</b><small>Unit terjual · outlet</small></div><div><span>Rata-rata pencapaian laba</span><b>'+avg(rows,'profit_actual','profit_target')+'%</b><small>Laba aktual · outlet</small></div></div>';
  const pace=monthPace(latestData.month_start);
  html+='<div class="hm-kd-panel hm-kd-ai-analysis"><h3>🎯 Arah & Keputusan Management</h3><p class="hm-kd-note">Bulan berjalan: hari '+pace.elapsed+' dari '+pace.days+' · Sisa '+pace.remaining+' hari. Analisis dihitung ulang dari data terbaru saat menu dibuka, di-refresh, dan pembaruan otomatis.</p><ol class="hm-kd-advice">'+advice(rows,totalTarget).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p class="hm-kd-note">Gunakan rekomendasi sebagai agenda keputusan: tetapkan PIC, tindakan, tenggat, lalu verifikasi hasilnya. Sistem belum mencatat keputusan atau PIC otomatis.</p></div>';
  html+='<div class="hm-kd-panel"><h3>Target Hasil</h3><div class="hm-kd-grid">'+metric('Unit terjual',unit,totalTarget.closing_target,'num')+metric('Nominal laba',profit,totalTarget.profit_target,'money')+'</div></div>';
  html+='<div class="hm-kd-panel"><h3>Target Proses</h3><div class="hm-kd-grid">'+metric('Lead baru / WA masuk',leads,totalTarget.wa_target,'num')+metric('Handover ke CS/Sales',handover,totalTarget.handover_target,'num')+metric('Closing dari lead',total(rows,'lead_closing_actual'),totalTarget.closing_target,'num')+'</div></div>';
  html+='<div class="hm-kd-panel"><h3>Pencapaian per Outlet</h3><div class="hm-kd-table-wrap"><table class="hm-kd-table"><thead><tr><th>Outlet</th><th>Lead %</th><th>Handover %</th><th>Unit %</th><th>Laba %</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.outlet)+'</td><td>'+pct(r.lead_actual,r.wa_target)+'%<small>Kurang '+num(safe(r.lead_actual,r.wa_target))+'</small></td><td>'+pct(r.handover_actual,r.handover_target)+'%<small>Kurang '+num(safe(r.handover_actual,r.handover_target))+'</small></td><td>'+pct(r.unit_actual,r.closing_target)+'%<small>Kurang '+num(safe(r.unit_actual,r.closing_target))+'</small></td><td>'+pct(r.profit_actual,r.profit_target)+'%<small>Kurang '+rp(safe(r.profit_actual,r.profit_target))+'</small></td></tr>').join('')+'</tbody></table></div></div>';
  html+='<div class="hm-kd-panel"><h3>Analisis AI · Prioritas Tindakan</h3><ol class="hm-kd-advice">'+advice(rows,totalTarget).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p class="hm-kd-note">Rekomendasi otomatis berdasarkan selisih indikator aktual dan target. Gunakan sebagai bahan evaluasi tim, bukan pengganti pemeriksaan data.</p></div>';
 }
 html=html.replace('Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'}), 'Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'})+' · Diperbarui '+(lastUpdatedAt?lastUpdatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'));
 html=html.replace('Analisis AI · Prioritas Tindakan','Analisis Otomatis · Prioritas Tindakan');
 const host=$('hmKinerjaDivisiPanel');
 if(host)host.innerHTML=html;
}
window.hmKinerjaDivision=id=>{activeDivision=String(id||'');renderDivisions();};
window.hmRefreshKinerjaDivisi=async function(){
 if(refreshBusy)return;
 refreshBusy=true;
 const host=$('hmKinerjaDivisiPanel');
 try{
  const result=await (typeof sb!=='undefined' ? sb.rpc('kinerja_divisi_summary') : Promise.resolve(null));
  if(!result)throw new Error('Koneksi database belum siap.');
  if(result.error)throw result.error;
  const data=result.data||{};
  if(!Array.isArray(data.outlets)||!data.outlets.length)throw new Error('Belum ada target aktif untuk bulan ini.');
  latestData=data;lastUpdatedAt=new Date();
  renderDivisions();
 }catch(e){
  if(host&&!latestData)host.innerHTML='<div class="box" style="color:#b42318"><b>Kinerja Divisi gagal dimuat</b><p>'+esc(e?.message||e)+'</p><button class="secondary" onclick="window.hmRefreshKinerjaDivisi()">Coba lagi</button></div>';
  else if(host){const note=document.createElement('p');note.className='hm-kd-note';note.textContent='Pembaruan gagal: '+(e?.message||e)+'. Data terakhir tetap ditampilkan.';host.appendChild(note);}
 }finally{refreshBusy=false;}
};
window.hmOpenKinerjaDivision=async function(id){await window.hmOpenKinerjaDivisi();window.hmKinerjaDivision(id);};
window.hmOpenKinerjaDivisi=async function(){
 const panel=$('hmMenuPanel'),body=$('hmMenuPanelBody'),title=$('hmMenuPanelTitle');
 if(!panel||!body){alert('Panel menu belum siap.');return;}
 if(title)title.textContent='📊 Kinerja Divisi';
 panel.classList.remove('hidden');
 if(!$('hmKinerjaDivisiPanel')){const host=document.createElement('div');host.id='hmKinerjaDivisiPanel';body.appendChild(host);}
 const host=$('hmKinerjaDivisiPanel');
 if(!latestData)host.innerHTML='<div class="box">Memuat target dan pencapaian seluruh outlet…</div>';
 await window.hmRefreshKinerjaDivisi();
 if($('modal'))$('modal').classList.add('hidden');
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 if(refreshTimer)clearInterval(refreshTimer);
 refreshTimer=setInterval(()=>{
  const p=$('hmMenuPanel');
  if(p&&!p.classList.contains('hidden'))window.hmRefreshKinerjaDivisi();
 },60000);
};
})();