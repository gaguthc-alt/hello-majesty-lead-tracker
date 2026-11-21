/* Hello Majesty — Buzz Creative organization commission workspace.
   The RPC is the authorization boundary; only the active Buzz Creative OWNER receives data. */
(function(){
  if(window.__hmBuzzCreativeCommissionInstalled)return;
  window.__hmBuzzCreativeCommissionInstalled=true;
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:2});
  const monthStart=offset=>{
    const now=new Date(Date.now()+8*60*60*1000);
    const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+Number(offset),1));
    return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-01';
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(host,start){
    host.innerHTML='<div class="small">Memuat laporan organisasi...</div>';
    const sb=window.sb;
    if(!sb){host.textContent='Koneksi database belum siap.';return;}
    const res=await sb.rpc('buzz_creative_owner_commission_report',{p_month_start:start});
    if(res.error){
      host.innerHTML='<div class="small">Laporan organisasi belum dapat dimuat. Pastikan akun ini adalah Owner Buzz Creative.</div>';
      return false;
    }
    const data=res.data||{},sum=data.summary||{},members=Array.isArray(data.member_contributions)?data.member_contributions:[];
    const columns=[
      ['CS Handover','cs_commission'],['CS Closing','cs_closing_commission'],
      ['Sales','sales_commission'],['Freelance Internal','freelance_internal_commission'],
      ['Hunter','hunter_commission'],['Checker','checker_commission'],
      ['Content Creator','content_creator_commission'],['Fasilitator','facilitator_commission']
    ];
    host.innerHTML=
      '<div class="box" style="margin-top:10px;border:1px solid #d7e0eb;border-radius:14px;padding:14px">'+
      '<div class="small">Periode '+esc(start)+' • Hello Majesty</div>'+
      '<div style="font-size:12px;color:#64748b;margin-top:8px">TOTAL KOMISI ORGANISASI</div>'+
      '<div style="font-size:clamp(23px,5vw,30px);font-weight:850;margin:2px 0 12px">'+money(sum.total_commission)+'</div>'+
      '<div class="small">Total organisasi adalah konsolidasi seluruh kontribusi. Rincian anggota di bawah adalah perhitungan internal, bukan hak tagih pribadi.</div>'+
      '<h4 style="margin:16px 0 8px">Kontribusi Anggota</h4>'+
      (members.length?members.map(m=>
        '<div style="border-top:1px solid #e5e7eb;padding:10px 0">'+
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>'+esc(m.name)+'</b><b>'+money(m.total_commission)+'</b></div>'+
        '<div class="small" style="margin-top:5px">'+columns.filter(c=>Number(m[c[1]]||0)!==0).map(c=>esc(c[0])+': '+money(m[c[1]])).join(' • ')+'</div>'+
        '</div>'
      ).join(''):'<div class="small">Belum ada kontribusi anggota pada periode ini.</div>')+
      '<div class="small" style="margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb">Akses nominal hanya untuk Owner Buzz Creative dan Management. Anggota tim hanya dapat melihat metrik performa masing-masing.</div></div>';
    return true;
  }
  let lastProbe='';
  async function mount(){
    const home=document.getElementById('roleHome'),profile=window.profile;
    if(!home||!profile||home.querySelector('#hmBuzzCreativeOrgCommission'))return;
    const probeKey=String(profile.user_id||profile.id||profile.email||profile.name||'active-profile');
    if(lastProbe===probeKey)return;
    lastProbe=probeKey;
    const card=document.createElement('section');
    card.id='hmBuzzCreativeOrgCommission';card.className='box';
    card.style.cssText='margin:14px 0;border:1px solid #cbd5e1;border-radius:16px;padding:14px';
    card.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0">🏢 Buzz Creative</h3><div class="small">Laporan komisi organisasi</div></div><button type="button" class="primary" id="hmBuzzCreativeLoad">Muat Laporan</button></div><div id="hmBuzzCreativeReport" style="margin-top:10px"></div>';
    home.prepend(card);
    const btn=card.querySelector('#hmBuzzCreativeLoad'),body=card.querySelector('#hmBuzzCreativeReport');
    btn.addEventListener('click',async()=>{
      btn.disabled=true;btn.textContent='Memuat...';
      try{await load(body,monthStart(0));}
      finally{btn.disabled=false;btn.textContent='Refresh Laporan';}
    });
    // Probe once using the protected RPC; remove the card for non-owners.
    const ok=await load(body,monthStart(0));
    if(!ok)card.remove();
    else {btn.textContent='Refresh Laporan';}
  }
  let busy=false;
  const observer=new MutationObserver(()=>{
    if(busy)return;
    if(window.profile&&document.getElementById('roleHome')){
      busy=true;mount().catch(e=>console.warn('[HM Buzz Creative]',e)).finally(()=>{busy=false;});
    }
  });
  const start=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true});mount().catch(()=>{});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
