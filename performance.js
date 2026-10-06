(function(){
  function fmt(n){ return Number(n||0).toLocaleString('id-ID'); }
  function pct(a,b){ return Number(b||0) ? Math.round(Number(a||0)/Number(b)*100) : 0; }
  function escP(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function loadTarget(){
    const x=await sb.rpc('dashboard_target_summary');
    if(x.error) throw x.error;
    return x.data || {};
  }

  async function loadSalesSummary(){
    let q=sb.from('sales_transactions').select('id,sale_price,discount,gross_profit,outlet');
    if(!profile?.is_management && profile?.outlet) q=q.eq('outlet',profile.outlet);
    const x=await q;
    if(x.error) throw x.error;
    const rows=x.data||[];
    return {
      units:rows.length,
      omzet:rows.reduce((n,r)=>n+Number(r.sale_price||0)-Number(r.discount||0),0),
      profit:rows.reduce((n,r)=>n+Number(r.gross_profit||0),0)
    };
  }

  function targetRows(data){
    if(Array.isArray(data)) return data;
    if(Array.isArray(data?.outlets)) return data.outlets;
    return [];
  }

  function targetCard(o){
    const unitTarget=Number(o.closing_target||o.unit_target||o.target_unit||0);
    const unitActual=Number(o.closing_actual||o.unit_actual||o.actual_unit||0);
    const nominalTarget=Number(o.nominal_target||o.omzet_target||o.sales_target||o.target_nominal||0);
    const nominalActual=Number(o.nominal_actual||o.omzet_actual||o.sales_actual||o.actual_nominal||0);
    const up=pct(unitActual,unitTarget);
    const np=pct(nominalActual,nominalTarget);
    return '<div class="lead">'+
      '<div class="row" style="justify-content:space-between;align-items:center">'+
      '<b>🏪 '+escP(o.outlet||'-')+'</b><span class="badge">'+up+'% unit</span></div>'+
      '<div class="small" style="margin-top:8px">Unit: <b>'+fmt(unitActual)+'</b> / '+fmt(unitTarget)+'</div>'+
      '<div class="small">Nominal: <b>Rp'+fmt(nominalActual)+'</b> / Rp'+fmt(nominalTarget)+'</div>'+
      '<div class="small" style="margin-top:4px">Pencapaian nominal: <b>'+np+'%</b></div>'+
      '</div>';
  }

  async function render(mode){
    const body=document.getElementById('perfBody');
    if(!body) return;
    body.innerHTML='<p class="small">Memuat Target & Performa...</p>';
    try{
      const target=await loadTarget();
      const rows=targetRows(target);
      const sales=await loadSalesSummary();

      let html='<div class="stats">'+
        '<div class="stat"><div class="small">Penjualan</div><div class="num">'+fmt(sales.units)+'</div></div>'+
        '<div class="stat"><div class="small">Omzet</div><div class="num">Rp'+fmt(sales.omzet)+'</div></div>'+
        '<div class="stat"><div class="small">Laba</div><div class="num">Rp'+fmt(sales.profit)+'</div></div>'+
        '</div>';

      if(rows.length){
        html+='<h4 style="margin:14px 0 8px">🎯 Target Outlet</h4>'+rows.map(targetCard).join('');
      }else{
        html+='<div class="lead"><b>🎯 Target belum tersedia</b><div class="small" style="margin-top:6px">Belum ada data target outlet yang dapat ditampilkan.</div></div>';
      }

      body.innerHTML=html;
    }catch(e){
      console.error('[HM] Performance',e);
      body.innerHTML='<div class="lead"><b>Gagal memuat Target & Performa</b><div class="small" style="margin-top:6px;color:#b91c1c">'+escP(e?.message||e)+'</div><button class="secondary" type="button" style="margin-top:10px" onclick="perfShow(window.perfMyMode||\'month\')">↻ Coba Lagi</button></div>';
    }
  }

  window.openPerformance=async function(){
    const mg=!!profile?.is_management;
    let box=document.getElementById('performance');
    if(!box){
      box=document.createElement('div');
      box.id='performance';
      box.className='box';
      const ws=document.getElementById('workspace');
      if(ws) ws.prepend(box);
    }
    box.classList.remove('hidden');
    box.innerHTML='<h3>'+ (mg?'📊 Target & Performa':'🎯 Target & Performa Saya') +'</h3>'+
      '<div class="small" style="margin-bottom:10px">'+(mg?'Ringkasan target dan realisasi seluruh outlet.':'Ringkasan target dan realisasi outlet Anda.')+'</div>'+
      '<div class="row" style="flex-wrap:wrap">'+
      '<button class="secondary" id="perfRefresh">↻ Refresh</button>'+
      '</div>'+
      '<div id="perfBody" style="margin-top:10px"></div>';
    document.getElementById('perfRefresh').onclick=function(){ render('month'); };
    window.perfMyMode='month';
    await render('month');
  };

  window.perfShow=render;
})();