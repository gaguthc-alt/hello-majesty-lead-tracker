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

  // Sumber tunggal KPI Closing: transaksi penjualan yang sudah sah.
  // Ini otomatis mencakup penjualan Lead maupun Walk-In setelah menjadi sales transaction.
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
    const closingActual=Number(s.units||0);
    const profitTarget=Number(o.nominal_target||0);
    const profitActual=Number(s.profit||0);
    const unitPct=pct(closingActual,closingTarget);
    const profitPct=pct(profitActual,profitTarget);
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
        '<div class="row" style="justify-content:space-between"><b>📈 Profit / Laba</b><b>Rp'+fmt(profitActual)+'</b></div>'+
        '<div class="small" style="margin-top:4px">Target Profit Rp'+fmt(profitTarget)+' • Pencapaian '+profitPct+'%</div>'+
        '<div class="small" style="margin-top:3px">Omzet: Rp'+fmt(s.omzet||0)+' • tidak digunakan untuk KPI nominal</div>'+
      '</div>'+
      '<div class="small" style="margin-top:7px">🎁 '+escP(o.bonus_label||'Bonus belum diatur')+(Number(o.bonus_amount||0)?' • Rp'+fmt(o.bonus_amount):'')+'</div>'+
    '</div>';
  }

  async function getFunnel(mode){
    const start=monthStart(mode).toISOString(), end=monthEnd(mode).toISOString();
    const x=await sb.rpc('team_lead_funnel_report',{p_start:start,p_end:end});
    if(x.error)throw x.error; return x.data||[];
  }
  async function showPerson(name,role,mode){
    const body=document.getElementById('perfBody'); if(!body)return;
    body.innerHTML='<div class="small">⏳ Memuat detail '+escP(name)+'...</div>';
    try{
      const x=await sb.rpc('team_lead_funnel_detail',{p_employee:name,p_role:role,p_start:monthStart(mode).toISOString(),p_end:monthEnd(mode).toISOString()});
      if(x.error)throw x.error; const rows=x.data||[], counts={};
      rows.forEach(r=>counts[r.event_type]=(counts[r.event_type]||0)+1);
      let html='<div class="row" style="justify-content:space-between;align-items:center"><button class="secondary" type="button" onclick="window.perfShow(window.perfMyMode||\'month\')">← Kembali</button><b>👤 '+escP(name)+' • '+escP(role)+'</b></div>';
      html+='<div class="box" style="margin-top:10px"><b>📌 Aktivitas</b><div class="stats" style="margin-top:8px">';
      Object.entries(counts).forEach(([k,v])=>html+='<div class="stat"><div class="small">'+escP(k)+'</div><div class="num">'+fmt(v)+'</div></div>');
      html+='</div></div><div class="box"><b>📋 Detail Lead</b>';
      rows.slice(0,100).forEach(r=>html+='<div class="lead" style="margin-top:7px"><div class="row" style="justify-content:space-between"><b>'+escP(r.event_type)+'</b><span class="small">'+new Date(r.event_at).toLocaleString('id-ID')+'</span></div><div class="small" style="margin-top:4px">Lead: '+escP(r.lead_id||'-')+(r.customer?' • '+escP(r.customer):'')+'</div><div class="small">'+escP(r.product||'-')+'</div></div>');
      if(!rows.length)html+='<div class="small" style="margin-top:7px">Belum ada aktivitas.</div>';
      html+='</div>'; body.innerHTML=html;
    }catch(e){body.innerHTML='<div class="lead"><b>Gagal memuat detail</b><div class="small" style="margin-top:6px;color:#b91c1c">'+escP(e?.message||e)+'</div></div>';}
  }
  async function render(mode){
    const body=document.getElementById('perfBody'); if(!body)return;
    body.innerHTML='<div class="small">⏳ Memuat funnel lead tim...</div>';
    try{
      const rows=await getFunnel(mode);
      const sales=await getSales(mode); const totalSold=Object.values(sales).reduce((a,s)=>a+(Number(s.units)||0),0); const total=rows.reduce((a,r)=>{a.handled+=+r.handled||0;a.qualified+=+r.qualified||0;a.handover+=+r.handover||0;return a;},{handled:0,qualified:0,handover:0});
      let html='<div class="stats"><div class="stat"><div class="small">📲 Lead / Handle</div><div class="num">'+fmt(total.handled)+'</div></div><div class="stat"><div class="small">🔍 Qualified</div><div class="num">'+fmt(total.qualified)+'</div></div><div class="stat"><div class="small">🤝 Handover</div><div class="num">'+fmt(total.handover)+'</div></div><div class="stat"><div class="small">🏆 SOLD / Closing</div><div class="num">'+fmt(totalSold)+'</div></div></div>';
      html+='<div class="box"><div class="row" style="justify-content:space-between"><b>📊 FUNNEL PERFORMA PER ORANG</b><span class="small">'+escP(monthLabel(mode))+'</span></div><div class="small" style="margin-top:5px">CS dan Sales dipisahkan. Closing per orang bersumber dari transaksi SOLD; Walk-In tetap dihitung sebagai closing. Klik nama untuk detail.</div></div>';
      html+='<div class="box" style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px">Nama</th><th>Fungsi</th><th>WA/Lead</th><th>Qualified</th><th>Handover</th><th>Closing</th><th>Conv.</th></tr></thead><tbody>';
      rows.forEach(r=>html+='<tr style="cursor:pointer;border-top:1px solid #e5e7eb" onclick="window.perfPerson('+JSON.stringify(r.employee_name)+','+JSON.stringify(r.role)+','+JSON.stringify(mode)+')"><td style="padding:9px"><b>'+escP(r.employee_name)+'</b></td><td style="text-align:center"><span class="badge">'+escP(r.role)+'</span></td><td style="text-align:center">'+fmt(r.handled)+'</td><td style="text-align:center">'+fmt(r.qualified)+'</td><td style="text-align:center">'+fmt(r.handover)+'</td><td style="text-align:center"><b>'+fmt(r.closing)+'</b></td><td style="text-align:center">'+fmt(r.conversion)+'%</td></tr>');
      html+='</tbody></table></div>'; body.innerHTML=html;
    }catch(e){console.error('[HM] Funnel Performa',e);body.innerHTML='<div class="lead"><b>Gagal memuat Laporan Performa Tim</b><div class="small" style="margin-top:6px;color:#b91c1c">'+escP(e?.message||e)+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="window.perfShow(window.perfMyMode||\'month\')">↻ Coba Lagi</button></div>';}
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
    box.innerHTML='<h3 style="margin-top:0">📊 LAPORAN PERFORMA TIM</h3>'+
      '<div class="small" style="margin-bottom:10px">Funnel lead per orang: WA/Lead yang ditangani → Qualified → Handover → Closing.</div>'+
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
  window.perfPerson=showPerson;
})();