/* Hello Majesty — Kinerja Divisi dashboard */
/* Share target progress to WhatsApp for Division role only */
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
 const now=new Date(), parsed=monthStart?new Date(monthStart+'T12:00:00'):new Date(NaN);
 if(Number.isNaN(parsed.getTime()))return {days:0,elapsed:0,remaining:0,ratio:0,valid:false};
 const days=new Date(parsed.getFullYear(),parsed.getMonth()+1,0).getDate();
 const sameMonth=now.getFullYear()===parsed.getFullYear()&&now.getMonth()===parsed.getMonth();
 const elapsed=sameMonth?Math.min(days,now.getDate()):now>parsed?days:0;
 const remaining=Math.max(0,days-elapsed);
 return {days,elapsed,remaining,ratio:days?elapsed/days:0,valid:true};
}
function paceLine(actual,target,pace){
 const expected=Number(target||0)*pace.ratio, gap=Math.max(0,Math.ceil(expected-Number(actual||0)));
 if(Number(actual||0)>=expected)return 'Di atas laju minimum bulan berjalan; tetap pantau kualitas dan laba.';
 return 'Tertinggal sekitar '+num(gap)+' dari laju yang seharusnya sudah dicapai hari ini.';
}
function advice(rows, totals){
 const out=[],pace=monthPace(latestData?.month_start), pacePct=Math.round(pace.ratio*100);
 const leadPct=pct(totals.lead_actual,totals.wa_target), handPct=pct(totals.handover_actual,totals.handover_target), closePct=pct(totals.unit_actual,totals.closing_target), profitPct=pct(totals.profit_actual,totals.profit_target);
 const gap=(a,t)=>Math.max(0,Number(t||0)-Number(a||0));
 const val=(a,t)=>num(a)+'/'+num(t)+' ('+pct(a,t)+'%)';
 out.push('RINGKASAN EKSEKUTIF: Lead/WA '+val(totals.lead_actual,totals.wa_target)+', Handover CS '+val(totals.handover_actual,totals.handover_target)+', Sales Closing '+val(totals.unit_actual,totals.closing_target)+', laba '+val(totals.profit_actual,totals.profit_target)+'. Laju waktu bulan berjalan '+pacePct+'%. CS Closing dari lead adalah indikator terpisah dan tidak boleh disamakan dengan unit Sales Closing.');
 if(!pace.valid)out.push('VALIDASI PERIODE: tanggal periode belum dapat dipastikan; jangan menilai ketertinggalan berdasarkan laju bulan sebelum tanggal diperiksa.');
 out.push('1. DIVISI HELLO — LEAD BERKUALITAS: '+val(totals.lead_actual,totals.wa_target)+', kekurangan '+num(gap(totals.lead_actual,totals.wa_target))+' dari target. Arahkan konten ke materi produk/penawaran dengan CTA WhatsApp. Tinjau hasil berdasarkan lead valid per sumber, bukan tayangan saja. Ukur lead valid dan handover yang bisa ditelusuri; hentikan atau ubah format yang tidak menghasilkan lead berkualitas.');
 out.push('2. DIVISI REFILL — HANDOVER & KENDALI PROSES: '+val(totals.handover_actual,totals.handover_target)+', kekurangan '+num(gap(totals.handover_actual,totals.handover_target))+' handover. Prioritaskan antrean lead yang belum memiliki handover valid; pastikan CS, Sales, dan waktu handover tercatat. Review harian berdasarkan status, umur lead, dan PIC. Service boleh masuk hitungan handover bila valid, tetapi bukan Sales Closing.');
 out.push('3. DIVISI MAJESTY — KONVERSI PENJUALAN: '+val(totals.unit_actual,totals.closing_target)+', kekurangan '+num(gap(totals.unit_actual,totals.closing_target))+' unit. Fokus pada lead potensial, tindak lanjut terjadwal, kecocokan stok dan status setiap peluang. Review alasan lost hanya berdasarkan catatan yang tersedia. Closing unit harus didukung transaksi penjualan yang sah, bukan status lead semata.');
 out.push('4. PERLINDUNGAN LABA: pencapaian laba '+profitPct+'% dibanding pencapaian unit '+closePct+'%. Ini adalah perbedaan pencapaian target, bukan bukti penyebab. Periksa margin per unit, diskon, biaya finance/tarik tunai dan biaya terkait sebelum mendorong volume. Jangan menyatakan ada transaksi bermargin rendah tanpa audit transaksi.');
 const ranking=rows.flatMap(r=>[['Lead',r.lead_actual,r.wa_target],['Handover CS',r.handover_actual,r.handover_target],['Sales Closing (unit)',r.unit_actual,r.closing_target],['Laba',r.profit_actual,r.profit_target]].map(([label,a,t])=>({outlet:r.outlet,label,p:pct(a,t),actual:Number(a||0),target:Number(t||0)}))).sort((a,b)=>a.p-b.p);
 if(ranking[0])out.push('5. URUTAN PEMERIKSAAN MANAGEMENT: indikator dengan persentase terendah pada data saat ini adalah '+ranking[0].label+' di '+ranking[0].outlet+' ('+ranking[0].p+'%; '+num(ranking[0].actual)+'/'+num(ranking[0].target)+'). Jadikan titik awal audit, bukan kesimpulan penyebab. Management menetapkan PIC dan tenggat; bandingkan hasil pada refresh berikutnya.');
 out.push('6. VERIFIKASI & TINDAK LANJUT: ringkasan KPI tidak membuktikan penyebab lost, isi percakapan pelanggan, status pencairan finance, atau rekonsiliasi Accurate. Verifikasi sumber terkait sebelum keputusan finansial. Catat PIC, tenggat, bukti sebelum/sesudah, dan hasil aktual; sistem tidak boleh menganggap keputusan sudah dibuat.');
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
function dataQuality(rows){
 const checks=[];
 if(!rows.length)checks.push({level:'Kritis',title:'Tidak ada outlet dalam ringkasan',detail:'Jangan menilai kinerja sampai target dan sumber data tersedia.'});
 rows.forEach(r=>{
  const name=String(r.outlet||'Outlet tanpa nama');
  [['target lead',r.wa_target],['target handover',r.handover_target],['target closing',r.closing_target],['target laba',r.profit_target]].forEach(([label,v])=>{
   if(v===null||v===undefined||v==='')checks.push({level:'Periksa',title:name+': '+label+' kosong',detail:'Pencapaian indikator ini tidak dapat dinilai secara andal.'});
  });
  if(['wa_target','handover_target','closing_target','profit_target'].some(k=>Number(r[k]||0)===0))
   checks.push({level:'Periksa',title:name+': ada target nol',detail:'Pastikan target nol memang disengaja; jika tidak, persentase dapat menyesatkan.'});
  if(Number(r.lead_actual||0)<Number(r.handover_actual||0))
   checks.push({level:'Validasi',title:name+': handover melebihi lead baru',detail:'Periksa definisi periode dan asal lead sebelum menyimpulkan funnel bermasalah.'});
  if(Number(r.unit_actual||0)>0&&Number(r.profit_actual||0)===0)
   checks.push({level:'Validasi',title:name+': unit terjual tetapi laba tercatat nol',detail:'Periksa nilai laba transaksi dan konsistensi periode laporan.'});
 });
 if(!checks.length)checks.push({level:'Awal',title:'Pemeriksaan dasar tidak menemukan anomali umum',detail:'Ini bukan audit penuh; rekonsiliasi transaksi dan Accurate tetap diperlukan.'});
 return checks;
}
function renderDataQuality(rows){
 const checks=dataQuality(rows);
 return '<div class="hm-kd-panel hm-kd-quality"><h3>🛡️ Pemeriksaan Kualitas Data</h3><p class="hm-kd-note">Peringatan berbasis pemeriksaan sederhana, bukan bukti bahwa data pasti benar atau salah.</p><div class="hm-kd-quality-list">'+checks.map(x=>'<article><span class="hm-kd-quality-tag">'+esc(x.level)+'</span><div><b>'+esc(x.title)+'</b><p>'+esc(x.detail)+'</p></div></article>').join('')+'</div></div>';
}
function decisionBookAllowed(){
 const p=typeof profile!=='undefined'?profile:null;
 const roles=typeof getActiveRoles==='function'?getActiveRoles():[];
 return !!p&&(!!p.is_management||String(p.role||'').toUpperCase().includes('MANAGEMENT')||roles.includes('MANAGEMENT'));
}
function decisionDivisionLabel(v){return ({hello:'Divisi Hello',majesty:'Divisi Majesty',refill:'Divisi Refill',cross_division:'Lintas Divisi'})[v]||v;}
function decisionStatusLabel(v){return ({open:'Belum dimulai',in_progress:'Sedang dikerjakan',blocked:'Terhambat',completed:'Selesai · menunggu verifikasi',verified:'Terverifikasi'})[v]||v;}
function renderDecisionRows(rows){
 if(!rows.length)return '<p class="hm-kd-note">Belum ada keputusan tersimpan. Tambahkan masalah prioritas pertama setelah data dan buktinya diperiksa.</p>';
 return '<div class="hm-kd-decision-list">'+rows.map(r=>'<article class="hm-kd-decision"><div class="hm-kd-decision-top"><span class="hm-kd-decision-priority '+esc(r.priority)+'">'+esc(String(r.priority||'medium').toUpperCase())+'</span><span class="hm-kd-decision-status">'+esc(decisionStatusLabel(r.status))+'</span></div><h4>'+esc(r.title)+'</h4><p class="hm-kd-note">'+esc(decisionDivisionLabel(r.division))+' · PIC: '+esc(r.owner_name)+' · Tenggat: '+esc(r.due_date)+'</p><p><b>Masalah:</b> '+esc(r.problem)+'</p><p><b>Bukti:</b> '+esc(r.evidence||'Belum dicatat')+'</p><p><b>Hipotesis yang perlu diuji:</b> '+esc(r.hypothesis||'Belum dicatat')+'</p><p><b>Tindakan:</b> '+esc(r.action_plan)+'</p><p><b>Ukuran berhasil:</b> '+esc(r.success_measure)+'</p>'+(r.verification_notes?'<p><b>Verifikasi:</b> '+esc(r.verification_notes)+'</p>':'')+'<div class="hm-kd-decision-controls"><select id="hmKdStatus-'+esc(r.id)+'"><option value="open" '+(r.status==='open'?'selected':'')+'>Belum dimulai</option><option value="in_progress" '+(r.status==='in_progress'?'selected':'')+'>Sedang dikerjakan</option><option value="blocked" '+(r.status==='blocked'?'selected':'')+'>Terhambat</option><option value="completed" '+(r.status==='completed'?'selected':'')+'>Selesai · menunggu verifikasi</option><option value="verified" '+(r.status==='verified'?'selected':'')+'>Terverifikasi</option></select><input id="hmKdVerify-'+esc(r.id)+'" placeholder="Catatan hasil verifikasi / hambatan" value="'+esc(r.verification_notes||'')+'"><button type="button" class="secondary" onclick="window.hmKdUpdateDecision(\''+esc(r.id)+'\')">Simpan status</button></div></article>').join('')+'</div>';
}
async function loadDecisionBook(){
 const host=$('hmKdDecisionRows');if(!host)return;
 if(!decisionBookAllowed()){host.innerHTML='<p class="hm-kd-note">Buku Keputusan hanya tersedia untuk akun Management yang berwenang.</p>';return;}
 const db=typeof sb!=='undefined'?sb:window.sb;
 if(!db){host.textContent='Koneksi database belum siap.';return;}
 host.innerHTML='<p class="hm-kd-note">Memuat keputusan tersimpan…</p>';
 const {data,error}=await db.from('management_decisions').select('*').order('due_date',{ascending:true}).order('created_at',{ascending:false}).limit(100);
 if(error){host.innerHTML='<p class="hm-kd-note">Gagal memuat Buku Keputusan: '+esc(error.message)+' · Periksa izin Management/RLS.</p>';return;}
 host.innerHTML=renderDecisionRows(data||[]);
}
window.hmKdCreateDecision=async function(){
 if(!decisionBookAllowed()){alert('Akses hanya untuk Management.');return;}
 const get=id=>String($(id)?.value||'').trim();
 const payload={title:get('hmKdTitle'),division:get('hmKdDivision'),priority:get('hmKdPriority'),problem:get('hmKdProblem'),evidence:get('hmKdEvidence'),hypothesis:get('hmKdHypothesis'),action_plan:get('hmKdAction'),owner_name:get('hmKdOwner'),due_date:get('hmKdDue'),success_measure:get('hmKdSuccess'),period_start:latestData?.month_start||new Date().toISOString().slice(0,10)};
 if(!payload.title||!payload.problem||!payload.action_plan||!payload.owner_name||!payload.due_date||!payload.success_measure){alert('Lengkapi judul, masalah, tindakan, PIC, tenggat, dan ukuran keberhasilan.');return;}
 const db=typeof sb!=='undefined'?sb:window.sb;
 const btn=$('hmKdSaveDecision');if(btn)btn.disabled=true;
 const {error}=await db.from('management_decisions').insert(payload);
 if(btn)btn.disabled=false;
 if(error){alert('Keputusan belum tersimpan: '+error.message);return;}
 ['hmKdTitle','hmKdProblem','hmKdEvidence','hmKdHypothesis','hmKdAction','hmKdOwner','hmKdDue','hmKdSuccess'].forEach(id=>{if($(id))$(id).value='';});
 await loadDecisionBook();
};
window.hmKdUpdateDecision=async function(id){
 if(!decisionBookAllowed()){alert('Akses hanya untuk Management.');return;}
 const status=$('hmKdStatus-'+id)?.value,verification_notes=String($('hmKdVerify-'+id)?.value||'').trim();
 if(status==='verified'&&!verification_notes){alert('Catatan verifikasi wajib diisi sebelum keputusan dinyatakan terverifikasi.');return;}
 const db=typeof sb!=='undefined'?sb:window.sb;
 const {error}=await db.from('management_decisions').update({status,verification_notes}).eq('id',id);
 if(error){alert('Status belum tersimpan: '+error.message);return;}
 await loadDecisionBook();
};
function renderDecisionBook(){ return ''; }
function renderDivisionAnalysis(id,rows){
 const list=divisionAdvice(id,rows);
 return '<div class="hm-kd-panel hm-kd-ai-analysis"><h3>Analisis Otomatis Divisi · Diagnosis dan Tindakan</h3><p class="hm-kd-note">Ini analisis berbasis aturan dari target dan pencapaian yang tersedia, bukan AI yang membaca seluruh percakapan/transaksi. Penyebab harus diverifikasi sebelum menetapkan kesalahan individu.</p><div class="hm-kd-ai-list">'+list.map((x,i)=>'<article class="hm-kd-ai-item"><div class="hm-kd-ai-kicker">'+esc(x.priority)+'</div><h4>'+(i+1)+'. '+esc(x.title)+'</h4><p>'+esc(x.detail)+'</p><b>Instruksi tindakan</b><ul>'+x.actions.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul><div class="hm-kd-note"><b>PIC utama:</b> '+esc(id==='hello'?'Tyar — Divisi Hello':id==='majesty'?'Wawan — Divisi Majesty':'Gagut — Divisi Refill')+' · <b>Tenggat awal:</b> hari ini, konfirmasi saat briefing berikutnya · <b>Verifikasi:</b> bandingkan angka setelah tindakan dengan data awal dan catat bukti/perubahan.</div></article>').join('')+'</div></div>';
}
function managementCommandCenter(rows,totals){
 const leadPct=pct(totals.lead_actual,totals.wa_target), handPct=pct(totals.handover_actual,totals.handover_target), unitPct=pct(totals.unit_actual,totals.closing_target), profitPct=pct(totals.profit_actual,totals.profit_target);
 const pace=monthPace(latestData?.month_start), pacePct=Math.round(pace.ratio*100);
 const plaza=rows.find(r=>String(r.outlet||'').trim().toLowerCase()==='majesty plaza iphone')||rows.find(r=>/plaza/i.test(String(r.outlet||''))&&!/refill/i.test(String(r.outlet||'')))||null;
 const refill=rows.find(r=>String(r.outlet||'').trim().toLowerCase()==='majesty refill phone')||rows.find(r=>/refill/i.test(String(r.outlet||'')))||null;
 const overallMin=Math.min(leadPct,handPct,unitPct,profitPct);
 const status=!pace.valid?'DATA PERLU DICEK':overallMin<pacePct?'PERLU TINDAKAN':overallMin<80?'WASPADA':'TERKENDALI';
 const tone=!pace.valid||overallMin<pacePct?'critical':overallMin<80?'warning':'good';
 const instructions=[
  {name:'Tyar',role:'PEMIMPIN DIVISI HELLO',color:'#0f766e',metric:'Global · Lead / WA '+num(totals.lead_actual)+'/'+num(totals.wa_target)+' ('+leadPct+'%) · Handover '+num(totals.handover_actual)+'/'+num(totals.handover_target)+' ('+handPct+'%)',text:leadPct<pacePct?'GLOBAL: lead / WA '+num(totals.lead_actual)+' dari '+num(totals.wa_target)+' ('+leadPct+'%). Tingkatkan lead valid melalui konten ber-CTA WhatsApp, telusuri sumber, dan kawal kualitas handover.':'GLOBAL: jaga kualitas lead dan bukti kontribusi konten; pastikan sumber lead tercatat dan peluang yang masuk benar-benar valid.',action:'Fokus: seluruh outlet → lead valid → handover'},
  {name:'Wawan',role:'PEMIMPIN DIVISI MAJESTY',color:'#1d4ed8',metric:'Global · Unit '+num(totals.unit_actual)+'/'+num(totals.closing_target)+' ('+unitPct+'%) · Laba '+rp(totals.profit_actual)+'/'+rp(totals.profit_target)+' ('+profitPct+'%)',text:unitPct<pacePct||profitPct<pacePct?'GLOBAL: closing '+num(totals.unit_actual)+' dari '+num(totals.closing_target)+' unit ('+unitPct+'%); laba '+rp(totals.profit_actual)+' dari target '+rp(totals.profit_target)+' ('+profitPct+'%). Pimpin seluruh outlet untuk memperbaiki konversi dan margin; evaluasi stok, diskon, serta biaya finance.':'GLOBAL: jaga konversi dan laba seluruh outlet. Audit margin, diskon, serta biaya finance sebelum mendorong penjualan tambahan.',action:'Fokus: seluruh outlet → closing → laba'},
  {name:'Gagut',role:'MANAGEMENT SYSTEM & ADMIN FINANCE',color:'#6d28d9',metric:'Global · Handover '+num(totals.handover_actual)+'/'+num(totals.handover_target)+' ('+handPct+'%) · Laba '+rp(totals.profit_actual)+'/'+rp(totals.profit_target)+' ('+profitPct+'%)',text:handPct<pacePct?'KAWAL HANDOVER GLOBAL: tercapai '+num(totals.handover_actual)+' dari target '+num(totals.handover_target)+' ('+handPct+'%). Telusuri lead yang belum dihandover, belum diklaim PIC, atau belum ditindaklanjuti; koordinasikan perbaikan dengan CS, Sales, dan pemimpin outlet. Pastikan data handover akurat, sambil menjaga kontrol settlement, kas, Accurate, dan sistem.':'KAWAL HANDOVER GLOBAL: verifikasi kelengkapan dan ketepatan handover, pastikan setiap lead diterima PIC serta memiliki tindak lanjut. Pantau selisih antar-outlet dan jaga akurasi laporan, settlement, kas, serta rekonsiliasi Accurate.',action:'Fokus: handover global → PIC & tindak lanjut → integritas sistem dan finance'}
 ];
 return '<section class="hm-kd-command"><div class="hm-kd-command-head"><div><div class="hm-kd-eyebrow">PUSAT KOMANDO · HELLO MAJESTY</div><h3>Instruksi Management Hari Ini</h3><p>Prioritas singkat untuk setiap pemimpin berdasarkan indikator target yang tersedia.</p></div><span class="hm-kd-status '+tone+'">'+status+'</span></div><div class="hm-kd-command-foot" id="hmKdAiStatus" style="margin:12px 0;padding:10px 12px;background:#eaf2ff;color:#173b75;border-radius:10px;font-size:13px;font-weight:600">Menyiapkan arahan AI berdasarkan KPI terbaru…</div><div class="hm-kd-command-grid">'+instructions.map((x,i)=>'<article class="hm-kd-command-card" data-hm-kd-division="'+esc(x.name==='Tyar'?'hello':x.name==='Wawan'?'majesty':'refill')+'" style="--leader:'+x.color+'"><div class="hm-kd-command-person"><span class="hm-kd-command-num">'+(i+1)+'</span><div><h4>'+esc(x.name)+'</h4><div class="hm-kd-command-role">'+esc(x.role)+'</div></div></div><div class="hm-kd-command-metric">'+esc(x.metric)+'</div><p>'+esc(x.text)+'</p><div class="hm-kd-command-action">'+esc(x.action)+'</div></article>').join('')+'</div></section>';
}
let hmKdAiLastFingerprint='',hmKdAiLastAt=0,hmKdAiBusy=false,hmKdAiBusyFingerprint='',hmKdAiLastResult=null,hmKdAiRunId=0;
async function enrichManagementInstructions(rows,totals){
 const host=$('hmKinerjaDivisiPanel'); if(!host||!latestData)return;
 const cards=[...host.querySelectorAll('[data-hm-kd-division]')]; if(!cards.length)return;
 const pace=monthPace(latestData?.month_start);
 const qualityChecks=dataQuality(rows);
 const missingTargets=rows.filter(r=>['wa_target','handover_target','closing_target','profit_target'].some(k=>r[k]===null||r[k]===undefined||r[k]===''||Number(r[k])<=0)).map(r=>r.outlet);
 const payload={period:latestData?.month_start||new Date().toISOString().slice(0,10),updated_at:lastUpdatedAt?.toISOString()||new Date().toISOString(),days_elapsed:pace.elapsed,days_in_month:pace.days,pace_percent:Math.round(pace.ratio*100),source_validation:{source:'public.kinerja_divisi_summary()',target_source:'monthly_outlet_targets untuk month_start aktif',outlets_returned:rows.length,missing_or_zero_target_outlets:missingTargets,quality_checks:qualityChecks.map(x=>({level:x.level,title:x.title,detail:x.detail})),note:'Persentase gabungan dihitung dari total aktual dibagi total target; bukan rata-rata persentase outlet. Jika target kosong/nol atau ada anomali, tandai sebagai belum tervalidasi dan jangan menyimpulkan kinerja.'},totals:{outlets:rows.length,lead:{actual:totals.lead_actual,target:totals.wa_target,gap:Math.max(0,Number(totals.wa_target||0)-Number(totals.lead_actual||0)),achievement_percent:pct(totals.lead_actual,totals.wa_target)},handover:{actual:totals.handover_actual,target:totals.handover_target,gap:Math.max(0,Number(totals.handover_target||0)-Number(totals.handover_actual||0)),achievement_percent:pct(totals.handover_actual,totals.handover_target)},units:{actual:totals.unit_actual,target:totals.closing_target,gap:Math.max(0,Number(totals.closing_target||0)-Number(totals.unit_actual||0)),achievement_percent:pct(totals.unit_actual,totals.closing_target)},profit:{actual:totals.profit_actual,target:totals.profit_target,gap:Math.max(0,Number(totals.profit_target||0)-Number(totals.profit_actual||0)),achievement_percent:pct(totals.profit_actual,totals.profit_target)}},outlets:rows.map(r=>({outlet:r.outlet,lead_actual:Number(r.lead_actual||0),lead_target:Number(r.wa_target||0),lead_percent:pct(r.lead_actual,r.wa_target),handover_actual:Number(r.handover_actual||0),handover_target:Number(r.handover_target||0),handover_percent:pct(r.handover_actual,r.handover_target),unit_actual:Number(r.unit_actual||0),closing_target:Number(r.closing_target||0),unit_percent:pct(r.unit_actual,r.closing_target),profit_actual:Number(r.profit_actual||0),profit_target:Number(r.profit_target||0),profit_percent:pct(r.profit_actual,r.profit_target)})),leaders:[{name:'Tyar',division:'Hello',responsibility:'Menetapkan arah promosi, konten, kualitas lead dan sumber lead; mengarahkan tim creator agar menghasilkan lead valid dan handover yang terukur.'},{name:'Wawan',division:'Majesty',responsibility:'Menetapkan prioritas penjualan, konversi lead, kecocokan stok, disiplin follow-up, unit terjual dan laba/margin.'},{name:'Gagut',division:'Refill',responsibility:'Menetapkan disiplin CS/handover, administrasi, validitas data operasional dan koordinasi rekonsiliasi Accurate berdasarkan laporan yang terverifikasi.'}],limitations:['Data ini adalah ringkasan KPI outlet; tidak memuat detail percakapan lead, penyebab lost, transaksi Accurate pending atau rekonsiliasi aktual. Jangan menyatakan hal tersebut sebagai fakta tanpa data pendukung.']};
 const fingerprint=JSON.stringify(payload); const setHmKdAiStatus=(message)=>{const node=$('hmKdAiStatus');if(node)node.textContent=message;};
 const labels={hello:'Tyar',majesty:'Wawan',refill:'Gagut'};
 const applyResult=(parsed)=>{const currentHost=$('hmKinerjaDivisiPanel');if(!currentHost)return false;let applied=0;for(const [id,name] of Object.entries(labels)){const card=currentHost.querySelector('[data-hm-kd-division="'+id+'"]'),entry=parsed?.[id];if(!card||!entry||typeof entry.message!=='string'||!entry.message.trim())continue;const p=card.querySelector('p'),action=card.querySelector('.hm-kd-command-action');if(p)p.textContent=entry.message.trim();if(action)action.textContent='Fokus: '+String(entry.focus||({hello:'konten → lead valid',majesty:'konversi → unit → laba',refill:'handover → proses → akurasi'}[id])).trim();card.setAttribute('data-hm-kd-ai','true');card.setAttribute('data-hm-kd-tone',String(entry.tone||'direction'));applied++;}return applied===3;};
 if(fingerprint===hmKdAiLastFingerprint&&hmKdAiLastResult){if(!applyResult(hmKdAiLastResult)){setHmKdAiStatus('Arahan AI tersimpan, tetapi kartu belum siap ditampilkan. Tekan Perbarui data & arahan AI.');return;}setHmKdAiStatus('Arahan AI Gemini · KPI tidak berubah; data diperiksa '+(lastUpdatedAt?lastUpdatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'saat ini')+'.');return;}
 if(hmKdAiBusy&&hmKdAiBusyFingerprint===fingerprint){setHmKdAiStatus('AI masih memproses KPI terbaru…');return;}
 const runId=++hmKdAiRunId;hmKdAiBusy=true;hmKdAiBusyFingerprint=fingerprint;setHmKdAiStatus('AI sedang merumuskan arahan berdasarkan KPI terbaru…');
 try{const db=typeof sb!=='undefined'?sb:window.sb;if(!db?.functions||typeof db.functions.invoke!=='function')throw new Error('Layanan AI belum tersedia');
 const question='Kamu adalah penasihat strategi internal untuk Management Hello Majesty. Susun arahan kepemimpinan untuk TIGA kepala divisi berdasarkan JSON KPI terbaru. Jawab JSON valid saja berbentuk {"hello":{"message":"...","focus":"...","tone":"warning|reminder|appreciation|direction"},"majesty":{"message":"...","focus":"...","tone":"warning|reminder|appreciation|direction"},"refill":{"message":"...","focus":"...","tone":"warning|reminder|appreciation|direction"}}. Setiap message maksimal 2 kalimat dan 42 kata; focus maksimal 7 kata. Bahasa Indonesia, profesional, tajam, konkret, membangun arah perusahaan. Para pemimpin divisi adalah pengambil kebijakan dan pengarah tim: arahkan pada keputusan, kontrol, pembagian prioritas, koordinasi lintas divisi dan tindak lanjut tim—bukan tugas staf biasa. PENTING: Tyar dan Wawan memimpin divisi masing-masing dengan KPI gabungan seluruh outlet. Gagut berlabel Divisi Refill, tetapi fungsi utamanya adalah Management System & Admin Finance. Ia mengawal KPI handover secara GLOBAL sebagai kontrol proses lintas outlet: pantau pencapaian handover terhadap target, cari lead yang belum diserahkan atau belum diklaim/ditindaklanjuti PIC, koordinasikan CS dan Sales untuk penyelesaian, serta jaga validitas data. Ia bukan pelaksana handover harian atau pemimpin penjualan Refill. Ia juga mengawasi laporan, settlement, kas, rekonsiliasi Accurate, dan stabilitas sistem. Rincian per outlet hanya untuk diagnosis dan tindak lanjut. Jangan menilai pemimpin global memakai persentase satu outlet. Semua angka yang ditulis harus cocok dengan payload.outlets dan totals; jangan mengarang atau mengubah angka. WAJIB sebut angka aktual/target/persentase dan kekurangan jika tersedia. Bandingkan pencapaian dengan pace_percent bulan berjalan; prioritaskan gap terbesar yang memang didukung data. Jika source_validation.missing_or_zero_target_outlets tidak kosong atau quality_checks memuat anomali, nyatakan validasi data sebagai prioritas dan jangan memberi penilaian final atas KPI yang terdampak. Ingat bahwa persentase gabungan adalah total aktual/total target, bukan rata-rata persentase outlet. Jangan menyimpulkan penyebab dari persentase semata; jangan mengarang PIC, transaksi pending, masalah Accurate, penyebab lost, target, atau pencapaian. Divisi Hello fokus promosi→WA masuk→lead valid; Majesty fokus konversi→unit closing→laba; Refill fokus handover/CS, kualitas data, pengembangan aplikasi dan kontrol finance sesuai bukti. Beri satu keputusan strategis dan tindakan terukur, minta pimpinan menetapkan PIC dan tenggat tanpa mengklaim sudah ditetapkan. DATA: '+JSON.stringify(payload);
 const result=await Promise.race([db.functions.invoke('hello-majesty-ai-gemini',{body:{question,lead:null}}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Respons AI melewati batas 35 detik. Tekan Perbarui data & arahan AI untuk mencoba lagi.')),35000))]);if(runId!==hmKdAiRunId)return;if(result?.error)throw result.error;if(result?.data?.error)throw new Error(String(result.data.error));const rawAnswer=String(result?.data?.answer||'').trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'').trim();if(!rawAnswer)throw new Error('Gemini mengembalikan jawaban kosong.');let parsed;try{parsed=JSON.parse(rawAnswer);}catch(parseError){const match=rawAnswer.match(/\{[\s\S]*\}/);if(!match)throw new Error('Jawaban AI bukan JSON yang dapat dibaca.');parsed=JSON.parse(match[0]);}
 if(!parsed.hello?.message||!parsed.majesty?.message||!parsed.refill?.message)throw new Error('Jawaban AI belum memuat instruksi lengkap untuk ketiga divisi.');
 if(!applyResult(parsed))throw new Error('Kartu instruksi berubah saat AI selesai; silakan tekan Perbarui data & arahan AI.');hmKdAiLastFingerprint=fingerprint;hmKdAiLastAt=Date.now();hmKdAiLastResult=parsed;setHmKdAiStatus('Arahan AI Gemini · berdasarkan ringkasan KPI diperbarui '+(lastUpdatedAt?lastUpdatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'saat ini')+'. Angka tidak mencakup audit transaksi Accurate.');
 }catch(e){console.warn('[HM Kinerja Divisi] Instruksi AI gagal; memakai arahan KPI otomatis:',e);if(runId===hmKdAiRunId)setHmKdAiStatus('AI belum berhasil: '+String(e?.message||e)+' Pesan kartu saat ini adalah fallback KPI.');}finally{if(runId===hmKdAiRunId){hmKdAiBusy=false;hmKdAiBusyFingerprint='';}}
}
function renderDivisions(){
 const rows=latestData?.outlets||[];
 const leads=total(rows,'lead_actual'),handover=total(rows,'handover_actual'),unit=total(rows,'unit_actual'),profit=total(rows,'profit_actual');
 const divisions=[
  {id:'hello',name:'Divisi Hello',sub:'Promotion',icon:'📣',desc:'Cakupan seluruh cabang: memimpin Promotion & Content Creator lintas cabang; mengawal strategi konten, publikasi, CTA WhatsApp, lead baru, kualitas lead, dan kontribusi tiap cabang.',stats:[['Lead baru',leads,total(rows,'wa_target'),'num']]},
  {id:'majesty',name:'Divisi Majesty',sub:'Sales',icon:'🛍️',desc:'Cakupan seluruh cabang: memimpin Sales & Penjualan lintas cabang; mengawal claim Sales, follow-up, konsultasi, closing sah, unit terjual, kualitas konversi, stok penjualan, dan laba.',stats:[['Unit terjual',unit,total(rows,'closing_target'),'num'],['Laba aktual',profit,total(rows,'profit_target'),'money']]},
  {id:'refill',name:'Divisi Refill',sub:'Finance & Administration',icon:'⚙️',desc:'Cakupan seluruh cabang: memimpin Finance & Administration serta Management System lintas cabang; mengawal respons, claim, kualifikasi, handover, follow-up, administrasi, settlement, kontrol data, Accurate baca-saja, dan sistem Hello Majesty.',stats:[['Handover CS',handover,total(rows,'handover_target'),'num']]}
 ];
 const detail=activeDivision?divisions.find(d=>d.id===activeDivision):null;
 const outletTable=(items)=>'<div class="hm-kd-table-wrap"><table class="hm-kd-table"><thead><tr><th>Outlet</th><th>Target</th><th>Aktual</th><th>Pencapaian</th><th>Kekurangan</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.outlet)+'</td><td>'+x.fmt(x.target)+'</td><td>'+x.fmt(x.actual)+'</td><td><b>'+pct(x.actual,x.target)+'%</b></td><td>'+x.fmt(safe(x.actual,x.target))+'</td></tr>').join('')+'</tbody></table></div>';
 let html='<div class="hm-kd-head"><div><div class="hm-kd-eyebrow">HELLO MAJESTY · MONITORING BERSAMA</div><h2>Kinerja Divisi</h2><p>Monitoring lintas cabang untuk seluruh kewenangan divisi; bukan berdasarkan outlet asal penanggung jawab. Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'})+'</p></div><button class="secondary" id="hmKdRefreshBtn" type="button" onclick="window.hmRefreshKinerjaDivisi()">↻ Perbarui data & arahan AI</button></div>';
 if(!detail){
  const commandTotals={wa_target:total(rows,'wa_target'),lead_actual:leads,handover_target:total(rows,'handover_target'),handover_actual:handover,closing_target:total(rows,'closing_target'),unit_actual:unit,profit_target:total(rows,'profit_target'),profit_actual:profit};
  html+=managementCommandCenter(rows,commandTotals);
  const canShareGlobal=typeof window.getActiveRoles==='function'&&window.getActiveRoles().map(x=>String(x||'').toUpperCase().replace(/_/g,' ')).includes('DIVISI');
  if(canShareGlobal)html+='<div class="hm-kd-share-wrap" style="margin:16px 0;padding:16px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc"><button type="button" class="hm-kd-share-btn" style="width:100%;padding:14px 16px;border:0;border-radius:12px;background:linear-gradient(135deg,#15803d,#047857);color:#fff;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(4,120,87,.2)" onclick="window.hmShareGlobalTarget()">📲 Bagikan Pencapaian Target ke WhatsApp</button><p class="hm-kd-note">Ringkasan global seluruh divisi: pencapaian, kekurangan target, sisa hari bulan ini, dan motivasi untuk tim.</p></div>';
 }
 if(detail){
  html+='<button class="secondary hm-kd-back" type="button" onclick="window.hmKinerjaDivision(&quot;&quot;)">← Ringkasan seluruh divisi</button><div class="hm-kd-section-title">'+detail.icon+' '+detail.name+' <span>'+detail.sub+'</span></div><p>'+detail.desc+'</p>';
  const specs=detail.id==='hello'?[['Lead baru / WA masuk','lead_actual','wa_target','num']]:detail.id==='majesty'?[['Unit terjual','unit_actual','closing_target','num'],['Laba aktual','profit_actual','profit_target','money']]:[['Handover CS','handover_actual','handover_target','num'],['CS Closing dari lead','lead_closing_actual','closing_target','num']];
  specs.forEach(sp=>{const items=rows.map(r=>({outlet:r.outlet,actual:Number(r[sp[1]]||0),target:Number(r[sp[2]]||0),fmt:sp[3]==='money'?rp:num}));html+='<div class="hm-kd-panel"><h3>'+sp[0]+'</h3>'+outletTable(items)+'</div>';});
  if(detail.id==='refill') html+='<div class="hm-kd-note">CS berada di bawah Divisi Refill. Data handover dan closing lead ditampilkan dari catatan lead; kontrol finance, Accurate, dan stabilitas aplikasi perlu dievaluasi dari laporan operasional masing-masing.</div>';
  html+=renderDivisionAnalysis(detail.id,rows);
 }else{
  const totalTarget={wa_target:total(rows,'wa_target'),lead_actual:leads,handover_target:total(rows,'handover_target'),handover_actual:handover,closing_target:total(rows,'closing_target'),unit_actual:unit,profit_target:total(rows,'profit_target'),profit_actual:profit};
  // Pemeriksaan kualitas disembunyikan sampai sumber tervalidasi.
  // Buku Keputusan Management dihilangkan dari halaman Kinerja Divisi.
  // Statistik rata-rata tambahan disembunyikan sampai rumus dan sumber data tervalidasi.

  const pace=monthPace(latestData.month_start);
  html+='<div class="hm-kd-panel hm-kd-ai-analysis"><h3>🎯 Arah & Keputusan Management</h3><p class="hm-kd-note">'+(pace.valid?'Periode: hari '+pace.elapsed+' dari '+pace.days+' · Sisa '+pace.remaining+' hari.':'Tanggal periode tidak valid; laju target tidak dapat dinilai.')+' Analisis dihitung ulang dari data terbaru saat menu dibuka, di-refresh, dan pembaruan otomatis.</p><ol class="hm-kd-advice">'+advice(rows,totalTarget).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p class="hm-kd-note">Gunakan rekomendasi sebagai agenda keputusan: tetapkan PIC, tindakan, tenggat, lalu verifikasi hasilnya. Sistem belum mencatat keputusan atau PIC otomatis.</p></div>';
  html+='<div class="hm-kd-panel"><h3>Target Hasil</h3><div class="hm-kd-grid">'+metric('Unit terjual',unit,totalTarget.closing_target,'num')+metric('Nominal laba',profit,totalTarget.profit_target,'money')+'</div></div>';
  html+='<div class="hm-kd-panel"><h3>Target Proses</h3><div class="hm-kd-grid">'+metric('Lead baru / WA masuk',leads,totalTarget.wa_target,'num')+metric('Handover ke CS/Sales',handover,totalTarget.handover_target,'num')+metric('Closing dari lead',total(rows,'lead_closing_actual'),totalTarget.closing_target,'num')+'</div></div>';
  html+='<div class="hm-kd-panel"><h3>Pencapaian per Outlet</h3><div class="hm-kd-table-wrap"><table class="hm-kd-table"><thead><tr><th>Outlet</th><th>Lead %</th><th>Handover %</th><th>Unit %</th><th>Laba %</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.outlet)+'</td><td>'+pct(r.lead_actual,r.wa_target)+'%<small>Kurang '+num(safe(r.lead_actual,r.wa_target))+'</small></td><td>'+pct(r.handover_actual,r.handover_target)+'%<small>Kurang '+num(safe(r.handover_actual,r.handover_target))+'</small></td><td>'+pct(r.unit_actual,r.closing_target)+'%<small>Kurang '+num(safe(r.unit_actual,r.closing_target))+'</small></td><td>'+pct(r.profit_actual,r.profit_target)+'%<small>Kurang '+rp(safe(r.profit_actual,r.profit_target))+'</small></td></tr>').join('')+'</tbody></table></div></div>';
  html+='<div class="hm-kd-panel"><h3>Catatan lintas divisi · Cara membaca hasil</h3><p>Lead rendah perlu ditangani Divisi Hello; handover yang tertinggal perlu ditelusuri bersama Divisi Refill; konversi dan laba perlu ditangani Divisi Majesty. Jangan menyimpulkan penyebab hanya dari persentase: periksa sampel lead, status, waktu respons, stok, margin, dan catatan transaksi.</p><p class="hm-kd-note">Setiap keputusan harus mencatat: masalah terukur, bukti, dugaan penyebab yang masih perlu diuji, PIC, tenggat, dan indikator keberhasilan. Dashboard saat ini belum menyimpan penugasan atau keputusan tersebut.</p></div>';
 }
 html=html.replace('Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'}), 'Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'})+' · Diperbarui '+(lastUpdatedAt?lastUpdatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'));
 html=html.replace('Analisis AI · Prioritas Tindakan','Analisis Otomatis · Prioritas Tindakan');
 const host=$('hmKinerjaDivisiPanel');
 if(host){host.innerHTML=html;if(!detail&&decisionBookAllowed()){const rows=latestData?.outlets||[];const totals={lead_actual:total(rows,'lead_actual'),wa_target:total(rows,'wa_target'),handover_actual:total(rows,'handover_actual'),handover_target:total(rows,'handover_target'),unit_actual:total(rows,'unit_actual'),closing_target:total(rows,'closing_target'),profit_actual:total(rows,'profit_actual'),profit_target:total(rows,'profit_target')};enrichManagementInstructions(rows,totals);}}
}
window.hmShareGlobalTarget=()=>{
 const roles=typeof window.getActiveRoles==='function'?window.getActiveRoles().map(x=>String(x||'').toUpperCase().replace(/_/g,' ')):[];
 if(!roles.includes('DIVISI')){alert('Fitur berbagi target hanya tersedia untuk akun Divisi.');return;}
 if(!latestData){alert('Data kinerja belum tersedia. Refresh lalu coba lagi.');return;}
 const rows=latestData.outlets||[];
 const n=v=>Number(v||0);
 const fmt=v=>n(v).toLocaleString('id-ID');
 const rpFmt=v=>'Rp'+n(v).toLocaleString('id-ID');
 const pct=(a,t)=>n(t)>0?Math.round(n(a)/n(t)*100):0;
 const gap=(a,t)=>Math.max(0,n(t)-n(a));
 const now=new Date(), days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), remaining=Math.max(0,days-now.getDate());
 const period=new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'});
 const sum=k=>rows.reduce((s,r)=>s+n(r[k]),0);
 const global=[
  {label:'Lead / WA',a:sum('lead_actual'),t:sum('wa_target'),money:false},
  {label:'Handover CS',a:sum('handover_actual'),t:sum('handover_target'),money:false},
  {label:'Sales Closing',a:sum('unit_actual'),t:sum('closing_target'),money:false},
  {label:'Laba',a:sum('profit_actual'),t:sum('profit_target'),money:true}
 ];
 const lines=['📊 *UPDATE PENCAPAIAN TARGET HELLO MAJESTY*','Periode: '+period,'','*RINGKASAN SELURUH OUTLET*'];
 global.forEach(x=>{const f=x.money?rpFmt:fmt;lines.push('• '+x.label+': *'+f(x.a)+' / '+f(x.t)+'* ('+pct(x.a,x.t)+'%)','  Kekurangan: *'+f(gap(x.a,x.t))+'*');});
 lines.push('','*RINCIAN PER OUTLET*');
 rows.forEach(r=>{
  const name=String(r.outlet||'Outlet').trim();
  lines.push('','🏪 *'+name+'*',
   '• Lead / WA: '+fmt(r.lead_actual)+' / '+fmt(r.wa_target)+' ('+pct(r.lead_actual,r.wa_target)+'%) · kurang '+fmt(gap(r.lead_actual,r.wa_target)),
   '• Handover CS: '+fmt(r.handover_actual)+' / '+fmt(r.handover_target)+' ('+pct(r.handover_actual,r.handover_target)+'%) · kurang '+fmt(gap(r.handover_actual,r.handover_target)),
   '• Sales Closing: '+fmt(r.unit_actual)+' / '+fmt(r.closing_target)+' ('+pct(r.unit_actual,r.closing_target)+'%) · kurang '+fmt(gap(r.unit_actual,r.closing_target)),
   '• Laba: '+rpFmt(r.profit_actual)+' / '+rpFmt(r.profit_target)+' ('+pct(r.profit_actual,r.profit_target)+'%) · kurang '+rpFmt(gap(r.profit_actual,r.profit_target))
  );
 });
 const motivations=[
  '💪 *Kita masih punya kesempatan untuk mengejar target!* Pilih prioritas paling berdampak hari ini, lakukan follow-up dengan disiplin, dan saling bantu sampai pekerjaan tuntas. Progres kecil yang konsisten akan membawa hasil besar.',
  '🔥 *Sisa '+remaining+' hari terakhir, mari maksimalkan bersama!* Fokus pada kekurangan target yang paling realistis dikejar, respons pelanggan dengan cepat, dan pastikan setiap handover serta transaksi tercatat dengan benar. Kita bisa membuat penutupan bulan ini lebih baik.',
  '🌟 *Jangan berhenti di pencapaian hari ini.* Evaluasi apa yang berhasil, perbaiki yang belum efektif, lalu jalankan langkah berikutnya dengan semangat. Setiap anggota tim punya peran penting dalam hasil bersama.',
  '🚀 *Saatnya bergerak lebih terarah!* Buat daftar prioritas harian, tuntaskan follow-up yang tertunda, dan komunikasikan kendala sejak awal. Kita kejar target dengan kerja cerdas, kerja sama, dan pelayanan terbaik.',
  '🤝 *Target adalah tanggung jawab bersama.* Dukung rekan yang membutuhkan bantuan, jaga kualitas pelayanan, dan pastikan closing yang dicapai valid. Mari gunakan sisa waktu dengan maksimal tanpa mengorbankan ketelitian.'
 ];
 const motivation=motivations[Math.floor(Math.random()*motivations.length)];
 lines.push('','🗓️ Sisa waktu bulan ini: *'+remaining+' hari*','',motivation,'','— HELLO MAJESTY / Built on Trust');
 const message=lines.join('\n');
 window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener');
};
window.hmKinerjaDivision=id=>{activeDivision=String(id||'');renderDivisions();};
window.hmRefreshKinerjaDivisi=async function(){
 if(refreshBusy)return;
 refreshBusy=true;
 const host=$('hmKinerjaDivisiPanel'),refreshBtn=$('hmKdRefreshBtn');
 if(refreshBtn){refreshBtn.disabled=true;refreshBtn.textContent='Memperbarui data…';}
 hmKdAiLastFingerprint='';
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
 }finally{refreshBusy=false;const btn=$('hmKdRefreshBtn');if(btn){btn.disabled=false;btn.textContent='↻ Perbarui data & arahan AI';}}
};
window.hmOpenKinerjaDivision=async function(id){await window.hmOpenKinerjaDivisi();window.hmKinerjaDivision(id);};
window.hmOpenKinerjaDivisi=async function(){
 // Pastikan kontras isi analisis tetap terbaca meskipun ada aturan warna/opacity global.
 if(!document.getElementById('hmKdReadableAnalysisStyle')){
  const style=document.createElement('style');
  style.id='hmKdReadableAnalysisStyle';
  style.textContent=`
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis,
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis *{
    opacity:1!important;
    -webkit-text-fill-color:currentColor!important;
   }
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis{color:#172236!important;background:#fff!important}
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis h3,
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis h4,
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis p,
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis li,
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis b,
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis span{color:#172236!important}
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis .hm-kd-note{color:#344054!important}
   #hmKinerjaDivisiPanel .hm-kd-ai-analysis .hm-kd-advice{color:#172236!important}
  `;
  document.head.appendChild(style);
 }
 const panel=$('hmMenuPanel'),body=$('hmMenuPanelBody'),title=$('hmMenuPanelTitle');
 if(!panel||!body){alert('Panel menu belum siap.');return;}
 if(title)title.textContent='📊 Kinerja Divisi';
 panel.classList.remove('hidden');
 if(!$('hmKinerjaDivisiPanel')){const host=document.createElement('div');host.id='hmKinerjaDivisiPanel';body.appendChild(host);}
 const host=$('hmKinerjaDivisiPanel');
 if(!latestData)host.innerHTML='<div class="box">Memuat target dan pencapaian seluruh outlet…</div>';
 await window.hmRefreshKinerjaDivisi();
 if($('modal'))$('modal').classList.add('hidden');
 panel.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>{const body=$('hmMenuPanelBody');if(body){body.style.paddingTop='18px';body.scrollTop=0;}},80);
 if(refreshTimer)clearInterval(refreshTimer);
 refreshTimer=setInterval(()=>{
  const p=$('hmMenuPanel');
  if(p&&!p.classList.contains('hidden'))window.hmRefreshKinerjaDivisi();
 },60000);
};
})();