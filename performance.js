(function(){
  function fmt(n){return Number(n||0).toLocaleString('id-ID');}
  function nominal(n){
    n=Number(n||0);
    if(Math.abs(n)>=1000000000)return (n/1000000000).toFixed(1).replace('.0','')+'M';
    if(Math.abs(n)>=1000000)return (n/1000000).toFixed(1).replace('.0','')+'jt';
    if(Math.abs(n)>=1000)return (n/1000).toFixed(0)+'rb';
    return fmt(n);
  }
  function pct(a,t){return Number(t)>0?Math.round(Number(a||0)/Number(t)*100):0;}
  function escP(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function monthStart(mode){
    const d=new Date();
    if(mode==='last_month')d.setMonth(d.getMonth()-1);
    return new Date(d.getFullYear(),d.getMonth(),1);
  }
  function monthEnd(mode){
    const d=monthStart(mode);
    return new Date(d.getFullYear(),d.getMonth()+1,1);
  }
  function monthLabel(mode){
    return monthStart(mode).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  }

  async function getTargets(mode){
    if(mode==='month'){
      const x=await sb.rpc('dashboard_target_summary');
      if(x.error)throw x.error;
      return x.data||{};
    }
    const ms=monthStart(mode).toISOString().slice(0,10);
    const x=await sb.from('monthly_outlet_targets').select('*').eq('month_start',ms);
    if(x.error)throw x.error;
    return {outlets:x.data||[],management:true};
  }

  async function getSales(mode){
    const start=monthStart(mode).toISOString();
    const end=monthEnd(mode).toISOString();
    let q=sb.from('sales_transactions').select('id,outlet,sale_price,discount,gross_profit,sold_at');
    if(!profile?.is_management && profile?.outlet)q=q.eq('outlet',profile.outlet);
    const x=await q.gte('sold_at',start).lt('sold_at',end);
    if(x.error)throw x.error;
    const rows=x.data||[];
    const map={};
    rows.forEach(r=>{
      const k=r.outlet||'-';
      if(!map[k])map[k]={units:0,omzet:0,profit:0};
      map[k].units++;
      map[k].omzet+=Number(r.sale_price||0)-Number(r.discount||0);
      map[k].profit+=Number(r.gross_profit||0);
    });
    return map;
  }

  function outletCard(o,s){
    const closingTarget=Number(o.closing_target||0);
    const closingActual=Number(o.closing_actual??s.units??0);
    const nominalTarget=Number(o.nominal_target||0);
    const nominalActual=Number(s.omzet||0);
    const unitPct=pct(closingActual,closingTarget);
    const nominalPct=pct(nominalActual,nominalTarget);
    const waTarget=Number(o.wa_target||0),waActual=Number(o.wa_actual||0);
    const qTarget=Number(o.qualified_target||0),qActual=Number(o.qualified_actual||0);
    return '<div class="lead">'+
      '<div class="row" style="justify-content:space-between;align-items:center">'+
        '<b style="font-size:16px">🏪 '+escP(o.outlet||'-')+'</b>'+
        '<span class="badge">'+unitPct+'% Unit</span>'+
      '</div>'+
      '<div class="stats" style="margin-top:9px">'+
        '<div class="stat"><div class="small">📲 WA</div><div class="num">'+fmt(waActual)+' / '+fmt(waTarget)+'</div><div class="small">'+pct(waActual,waTarget)+'%</div></div>'+
        '<div class="stat"><div class="small">🔍 Qualified</div><div class="num">'+fmt(qActual)+' / '+fmt(qTarget)+'</div><div class="small">'+pct(qActual,qTarget)+'%</div></div>'+
        '<div class="stat"><div class="small">🏆 Closing</div><div class="num">'+fmt(closingActual)+' / '+fmt(closingTarget)+'</div><div class="small">'+unitPct+'%</div></div>'+
      '</div>'+
      '<div class="box" style="margin:8px 0 0;background:#f8fafc">'+
        '<div class="row" style="justify-content:space-between"><b>💰 Omzet</b><b>Rp'+fmt(nominalActual)+'</b></div>'+
        '<div class="small" style="margin-top:4px">Target Rp'+fmt(nominalTarget)+' • Pencapaian '+nominalPct+'%</div>'+
        '<div class="small" style="margin-top:3px">Laba: Rp'+fmt(s.profit||0)+'</div>'+
      '</div>'+
      '<div class="small" style="margin-top:7px">🎁 '+escP(o.bonus_label||'Bonus belum diatur')+(Number(o.bonus_amount||0)?' • Rp'+fmt(o.bonus_amount):'')+'</div>'+
    '</div>';
  }

  async function render(mode){
    const body=document.getElementById('perfBody');
    if(!body)return;
    body.innerHTML='<div class="small">⏳ Memuat target dan realisasi...</div>';
    try{
      const data=await getTargets(mode);
      const sales=await getSales(mode);
      let outlets=Array.isArray(data.outlets)?data.outlets:[];
      if(!profile?.is_management && profile?.outlet)outlets=outlets.filter(o=>o.outlet===profile.outlet);

      const total=outlets.reduce((a,o)=>{
        const s=sales[o.outlet]||{};
        a.targetUnit+=Number(o.closing_target||0);
        a.actualUnit+=Number(o.closing_actual??s.units??0);
        a.targetNominal+=Number(o.nominal_target||0);
        a.actualNominal+=Number(s.omzet||0);
        a.profit+=Number(s.profit||0);
        return a;
      },{targetUnit:0,actualUnit:0,targetNominal:0,actualNominal:0,profit:0});

      let html='<div class="stats">'+
        '<div class="stat"><div class="small">🏆 Unit</div><div class="num">'+fmt(total.actualUnit)+' / '+fmt(total.targetUnit)+'</div><div class="small">'+pct(total.actualUnit,total.targetUnit)+'% tercapai</div></div>'+
        '<div class="stat"><div class="small">💰 Omzet</div><div class="num">Rp'+nominal(total.actualNominal)+'</div><div class="small">Target Rp'+nominal(total.targetNominal)+' • '+pct(total.actualNominal,total.targetNominal)+'%</div></div>'+
        '<div class="stat"><div class="small">📈 Laba</div><div class="num">Rp'+nominal(total.profit)+'</div><div class="small">Realisasi periode</div></div>'+
      '</div>';

      html+='<div class="box"><div class="row" style="justify-content:space-between;align-items:center"><b>🏪 PERFORMA OUTLET</b><span class="small">'+escP(monthLabel(mode))+'</span></div></div>';
      html+=outlets.length?outlets.map(o=>outletCard(o,sales[o.outlet]||{})).join(''):'<div class="lead"><b>Target belum tersedia</b><div class="small" style="margin-top:5px">Belum ada target outlet untuk periode ini.</div></div>';
      body.innerHTML=html;
    }catch(e){
      console.error('[HM] Target & Performa',e);
      body.innerHTML='<div class="lead"><b>Gagal memuat Target & Performa</b><div class="small" style="margin-top:6px;color:#b91c1c">'+escP(e?.message||e)+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.perfShow(window.perfMyMode||\'month\')">↻ Coba Lagi</button></div>';
    }
  }

  window.openPerformance=async function(){
    let box=document.getElementById('performance');
    if(!box){
      box=document.createElement('div');
      box.id='performance';
      box.className='box';
      const ws=document.getElementById('workspace');
      if(ws)ws.prepend(box);
    }
    box.classList.remove('hidden');
    box.innerHTML='<h3 style="margin-top:0">🎯 TARGET & PERFORMA</h3>'+
      '<div class="small" style="margin-bottom:10px">Perbandingan target dengan pencapaian nyata penjualan per outlet.</div>'+
      '<div class="row" style="flex-wrap:wrap">'+
        '<button class="secondary" id="perfMonth">📊 Bulan Ini</button>'+
        '<button class="secondary" id="perfLastMonth">↩️ Bulan Kemarin</button>'+
      '</div>'+
      '<div id="perfBody" style="margin-top:10px"></div>';
    document.getElementById('perfMonth').onclick=function(){window.perfMyMode='month';render('month');};
    document.getElementById('perfLastMonth').onclick=function(){window.perfMyMode='last_month';render('last_month');};
    window.perfMyMode='month';
    await render('month');
  };
  window.perfShow=render;
})();