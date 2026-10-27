/* HELLO MAJESTY PAYROLL — commission copy & detail helper | budget-alert-v3 | 2026-10-28 */
(function(){
  'use strict';

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function rp(v){return 'Rp'+Math.round(Number(v||0)).toLocaleString('id-ID');}
  function monthStart(){
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
  }

  async function loadCommission(){
    if(!window.sb) throw new Error('Koneksi database belum siap.');
    const x=await window.sb.rpc('management_team_commission_report_v3',{p_month_start:monthStart()});
    if(x.error) throw x.error;
    return Array.isArray(x.data)?x.data:[];
  }

  function buildText(rows){
    const lines=['KOMISI TIM — '+new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'}),''];
    let current='';
    rows.forEach(r=>{
      if(r.outlet!==current){
        current=r.outlet;
        lines.push(current.toUpperCase());
      }
      const handover=Math.max(Number(r.cs_commission||0)-Number(r.cs_closing_commission||0),0);
      lines.push(
        r.name+' | CS Handover '+rp(handover)+
        ' | CS Closing '+rp(r.cs_closing_commission)+
        ' | Sales Closing '+rp(r.sales_commission)+
        ' | Hunter '+rp(r.hunter_commission)+
        ' | Checker '+rp(r.checker_commission)+
        ' | Content Creator '+rp(r.content_creator_commission)+
        ' | Fasilitator '+rp(r.facilitator_commission)+
        ' | TOTAL '+rp(r.total_commission)
      );
    });
    return lines.join('\n');
  }

  async function copyCommissionReport(){
    try{
      const rows=await loadCommission();
      const text=buildText(rows);
      await navigator.clipboard.writeText(text);
      const b=document.getElementById('hmCopyCommissionBtn');
      if(b){const old=b.textContent;b.textContent='✅ Tersalin';setTimeout(()=>b.textContent=old,1400);}
      else alert('Laporan komisi berhasil disalin.');
    }catch(e){
      console.error('[HM] copy commission',e);
      alert('Gagal menyalin laporan komisi: '+(e?.message||e));
    }
  }


  function renderCommissionSummary(rows){
    const budgets=[
      ['CS Handover',10,'handover'],['CS Closing',5,'closing'],['Sales',10,'sales'],
      ['Freelance Internal',5,'freelance'],['Hunter',5,'hunter'],['Checker',5,'checker'],
      ['Content Creator',10,'content'],['Fasilitator',10,'facilitator']
    ];
    const outlets={};
    rows.forEach(r=>{
      const key=r.outlet||'Outlet tidak diketahui';
      const s=outlets[key]||(outlets[key]={profit:0,handover:0,closing:0,sales:0,freelance:0,hunter:0,checker:0,content:0,facilitator:0});
      s.profit=Math.max(s.profit,Number(r.outlet_profit||0));
      s.handover+=Math.max(Number(r.cs_commission||0)-Number(r.cs_closing_commission||0),0);
      s.closing+=Number(r.cs_closing_commission||0);
      s.sales+=Number(r.sales_commission||0);
      s.freelance+=Number(r.freelance_internal_commission||r.freelance_commission||0);
      s.hunter+=Number(r.hunter_commission||0);
      s.checker+=Number(r.checker_commission||0);
      s.content+=Number(r.content_creator_commission||0);
      s.facilitator+=Number(r.facilitator_commission||0);
    });
    const pct=(amount,profit)=>profit>0?(amount/profit*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—';
    return '<section class="hm-commission-summary"><h3 style="margin:12px 0">📊 Rekap Komisi & Peringatan Budget</h3>'+
      '<p class="small" style="margin:0 0 10px">Acuan budget adalah indikator peringatan untuk Management, bukan batas pembayaran. Komisi tidak dipotong otomatis.</p>'+
      Object.entries(outlets).map(([outlet,s])=>{
        const total=budgets.reduce((n,b)=>n+s[b[2]],0);
        const detail=budgets.map(([name,budget,key])=>{
          const amount=s[key],ratio=s.profit>0?amount/s.profit*100:null,over=ratio!==null&&ratio>budget;
          return '<tr'+(over?' class="hm-budget-over"':'')+'><td data-label="No">'+(budgets.findIndex(b=>b[2]===key)+1)+'</td><td data-label="Jenis Komisi">'+esc(name)+'</td><td data-label="Nominal" class="hm-cs-amount">'+rp(amount)+'</td><td data-label="% terhadap Laba"><span class="hm-budget-pct'+(over?' is-over':'')+'" style="display:inline-block!important;padding:5px 10px!important;border-radius:20px!important;background:'+(over?'#ffe0e3':'#e8eef5')+'!important;color:'+(over?'#b42332':'#263b55')+'!important;-webkit-text-fill-color:'+(over?'#b42332':'#263b55')+'!important;font-weight:800!important;opacity:1!important">'+pct(amount,s.profit)+'</span></td><td data-label="Acuan Budget">'+budget+'%</td><td data-label="Status"><span class="hm-budget-status '+(over?'is-over':'is-safe')+'" style="display:inline-block!important;padding:6px 10px!important;border-radius:20px!important;background:'+(over?'#fee2e2':'#dcfce7')+'!important;color:'+(over?'#b42332':'#166534')+'!important;-webkit-text-fill-color:'+(over?'#b42332':'#166534')+'!important;font-size:12px!important;font-weight:800!important;opacity:1!important">'+(over?'⚠ Melebihi budget':'✓ Aman')+'</span></td></tr>';
        }).join('');
        const overAny=budgets.some(([,budget,key])=>s.profit>0&&s[key]/s.profit*100>budget);
        return '<div style="margin:12px 0;border:1px solid '+(overAny?'#dc2626':'#dbe2ea')+';border-radius:12px;padding:12px">'+
          '<h4 style="margin:0 0 8px">'+esc(outlet)+'</h4>'+
          '<div class="hm-budget-metrics"><div class="metric-profit"><small style="color:#067647!important;-webkit-text-fill-color:#067647!important;opacity:1!important">Total Laba Outlet</small><strong style="color:#064e3b!important;-webkit-text-fill-color:#064e3b!important;opacity:1!important">'+rp(s.profit)+'</strong></div><div class="metric-commission"><small style="color:#175cd3!important;-webkit-text-fill-color:#175cd3!important;opacity:1!important">Total Komisi</small><strong style="color:#123d78!important;-webkit-text-fill-color:#123d78!important;opacity:1!important">'+rp(total)+'</strong></div><div class="metric-ratio"><small style="color:#be123c!important;-webkit-text-fill-color:#be123c!important;opacity:1!important">Komisi terhadap Laba</small><strong style="color:#9f1239!important;-webkit-text-fill-color:#9f1239!important;opacity:1!important">'+pct(total,s.profit)+'</strong></div></div>'+
          (s.profit<=0?'<p class="hm-budget-note">⚠️ Laba outlet nol atau belum tersedia; rasio budget belum dapat dihitung.</p>':'')+
          (overAny?'<p class="hm-budget-alert">⚠️ Ada jenis komisi yang melewati acuan budget. Perlu ditinjau Management; tidak ada pemotongan otomatis.</p>':'')+
          '<div class="hm-budget-table-wrap"><table class="hm-budget-table"><thead><tr><th>No</th><th>Jenis Komisi</th><th>Nominal</th><th>% terhadap Laba</th><th>Acuan Budget</th><th>Status</th></tr></thead><tbody>'+detail+
          '<tr class="hm-budget-total"><td data-label="No"></td><td data-label="Jenis Komisi">Total</td><td data-label="Nominal">'+rp(total)+'</td><td data-label="% terhadap Laba">'+pct(total,s.profit)+'</td><td data-label="Acuan Budget">—</td><td data-label="Status">—</td></tr></tbody></table></div></div>';
      }).join('')+'</section>';
  }

  async function renderCommissionDetail(host){
    const rows=await loadCommission();
    const groups={};
    rows.forEach(r=>(groups[r.outlet]??=[]).push(r));
    let html=renderCommissionSummary(rows)+'<div style="overflow:auto;border:1px solid #e5e7eb;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:980px"><thead><tr style="background:#f8fafc">'+
      '<th style="text-align:left;padding:9px">Nama</th>'+
      '<th style="text-align:right;padding:9px">CS Handover</th>'+
      '<th style="text-align:right;padding:9px">CS Closing</th>'+
      '<th style="text-align:right;padding:9px">Sales Closing</th>'+
      '<th style="text-align:right;padding:9px">Hunter</th>'+
      '<th style="text-align:right;padding:9px">Checker</th>'+
      '<th style="text-align:right;padding:9px">Content Creator</th>'+
      '<th style="text-align:right;padding:9px">Fasilitator</th>'+
      '<th style="text-align:right;padding:9px">Total</th>'+
      '</tr></thead><tbody>';
    Object.entries(groups).forEach(([outlet,list])=>{
      html+='<tr><td colspan="9" style="padding:8px 9px;background:#eef2f7;font-weight:800">'+esc(outlet)+'</td></tr>';
      list.forEach(r=>{
        const handover=Math.max(Number(r.cs_commission||0)-Number(r.cs_closing_commission||0),0);
        html+='<tr>'+
          '<td style="padding:8px 9px;border-top:1px solid #eef2f7;font-weight:600">'+esc(r.name)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(handover)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.cs_closing_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.sales_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.hunter_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.checker_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.content_creator_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.facilitator_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7;font-weight:800">'+rp(r.total_commission)+'</td>'+
        '</tr>';
      });
    });
    html+='</tbody></table></div>';
    host.innerHTML=html;
  }

  const css=document.createElement('style');
  css.textContent='.hm-commission-summary{display:block!important;width:100%!important;min-width:0!important;color:#172b45!important}.hm-commission-summary h3{color:#14243b!important;line-height:1.35!important}.hm-commission-summary>p.small{color:#334155!important;line-height:1.5!important}.hm-budget-metrics{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:12px 0 14px!important;width:100%!important}.hm-budget-metrics>div{display:block!important;min-width:0!important;padding:13px 14px!important;border-radius:13px!important;border:1px solid #d5dfeb!important;box-sizing:border-box!important}.hm-budget-metrics small{display:block!important;color:#334155!important;font-size:13px!important;font-weight:700!important;line-height:1.4!important;margin:0 0 6px!important;opacity:1!important}.hm-budget-metrics strong{display:block!important;color:#152b45!important;font-size:clamp(15px,2vw,21px)!important;line-height:1.35!important;overflow-wrap:anywhere!important;opacity:1!important}.hm-budget-metrics .metric-profit{background:#ecfdf3!important;border-color:#a7f3c4!important}.hm-budget-metrics .metric-profit small{color:#067647!important}.hm-budget-metrics .metric-profit strong{color:#064e3b!important}.hm-budget-metrics .metric-commission{background:#eff6ff!important;border-color:#bfdbfe!important}.hm-budget-metrics .metric-commission small{color:#175cd3!important}.hm-budget-metrics .metric-commission strong{color:#123d78!important}.hm-budget-metrics .metric-ratio{background:#fff1f2!important;border-color:#fecdd3!important}.hm-budget-metrics .metric-ratio small{color:#be123c!important}.hm-budget-metrics .metric-ratio strong{color:#9f1239!important}.hm-budget-alert{display:block!important;background:#fff0f0!important;color:#991b1b!important;border:1px solid #fecaca!important;border-radius:12px!important;padding:13px 15px!important;font-weight:700!important;line-height:1.5!important;opacity:1!important}.hm-budget-note{background:#fff7ed!important;color:#9a3412!important;border:1px solid #fed7aa!important;border-radius:10px!important;padding:10px!important}.hm-budget-table-wrap{display:block!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;border:1px solid #dbe3ed!important;border-radius:12px!important;box-sizing:border-box!important}.hm-budget-table{display:table!important;width:100%!important;min-width:760px!important;table-layout:auto!important;border-collapse:separate!important;border-spacing:0!important;background:#fff!important;color:#172b45!important;font-size:13px!important}.hm-budget-table thead{display:table-header-group!important}.hm-budget-table tbody{display:table-row-group!important}.hm-budget-table tr{display:table-row!important}.hm-budget-table th{display:table-cell!important;background:#203b5b!important;color:#fff!important;text-align:left!important;padding:12px 10px!important;white-space:nowrap!important;font-weight:700!important;opacity:1!important}.hm-budget-table td{display:table-cell!important;padding:10px!important;border-bottom:1px solid #e2e8f0!important;vertical-align:middle!important;overflow-wrap:anywhere!important;color:#203047!important;background:transparent!important;opacity:1!important}.hm-budget-table tbody tr:nth-child(even){background:#f8fafc!important}.hm-budget-table .hm-budget-over{background:#fff0f0!important}.hm-budget-table .hm-budget-over td{color:#991b1b!important;background:transparent!important}.hm-budget-pct{display:inline-block!important;min-width:56px!important;text-align:center!important;padding:5px 9px!important;border-radius:20px!important;background:#e8eef5!important;color:#263b55!important;font-weight:800!important;opacity:1!important}.hm-budget-pct.is-over{background:#ffe0e3!important;color:#b42332!important}.hm-budget-status{display:inline-flex!important;justify-content:center!important;align-items:center!important;padding:6px 10px!important;border-radius:20px!important;font-weight:800!important;font-size:12px!important;line-height:1.3!important;white-space:nowrap!important;opacity:1!important;background-clip:padding-box!important}.hm-budget-status.is-safe{background:#dcfce7!important;color:#166534!important}.hm-budget-status.is-over{background:#fee2e2!important;color:#b42332!important}.hm-budget-table .hm-budget-total,.hm-budget-total{background:#203b5b!important;color:#fff!important;font-weight:800!important}.hm-budget-table .hm-budget-total td{background:#203b5b!important;color:#fff!important;border-bottom:0!important}@media(max-width:700px){.hm-budget-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}.hm-budget-metrics>div:last-child{grid-column:1/-1!important}.hm-budget-table-wrap{overflow-x:auto!important;border:1px solid #dbe3ed!important}.hm-budget-table{display:table!important;width:100%!important;min-width:760px!important;table-layout:auto!important;border-collapse:separate!important;background:#fff!important}.hm-budget-table thead{display:table-header-group!important}.hm-budget-table tbody{display:table-row-group!important}.hm-budget-table tbody tr{display:table-row!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important}.hm-budget-table tbody tr:nth-child(even){background:#f8fafc!important}.hm-budget-table tbody tr.hm-budget-over{background:#fff1f2!important}.hm-budget-table td{display:table-cell!important;padding:8px 7px!important;border-bottom:1px solid #e2e8f0!important;text-align:left!important;white-space:nowrap!important;font-size:12px!important;color:#203047!important}.hm-budget-table td:before{display:none!important;content:none!important}.hm-budget-table td:first-child{display:table-cell!important;grid-column:auto!important;border-bottom:1px solid #e2e8f0!important;margin:0!important;padding:8px 7px!important;font-size:12px!important;color:#203047!important}.hm-budget-table .hm-budget-total td{color:#fff!important;background:#203b5b!important}}';
  document.head.appendChild(css);

  async function enhance(){
    const box=document.getElementById('hmPayrollBox');
    if(!box || box.dataset.hmCommissionEnhanced==='1') return;
    const headings=[...box.querySelectorAll('h3')];
    const heading=headings.find(x=>x.textContent.includes('Komisi Tim'));
    if(!heading) return;
    box.dataset.hmCommissionEnhanced='1';

    const section=heading.closest('.box')||heading.parentElement;
    if(!section)return;

    const actions=document.createElement('div');
    actions.className='row';
    actions.style.margin='0 0 10px';
    actions.innerHTML='<button id="hmCopyCommissionBtn" class="secondary" type="button">📋 Copy Laporan Komisi</button>';
    actions.querySelector('button').onclick=copyCommissionReport;
    heading.parentElement.insertBefore(actions,heading.nextSibling);

    const tables=section.querySelectorAll('table');
    const old=tables[0];
    const host=document.createElement('div');
    host.style.marginTop='10px';
    if(old) old.replaceWith(host);
    else section.appendChild(host);
    try{await renderCommissionDetail(host);}
    catch(e){host.innerHTML='<div class="small">Gagal memuat rincian komisi: '+esc(e?.message||e)+'</div>';}
  }

  const obs=new MutationObserver(()=>{enhance().catch(e=>console.warn('[HM] commission UI',e));});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>enhance().catch(()=>{}),1000);

  window.hmCopyCommissionReport=copyCommissionReport;
  window.hmOpenPayroll = window.hmOpenPayroll || function(){
    const panel=document.getElementById('hmMenuPanel'),body=document.getElementById('hmMenuPanelBody'),title=document.getElementById('hmMenuPanelTitle');
    if(panel&&body){
      if(title)title.textContent='💼 Payroll';
      body.innerHTML='<div class="box"><h2 style="margin-top:0">💼 Payroll</h2><div class="small">Pusat pengelolaan gaji Hello Majesty.</div></div>';
      panel.classList.remove('hidden');
    }
  };
})();