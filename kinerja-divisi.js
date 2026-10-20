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
function renderDecisionBook(){
 if(!decisionBookAllowed())return '';
 const today=new Date().toISOString().slice(0,10);
 return '<section class="hm-kd-panel hm-kd-decision-book"><h3>📒 Buku Keputusan Management</h3><p>Catat keputusan yang dapat ditindaklanjuti dan diverifikasi. Pisahkan fakta, hipotesis, tindakan, PIC, tenggat, dan ukuran keberhasilan.</p><div class="hm-kd-decision-form"><label>Judul masalah/keputusan<input id="hmKdTitle" maxlength="180" placeholder="Contoh: Handover lead potensial terlambat"></label><div class="hm-kd-decision-form-grid"><label>Divisi<select id="hmKdDivision"><option value="cross_division">Lintas Divisi</option><option value="hello">Divisi Hello</option><option value="majesty">Divisi Majesty</option><option value="refill">Divisi Refill</option></select></label><label>Prioritas<select id="hmKdPriority"><option value="critical">Kritis</option><option value="high">Tinggi</option><option value="medium" selected>Menengah</option><option value="low">Rendah</option></select></label></div><label>Masalah terukur<textarea id="hmKdProblem" maxlength="5000" rows="2" placeholder="Apa yang terjadi dan seberapa besar dampaknya?"></textarea></label><label>Bukti yang sudah diperiksa<textarea id="hmKdEvidence" maxlength="5000" rows="2" placeholder="Angka, periode, transaksi, lead, atau sumber bukti"></textarea></label><label>Hipotesis penyebab yang masih perlu diuji<textarea id="hmKdHypothesis" maxlength="5000" rows="2" placeholder="Jangan tulis dugaan sebagai fakta"></textarea></label><label>Rencana tindakan<textarea id="hmKdAction" maxlength="5000" rows="2" placeholder="Langkah konkret yang harus dilakukan"></textarea></label><div class="hm-kd-decision-form-grid"><label>PIC utama<input id="hmKdOwner" maxlength="120" placeholder="Nama penanggung jawab"></label><label>Tenggat<input id="hmKdDue" type="date" value="'+today+'"></label></div><label>Ukuran keberhasilan<textarea id="hmKdSuccess" maxlength="1000" rows="2" placeholder="Angka/bukti yang membuktikan masalah membaik"></textarea></label><button id="hmKdSaveDecision" type="button" onclick="window.hmKdCreateDecision()">+ Simpan keputusan</button></div><div class="hm-kd-decision-existing"><h4>Keputusan aktif dan riwayat</h4><div id="hmKdDecisionRows"><p class="hm-kd-note">Memuat keputusan…</p></div></div></section>';
}
function renderDivisionAnalysis(id,rows){
 const list=divisionAdvice(id,rows);
 return '<div class="hm-kd-panel hm-kd-ai-analysis"><h3>Analisis Otomatis Divisi · Diagnosis dan Tindakan</h3><p class="hm-kd-note">Ini analisis berbasis aturan dari target dan pencapaian yang tersedia, bukan AI yang membaca seluruh percakapan/transaksi. Penyebab harus diverifikasi sebelum menetapkan kesalahan individu.</p><div class="hm-kd-ai-list">'+list.map((x,i)=>'<article class="hm-kd-ai-item"><div class="hm-kd-ai-kicker">'+esc(x.priority)+'</div><h4>'+(i+1)+'. '+esc(x.title)+'</h4><p>'+esc(x.detail)+'</p><b>Instruksi tindakan</b><ul>'+x.actions.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul><div class="hm-kd-note"><b>PIC utama:</b> '+esc(id==='hello'?'Tyar — Divisi Hello':id==='majesty'?'Wawan — Divisi Majesty':'Gagut — Divisi Refill')+' · <b>Tenggat awal:</b> hari ini, konfirmasi saat briefing berikutnya · <b>Verifikasi:</b> bandingkan angka setelah tindakan dengan data awal dan catat bukti/perubahan.</div></article>').join('')+'</div></div>';
}
function managementCommandCenter(rows,totals){
 const leadPct=pct(totals.lead_actual,totals.wa_target), handPct=pct(totals.handover_actual,totals.handover_target), unitPct=pct(totals.unit_actual,totals.closing_target), profitPct=pct(totals.profit_actual,totals.profit_target);
 const pace=monthPace(latestData?.month_start), pacePct=Math.round(pace.ratio*100);
 const overallMin=Math.min(leadPct,handPct,unitPct,profitPct);
 const status=!pace.valid?'DATA PERLU DICEK':overallMin<pacePct?'PERLU TINDAKAN':overallMin<80?'WASPADA':'TERKENDALI';
 const tone=!pace.valid||overallMin<pacePct?'critical':overallMin<80?'warning':'good';
 const instructions=[
  {name:'Tyar',role:'PEMIMPIN DIVISI HELLO',color:'#0f766e',metric:'Lead / WA '+leadPct+'% · Target proses '+pacePct+'% waktu bulan berjalan',text:leadPct<pacePct?'TINGKATKAN lead valid, bukan views saja. Prioritaskan konten ber-CTA WhatsApp, ukur sumber lead, dan pastikan kualitas serta handover bisa ditelusuri.':'JAGA kualitas lead dan bukti kontribusi konten. Pastikan setiap sumber lead tercatat dan peluang yang masuk benar-benar valid.',action:'Fokus: konten → lead valid → handover'},
  {name:'Wawan',role:'PEMIMPIN DIVISI MAJESTY',color:'#1d4ed8',metric:'Unit '+unitPct+'% · Laba '+profitPct+'%',text:unitPct<pacePct?'KEJAR closing melalui daftar lead potensial, PIC, dan follow-up terjadwal. Periksa alasan lost serta kecocokan stok; jangan mengorbankan margin demi volume.':'JAGA konversi dan laba per transaksi. Audit margin, diskon, serta biaya finance sebelum mendorong penjualan tambahan.',action:'Fokus: follow-up → closing → laba'},
  {name:'Gagut',role:'PEMIMPIN DIVISI REFILL',color:'#6d28d9',metric:'Handover '+handPct+'% · Integritas data perlu dijaga',text:handPct<pacePct?'AUDIT lead yang belum direspons, belum punya PIC, atau belum memiliki jadwal tindak lanjut. Cocokkan data handover dengan alur operasional.':'JAGA keandalan data, administrasi, kas, dan sinkronisasi Accurate. Prioritaskan error atau transaksi pending yang terverifikasi sebelum mengubah data.',action:'Fokus: handover · finance · Accurate · stabilitas aplikasi'}
 ];
 return '<section class="hm-kd-command"><div class="hm-kd-command-head"><div><div class="hm-kd-eyebrow">PUSAT KOMANDO · HELLO MAJESTY</div><h3>Instruksi Management Hari Ini</h3><p>Prioritas singkat untuk setiap pemimpin berdasarkan indikator target yang tersedia.</p></div><span class="hm-kd-status '+tone+'">'+status+'</span></div><div class="hm-kd-command-foot" id="hmKdAiStatus" style="margin:12px 0;padding:10px 12px;background:#eaf2ff;color:#173b75;border-radius:10px;font-size:13px;font-weight:600">Menyiapkan arahan AI berdasarkan KPI terbaru…</div><div class="hm-kd-command-grid">'+instructions.map((x,i)=>'<article class="hm-kd-command-card" data-hm-kd-division="'+esc(x.name==='Tyar'?'hello':x.name==='Wawan'?'majesty':'refill')+'" style="--leader:'+x.color+'"><div class="hm-kd-command-person"><span class="hm-kd-command-num">'+(i+1)+'</span><div><h4>'+esc(x.name)+'</h4><div class="hm-kd-command-role">'+esc(x.role)+'</div></div></div><div class="hm-kd-command-metric">'+esc(x.metric)+'</div><p>'+esc(x.text)+'</p><div class="hm-kd-command-action">'+esc(x.action)+'</div></article>').join('')+'</div></section>';
}
let hmKdAiLastFingerprint='',hmKdAiLastAt=0,hmKdAiBusy=false,hmKdAiBusyFingerprint='',hmKdAiLastResult=null,hmKdAiRunId=0;
async function enrichManagementInstructions(rows,totals){
 const host=$('hmKinerjaDivisiPanel'); if(!host||!latestData)return;
 const cards=[...host.querySelectorAll('[data-hm-kd-division]')]; if(!cards.length)return;
 const pace=monthPace(latestData?.month_start);
 const payload={period:latestData?.month_start||new Date().toISOString().slice(0,10),updated_at:lastUpdatedAt?.toISOString()||new Date().toISOString(),days_elapsed:pace.elapsed,days_in_month:pace.days,pace_percent:Math.round(pace.ratio*100),totals:{outlets:rows.length,lead:{actual:totals.lead_actual,target:totals.wa_target,achievement_percent:pct(totals.lead_actual,totals.wa_target)},handover:{actual:totals.handover_actual,target:totals.handover_target,achievement_percent:pct(totals.handover_actual,totals.handover_target)},units:{actual:totals.unit_actual,target:totals.closing_target,achievement_percent:pct(totals.unit_actual,totals.closing_target)},profit:{actual:totals.profit_actual,target:totals.profit_target,achievement_percent:pct(totals.profit_actual,totals.profit_target)}},outlets:rows.map(r=>({outlet:r.outlet,lead_percent:pct(r.lead_actual,r.wa_target),handover_percent:pct(r.handover_actual,r.handover_target),unit_percent:pct(r.unit_actual,r.closing_target),profit_percent:pct(r.profit_actual,r.profit_target)})),leaders:[{name:'Tyar',division:'Hello',responsibility:'Menetapkan arah promosi, konten, kualitas lead dan sumber lead; mengarahkan tim creator agar menghasilkan lead valid dan handover yang terukur.'},{name:'Wawan',division:'Majesty',responsibility:'Menetapkan prioritas penjualan, konversi lead, kecocokan stok, disiplin follow-up, unit terjual dan laba/margin.'},{name:'Gagut',division:'Refill',responsibility:'Menetapkan disiplin CS/handover, administrasi, validitas data operasional dan koordinasi rekonsiliasi Accurate berdasarkan laporan yang terverifikasi.'}],limitations:['Data ini adalah ringkasan KPI outlet; tidak memuat detail percakapan lead, penyebab lost, transaksi Accurate pending atau rekonsiliasi aktual. Jangan menyatakan hal tersebut sebagai fakta tanpa data pendukung.']};
 const fingerprint=JSON.stringify(payload); const setHmKdAiStatus=(message)=>{const node=$('hmKdAiStatus');if(node)node.textContent=message;};
 const labels={hello:'Tyar',majesty:'Wawan',refill:'Gagut'};
 const applyResult=(parsed)=>{const currentHost=$('hmKinerjaDivisiPanel');if(!currentHost)return false;let applied=0;for(const [id,name] of Object.entries(labels)){const card=currentHost.querySelector('[data-hm-kd-division="'+id+'"]'),entry=parsed?.[id];if(!card||!entry||typeof entry.message!=='string'||!entry.message.trim())continue;const p=card.querySelector('p'),action=card.querySelector('.hm-kd-command-action');if(p)p.textContent=entry.message.trim();if(action)action.textContent='Fokus: '+String(entry.focus||({hello:'konten → lead valid',majesty:'konversi → unit → laba',refill:'handover → proses → akurasi'}[id])).trim();card.setAttribute('data-hm-kd-ai','true');card.setAttribute('data-hm-kd-tone',String(entry.tone||'direction'));applied++;}return applied===3;};
 if(fingerprint===hmKdAiLastFingerprint&&hmKdAiLastResult){if(!applyResult(hmKdAiLastResult)){setHmKdAiStatus('Arahan AI tersimpan, tetapi kartu belum siap ditampilkan. Tekan Perbarui data & arahan AI.');return;}setHmKdAiStatus('Arahan AI Gemini · KPI tidak berubah; data diperiksa '+(lastUpdatedAt?lastUpdatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'saat ini')+'.');return;}
 if(hmKdAiBusy&&hmKdAiBusyFingerprint===fingerprint){setHmKdAiStatus('AI masih memproses KPI terbaru…');return;}
 const runId=++hmKdAiRunId;hmKdAiBusy=true;hmKdAiBusyFingerprint=fingerprint;setHmKdAiStatus('AI sedang merumuskan arahan berdasarkan KPI terbaru…');
 try{const db=typeof sb!=='undefined'?sb:window.sb;if(!db?.functions||typeof db.functions.invoke!=='function')throw new Error('Layanan AI belum tersedia');
 const question='Kamu adalah penasihat strategi internal untuk Management Hello Majesty. Susun arahan kepemimpinan untuk TIGA kepala divisi berdasarkan JSON KPI terbaru. Jawab JSON valid saja berbentuk {"hello":{"message":"...","focus":"...","tone":"warning|reminder|appreciation|direction"},"majesty":{"message":"...","focus":"...","tone":"warning|reminder|appreciation|direction"},"refill":{"message":"...","focus":"...","tone":"warning|reminder|appreciation|direction"}}. Setiap message maksimal 2 kalimat dan 30 kata; focus maksimal 7 kata. Bahasa Indonesia, profesional, tajam, konkret. Para pemimpin divisi adalah pengambil kebijakan dan pengarah tim, jadi arahkan pada keputusan, kontrol, pembagian prioritas, koordinasi lintas divisi dan tindak lanjut tim—bukan tugas staf biasa. Gunakan warning tegas jika pencapaian tertinggal dari persentase waktu bulan berjalan; apresiasi singkat hanya bila indikator sesuai/di atas laju; selain itu beri pengingat strategis. Sebut angka hanya dari JSON. Jangan menyimpulkan penyebab dari persentase semata, jangan mengarang PIC, transaksi pending, masalah Accurate, atau penyebab lost. Divisi Hello fokus konten→lead valid; Majesty fokus konversi→unit→laba; Refill fokus handover/CS dan keandalan proses/data. Jika KPI agregat menunjukkan gap, minta pemimpin menetapkan PIC, tindakan dan tenggat serta memeriksa bukti. Jangan mengklaim sudah menetapkan PIC. DATA: '+JSON.stringify(payload);
 const result=await Promise.race([db.functions.invoke('hello-majesty-ai-gemini',{body:{question,lead:null}}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Respons AI melewati batas 35 detik. Tekan Perbarui data & arahan AI untuk mencoba lagi.')),35000))]);if(runId!==hmKdAiRunId)return;if(result?.error)throw result.error;if(result?.data?.error)throw new Error(String(result.data.error));const rawAnswer=String(result?.data?.answer||'').trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'').trim();if(!rawAnswer)throw new Error('Gemini mengembalikan jawaban kosong.');let parsed;try{parsed=JSON.parse(rawAnswer);}catch(parseError){const match=rawAnswer.match(/\{[\s\S]*\}/);if(!match)throw new Error('Jawaban AI bukan JSON yang dapat dibaca.');parsed=JSON.parse(match[0]);}
 if(!parsed.hello?.message||!parsed.majesty?.message||!parsed.refill?.message)throw new Error('Jawaban AI belum memuat instruksi lengkap untuk ketiga divisi.');
 if(!applyResult(parsed))throw new Error('Kartu instruksi berubah saat AI selesai; silakan tekan Perbarui data & arahan AI.');hmKdAiLastFingerprint=fingerprint;hmKdAiLastAt=Date.now();hmKdAiLastResult=parsed;setHmKdAiStatus('Arahan AI Gemini · berdasarkan ringkasan KPI diperbarui '+(lastUpdatedAt?lastUpdatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'saat ini')+'. Angka tidak mencakup audit transaksi Accurate.');
 }catch(e){console.warn('[HM Kinerja Divisi] Instruksi AI gagal; memakai arahan KPI otomatis:',e);if(runId===hmKdAiRunId)setHmKdAiStatus('AI belum berhasil: '+String(e?.message||e)+' Pesan kartu saat ini adalah fallback KPI.');}finally{if(runId===hmKdAiRunId){hmKdAiBusy=false;hmKdAiBusyFingerprint='';}}
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
 let html='<div class="hm-kd-head"><div><div class="hm-kd-eyebrow">HELLO MAJESTY · MONITORING BERSAMA</div><h2>Kinerja Divisi</h2><p>Target hasil dan target proses seluruh outlet · '+new Date(latestData.month_start+'T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'})+'</p></div><button class="secondary" id="hmKdRefreshBtn" type="button" onclick="window.hmRefreshKinerjaDivisi()">↻ Perbarui data & arahan AI</button></div>';
 if(!detail){
  const commandTotals={wa_target:total(rows,'wa_target'),lead_actual:leads,handover_target:total(rows,'handover_target'),handover_actual:handover,closing_target:total(rows,'closing_target'),unit_actual:unit,profit_target:total(rows,'profit_target'),profit_actual:profit};
  html+=managementCommandCenter(rows,commandTotals);
 }
 if(detail){
  html+='<button class="secondary hm-kd-back" type="button" onclick="window.hmKinerjaDivision(&quot;&quot;)">← Ringkasan seluruh divisi</button><div class="hm-kd-section-title">'+detail.icon+' '+detail.name+' <span>'+detail.sub+'</span></div><p>'+detail.desc+'</p>';
  const specs=detail.id==='hello'?[['Lead baru / WA masuk','lead_actual','wa_target','num']]:detail.id==='majesty'?[['Unit terjual','unit_actual','closing_target','num'],['Laba aktual','profit_actual','profit_target','money']]:[['Handover CS','handover_actual','handover_target','num'],['Closing dari lead','lead_closing_actual','closing_target','num']];
  specs.forEach(sp=>{const items=rows.map(r=>({outlet:r.outlet,actual:Number(r[sp[1]]||0),target:Number(r[sp[2]]||0),fmt:sp[3]==='money'?rp:num}));html+='<div class="hm-kd-panel"><h3>'+sp[0]+'</h3>'+outletTable(items)+'</div>';});
  if(detail.id==='refill') html+='<div class="hm-kd-note">CS berada di bawah Divisi Refill. Data handover dan closing lead ditampilkan dari catatan lead; kontrol finance, Accurate, dan stabilitas aplikasi perlu dievaluasi dari laporan operasional masing-masing.</div>';
  html+=renderDivisionAnalysis(detail.id,rows);
 }else{
  const totalTarget={wa_target:total(rows,'wa_target'),lead_actual:leads,handover_target:total(rows,'handover_target'),handover_actual:handover,closing_target:total(rows,'closing_target'),unit_actual:unit,profit_target:total(rows,'profit_target'),profit_actual:profit};
  html+=renderDataQuality(rows);
  html+=renderDecisionBook();
  html+='<div class="hm-kd-summary"><div><span>Outlet dipantau</span><b>'+num(rows.length)+'</b></div><div><span>Rata-rata pencapaian lead</span><b>'+avg(rows,'lead_actual','wa_target')+'%</b><small>Lead baru · outlet</small></div><div><span>Rata-rata pencapaian handover</span><b>'+avg(rows,'handover_actual','handover_target')+'%</b><small>Handover · outlet</small></div><div><span>Rata-rata pencapaian closing</span><b>'+avg(rows,'lead_closing_actual','closing_target')+'%</b><small>Closing lead · outlet</small></div><div><span>Rata-rata pencapaian unit</span><b>'+avg(rows,'unit_actual','closing_target')+'%</b><small>Unit terjual · outlet</small></div><div><span>Rata-rata pencapaian laba</span><b>'+avg(rows,'profit_actual','profit_target')+'%</b><small>Laba aktual · outlet</small></div></div>';
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
 if(host){host.innerHTML=html;if(!detail&&decisionBookAllowed()){loadDecisionBook();const rows=latestData?.outlets||[];const totals={lead_actual:total(rows,'lead_actual'),wa_target:total(rows,'wa_target'),handover_actual:total(rows,'handover_actual'),handover_target:total(rows,'handover_target'),unit_actual:total(rows,'unit_actual'),closing_target:total(rows,'closing_target'),profit_actual:total(rows,'profit_actual'),profit_target:total(rows,'profit_target')};enrichManagementInstructions(rows,totals);}}
}
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