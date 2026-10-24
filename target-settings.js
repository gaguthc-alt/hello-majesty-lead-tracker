(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>'Rp'+Number(v||0).toLocaleString('id-ID');
  const allowed=()=>{const p=window.profile||{};const role=String(p.role||'').trim().toUpperCase().replace(/[_-]+/g,' ');return p.is_management===true && (role==='MANAGEMENT'||role==='BUSINESS LEADER');};
  const monthNow=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';};
  function panel(title,html){
    const p=document.getElementById('hmMenuPanel'),b=document.getElementById('hmMenuPanelBody'),t=document.getElementById('hmMenuPanelTitle');
    if(!p||!b) { alert('Panel menu belum siap. Silakan buka dashboard lalu coba lagi.'); return; }
    if(t)t.textContent=title;b.innerHTML=html;p.classList.remove('hidden');
    requestAnimationFrame(()=>p.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  window.hmOpenTargetSettings=async function(){
    if(!allowed())return alert('Pengaturan target hanya dapat diakses Management.');
    const month=monthNow();
    panel('🎯 Pengaturan Target Outlet','<div class="box"><div class="small">Atur target untuk bulan yang dipilih. Target tersimpan per outlet dan per bulan.</div><label>Bulan</label><input type="month" id="hmTargetMonth" value="'+month.slice(0,7)+'" onchange="hmLoadTargets()"><div id="hmTargetList" style="margin-top:10px">Memuat target…</div></div>');
    await window.hmLoadTargets();
  };
  window.hmLoadTargets=async function(){
    if(!allowed())return;
    const m=document.getElementById('hmTargetMonth')?.value;
    const list=document.getElementById('hmTargetList');if(!m||!list)return;
    const ms=m+'-01';
    list.innerHTML='<div class="small">⏳ Memuat target…</div>';
    const r=await window.sb.from('monthly_outlet_targets').select('*').eq('month_start',ms).order('outlet');
    if(r.error){list.innerHTML='<div class="box">Gagal memuat target: '+esc(r.error.message)+'</div>';return;}
    const rows=r.data||[];
    const known=['Majesty Plaza iPhone','Majesty Refill Phone'];
    const names=[...new Set([...known,...rows.map(x=>x.outlet)])];
    list.innerHTML=names.map((name,i)=>{
      const x=rows.find(a=>a.outlet===name)||{outlet:name,wa_target:0,qualified_target:0,closing_target:0,nominal_target:0,bonus_label:'Liburan',bonus_amount:0,active:true};
      return '<div class="lead" style="margin-top:10px"><b>🏪 '+esc(name)+'</b><div class="small">Target bulanan • '+esc(m)+'</div><div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px">'+
      '<div><label>Target WA masuk</label><input type="number" min="0" id="hmTwa'+i+'" value="'+Number(x.wa_target||0)+'"></div>'+
      '<div><label>Target handover</label><input type="number" min="0" id="hmThand'+i+'" value="'+Number(x.qualified_target||0)+'"></div>'+
      '<div><label>Target closing (unit)</label><input type="number" min="0" id="hmTclose'+i+'" value="'+Number(x.closing_target||0)+'"></div>'+
      '<div><label>Target laba (Rp)</label><input type="number" min="0" step="1000" id="hmTprofit'+i+'" value="'+Number(x.nominal_target||0)+'"></div>'+
      '<div><label>Nama reward</label><input id="hmTbonuslabel'+i+'" value="'+esc(x.bonus_label||'')+'"></div>'+
      '<div><label>Nominal reward (Rp)</label><input type="number" min="0" step="1000" id="hmTbonus'+i+'" value="'+Number(x.bonus_amount||0)+'"></div>'+
      '</div><button class="success" style="margin-top:10px;width:100%" onclick="hmSaveTarget('+i+',\\''+esc(name).replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'")+'\\')">💾 Simpan Target '+esc(name)+'</button></div>';
    }).join('');
    window._hmTargetRows=names;
  };
  window.hmSaveTarget=async function(i,outlet){
    if(!allowed())return alert('Akses ditolak.');
    const month=document.getElementById('hmTargetMonth')?.value;if(!month)return;
    const val=id=>Math.max(0,Number(document.getElementById(id+i)?.value||0));
    const payload={month_start:month+'-01',outlet,wa_target:val('hmTwa'),qualified_target:val('hmThand'),closing_target:val('hmTclose'),nominal_target:val('hmTprofit'),bonus_label:document.getElementById('hmTbonuslabel'+i)?.value||'Reward',bonus_amount:val('hmTbonus'),active:true,updated_at:new Date().toISOString()};
    const old=await window.sb.from('monthly_outlet_targets').select('id').eq('month_start',payload.month_start).eq('outlet',outlet).maybeSingle();
    if(old.error)return alert('Gagal memeriksa target: '+old.error.message);
    const q=old.data?.id?await window.sb.from('monthly_outlet_targets').update(payload).eq('id',old.data.id):await window.sb.from('monthly_outlet_targets').insert(payload);
    if(q.error)return alert('Target gagal disimpan: '+q.error.message);
    alert('Target '+outlet+' bulan '+month+' berhasil disimpan.');
    await window.hmLoadTargets();
  };

  function enforceVisibility(){
    const canSee=allowed();
    document.querySelectorAll('button,a,[role="button"],.role-home-submenu-item').forEach(el=>{
      const label=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
      if(label.includes('Pengaturan Target Outlet')){
        el.style.display=canSee?'':'none';
        el.setAttribute('aria-hidden',canSee?'false':'true');
      }
    });
  }

  // Tombol share target hanya untuk pengguna operasional/divisi, bukan Management.
  function canShareTargets(){
    const p=window.profile||window.hmProfile||window.currentProfile||{};
    const role=String(p.role||'').toUpperCase().replace(/[_-]+/g,' ');
    const roles=Array.isArray(p.roles)?p.roles.map(x=>String(x).toUpperCase()).join(' '):'';
    if(p.is_management===true || /MANAGEMENT|BUSINESS LEADER|DEVELOPER/.test(role+' '+roles))return false;
    const divisi=String(p.division||p.divisi||'').toUpperCase();
    const outlet=String(p.outlet||'').toUpperCase();
    return !!(p.name||p.user_id||p.id) && /HELLO|REFILL|MAJESTY|DIVISI/.test(divisi+' '+role+' '+outlet+' '+roles);
  }
  function parseMetric(text,label){
    const safe=label;
    const re=new RegExp(safe+'[\\s\\S]{0,90}?(\\d[\\d,.]*)\\s*\\/\\s*(\\d[\\d,.]*)','i');
    const m=text.match(re);
    if(!m)return null;
    const n=v=>Number(String(v).replace(/[.,](?=\d{3}(?:\D|$))/g,'').replace(',','.'))||0;
    return {actual:n(m[1]),target:n(m[2])};
  }
  function parseProfit(text){
    const m=text.match(/Realisasi\s*([\d.,]+)\s*(jt|juta|m|rb|ribu)?/i);
    if(!m)return null;
    let n=Number(String(m[1]).replace(',','.'))||0;
    const unit=String(m[2]||'').toLowerCase();
    if(unit==='jt'||unit==='juta'||unit==='m')n*=1000000;
    else if(unit==='rb'||unit==='ribu')n*=1000;
    return n;
  }
  function daysLeft(){
    const now=new Date(),end=new Date(now.getFullYear(),now.getMonth()+1,0);
    return Math.max(0,end.getDate()-now.getDate());
  }
  function shareTargetCard(card){
    const text=card.innerText||card.textContent||'';
    const outlet=(text.match(/TARGET\s+([^\n]+)/i)||[])[1]||'Outlet';
    const wa=parseMetric(text,'WA'),handover=parseMetric(text,'Handover'),closing=parseMetric(text,'Closing');
    const profitTargetMatch=text.match(/Target Laba\s*([\d.,]+)\s*(jt|juta|m|rb|ribu)?/i);
    let profitTarget=0;
    if(profitTargetMatch){
      profitTarget=Number(String(profitTargetMatch[1]).replace(',','.'))||0;
      const u=String(profitTargetMatch[2]||'').toLowerCase();
      if(u==='jt'||u==='juta'||u==='m')profitTarget*=1000000;else if(u==='rb'||u==='ribu')profitTarget*=1000;
    }
    const profitActual=parseProfit(text);
    const remaining=daysLeft();
    const date=new Date();
    const month=date.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
    const line=(label,m)=>m?label+': '+m.actual.toLocaleString('id-ID')+'/'+m.target.toLocaleString('id-ID')+' ('+(m.target?Math.round(m.actual/m.target*100):0)+'%) • kurang '+Math.max(0,m.target-m.actual).toLocaleString('id-ID'):null;
    const parts=[line('📲 WA',wa),line('🤝 Handover',handover),line('🏆 Closing',closing)].filter(Boolean);
    if(profitTarget>0&&profitActual!==null)parts.push('📈 Laba: Rp'+Math.round(profitActual).toLocaleString('id-ID')+'/Rp'+Math.round(profitTarget).toLocaleString('id-ID')+' ('+Math.round(profitActual/profitTarget*100)+'%) • kurang Rp'+Math.max(0,profitTarget-profitActual).toLocaleString('id-ID'));
    const message='🎯 *UPDATE TARGET OUTLET — HELLO MAJESTY*\n🏪 *'+outlet.trim()+'*\n📅 '+month+' • sisa waktu '+remaining+' hari\n\n'+parts.join('\n')+'\n\n💪 *Kita masih punya kesempatan untuk mengejar target!* Fokus pada aktivitas yang menghasilkan: follow-up tepat waktu, handover berkualitas, dan closing yang sah. Setiap lead ditangani dengan serius, setiap hari ada kemajuan.\n\nAyo saling bantu dan jaga semangat sampai akhir bulan. Target ini kita kejar bersama!\n\n*Hello Majesty — Built on Trust.*';
    window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener');
  }
  function addTargetShareButtons(){
    if(!canShareTargets())return;
    const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5,strong,b')];
    headings.forEach(heading=>{
      const headingText=String(heading.innerText||heading.textContent||'').replace(/\\s+/g,' ').trim();
      if(!/^TARGET\\s+(Majesty Plaza iPhone|Majesty Refill Phone)$/i.test(headingText))return;
      let card=heading.parentElement;
      for(let i=0;i<7&&card;i++,card=card.parentElement){
        const text=card.innerText||card.textContent||'';
        if(/WA/i.test(text)&&/Handover/i.test(text)&&/Closing/i.test(text)&&/Target Laba/i.test(text))break;
      }
      if(!card||card===document.body)return;
      if(card.dataset.hmTargetShareAdded==='1')return;
      card.dataset.hmTargetShareAdded='1';
      const btn=document.createElement('button');
      btn.type='button';btn.className='success';btn.style.cssText='display:block;width:100%;margin:12px 0;min-height:46px;font-weight:700;position:relative;z-index:5';
      btn.textContent='📲 Share Pencapaian Target ke WhatsApp';
      btn.addEventListener('click',()=>shareTargetCard(card));
      heading.insertAdjacentElement('afterend',btn);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{enforceVisibility();addTargetShareButtons();});
  setTimeout(enforceVisibility,500);
  setTimeout(enforceVisibility,1500);
  const visibilityObserver=new MutationObserver(()=>{enforceVisibility();addTargetShareButtons();});
  visibilityObserver.observe(document.documentElement,{childList:true,subtree:true});
})();