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
      '</div><button class="success" style="margin-top:10px;width:100%" onclick="hmSaveTarget('+i+',\''+esc(name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'\')">💾 Simpan Target '+esc(name)+'</button></div>';
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
  document.addEventListener('DOMContentLoaded',enforceVisibility);
  setTimeout(enforceVisibility,500);
  setTimeout(enforceVisibility,1500);
  const visibilityObserver=new MutationObserver(enforceVisibility);
  visibilityObserver.observe(document.documentElement,{childList:true,subtree:true});
})();