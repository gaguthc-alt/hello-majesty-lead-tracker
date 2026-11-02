(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>'Rp'+Number(v||0).toLocaleString('id-ID');
  const allowed=()=>{const p=window.profile||{};const role=String(p.role||'').trim().toUpperCase().replace(/[_-]+/g,' ');return p.is_management===true && (role==='MANAGEMENT'||role==='BUSINESS LEADER');};
  const monthNow=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';};
  function panel(title,html){
    let overlay=document.getElementById('hmTargetSettingsOverlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='hmTargetSettingsOverlay';
      overlay.innerHTML='<div id="hmTargetSettingsDialog"><div id="hmTargetSettingsHead"><strong id="hmTargetSettingsTitle"></strong><button type="button" id="hmTargetSettingsClose">✕ Tutup</button></div><div id="hmTargetSettingsBody"></div></div>';
      document.body.appendChild(overlay);
      const style=document.createElement('style');
      style.id='hmTargetSettingsStyle';
      style.textContent='#hmTargetSettingsOverlay{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;padding: max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))!important;background:rgba(4,12,24,.72)!important;overflow-y:auto!important;box-sizing:border-box!important}#hmTargetSettingsDialog{display:flex!important;flex-direction:column!important;width:min(760px,100%)!important;max-height:calc(100dvh - 24px)!important;margin:auto!important;background:#fff!important;color:#101828!important;border-radius:20px!important;box-shadow:0 20px 60px rgba(0,0,0,.35)!important;overflow:hidden!important;min-height:0!important}#hmTargetSettingsHead{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:16px!important;background:#fff!important;color:#101828!important;border-bottom:1px solid #e4e7ec!important;flex:0 0 auto!important}#hmTargetSettingsTitle{font-size:18px!important;font-weight:800!important}#hmTargetSettingsClose{background:#344054!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:12px 16px!important;white-space:nowrap!important}#hmTargetSettingsBody{display:block!important;visibility:visible!important;opacity:1!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding:14px!important;min-height:120px!important;color:#101828!important;background:#fff!important;flex:1 1 auto!important}#hmTargetSettingsBody .box,#hmTargetSettingsBody .lead{display:block!important;visibility:visible!important;opacity:1!important;background:#f8fafc!important;color:#101828!important;border:1px solid #d0d5dd!important;border-radius:14px!important;padding:14px!important;margin:8px 0!important;box-sizing:border-box!important}#hmTargetSettingsBody label{display:block!important;color:#344054!important;font-weight:700!important;margin:10px 0 5px!important}#hmTargetSettingsBody input{display:block!important;width:100%!important;min-height:44px!important;background:#fff!important;color:#101828!important;border:1px solid #98a2b3!important;border-radius:9px!important;padding:10px!important;box-sizing:border-box!important}#hmTargetSettingsBody .stats{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}#hmTargetSettingsBody button.success{display:block!important;width:100%!important;min-height:46px!important;background:#15803d!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:12px!important}@media(max-width:480px){#hmTargetSettingsDialog{max-height:calc(100dvh - 16px)!important;border-radius:16px!important}#hmTargetSettingsBody{padding:10px!important}#hmTargetSettingsBody .stats{grid-template-columns:1fr!important}}';
      document.head.appendChild(style);
      document.getElementById('hmTargetSettingsClose').onclick=()=>overlay.remove();
    }
    document.getElementById('hmTargetSettingsTitle').textContent=title;
    document.getElementById('hmTargetSettingsBody').innerHTML=html;
    overlay.style.display='flex';
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
    list.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;min-height:100px!important;color:#101828!important;background:#fff!important';
    list.innerHTML='<div style="display:block!important;padding:14px;color:#344054;background:#f2f4f7;border-radius:10px">⏳ Memuat target…</div>';
    try{
    if(!window.sb){list.innerHTML='<div style="padding:14px;background:#fff1f0;color:#b42318;border-radius:10px">Koneksi database belum siap. Muat ulang halaman lalu coba kembali.</div>';return;}
    const r=await window.sb.from('monthly_outlet_targets').select('*').eq('month_start',ms).order('outlet');
    if(r.error){list.innerHTML='<div style="padding:14px;background:#fff1f0;color:#b42318;border-radius:10px">Gagal memuat target: '+esc(r.error.message)+'</div>';return;}
    const rows=r.data||[];
    const known=['Majesty Plaza iPhone','Majesty Refill Phone','Majesty Space'];
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
       '</div><button class="success" style="margin-top:10px;width:100%" data-outlet="'+esc(name)+'" onclick="hmSaveTarget('+i+', this.dataset.outlet)">💾 Simpan Target '+esc(name)+'</button></div>';
    }).join('');
    window._hmTargetRows=names;
    }catch(e){
      console.error('[HM target settings load]',e);
      list.innerHTML='<div style="padding:14px;background:#fff1f0;color:#b42318;border-radius:10px">Pengaturan target gagal dimuat: '+esc(e?.message||String(e))+'</div>';
    }
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
    await window.hmLoadTargets();
    try{if(typeof window.hmRenderHomePerformance==='function')await window.hmRenderHomePerformance();}catch(e){console.warn('[HM] Refresh ringkasan target:',e);}
    if(typeof window.showHMToast==='function')window.showHMToast('✅ Target '+outlet+' berhasil diperbarui.');
    else alert('Target '+outlet+' bulan '+month+' berhasil disimpan.');
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
      if(!/^TARGET\\s+(Majesty Plaza iPhone|Majesty Refill Phone|Majesty Space)$/i.test(headingText))return;
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