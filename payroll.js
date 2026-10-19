/* HELLO MAJESTY PAYROLL — commission copy & detail helper */
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
    const x=await window.sb.rpc('management_team_commission_report',{p_month_start:monthStart()});
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
        ' | Hunter '+rp(r.hunter_commission)+\n        ' | Checker '+rp(r.checker_commission)+
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
    const sums={handover:0,closing:0,sales:0,freelance:0,hunter:0,checker:0,content:0,facilitator:0,profit:0};
    rows.forEach(r=>{
      sums.handover+=Math.max(Number(r.cs_commission||0)-Number(r.cs_closing_commission||0),0);
      sums.closing+=Number(r.cs_closing_commission||0);
      sums.sales+=Number(r.sales_commission||0);
      sums.freelance+=Number(r.freelance_internal_commission||r.freelance_commission||0);
      sums.hunter+=Number(r.hunter_commission||0);\n      sums.checker+=Number(r.checker_commission||0);
      sums.content+=Number(r.content_creator_commission||0);
      sums.facilitator+=Number(r.facilitator_commission||0);
      sums.profit+=Number(r.outlet_profit||r.gross_profit||r.profit||0);
    });
    const total=sums.handover+sums.closing+sums.sales+sums.freelance+sums.hunter+sums.checker+sums.content+sums.facilitator;
    const data=[
      ['CS Handover',sums.handover,10,10],['CS Closing',sums.closing,5,5],['Sales',sums.sales,10,10],
      ['Freelance Internal',sums.freelance,30,10],['Hunter',sums.hunter,10,10],['Checker',sums.checker,5,5],['Content Creator',sums.content,10,10],['Fasilitator',sums.facilitator,10,10]
    ];
    const pct=v=>sums.profit>0?(v/sums.profit*100).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—';
    const rowsHtml=data.map(([name,amount,formula,budget])=>
      '<tr><td>'+esc(name)+'</td><td class="hm-cs-amount">'+rp(amount)+'</td><td>'+pct(amount)+'</td><td>'+formula+'%</td><td>'+budget+'%</td></tr>'
    ).join('');
    return '<section class="hm-commission-summary"><h3 style="margin:12px 0">📊 Rekap Komisi per Jenis</h3><div class="hm-cs-desktop"><div style="overflow:auto;border:1px solid #e5e7eb;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f8fafc"><th style="text-align:left;padding:10px">Jenis Komisi</th><th style="text-align:right;padding:10px">Nominal</th><th style="text-align:right;padding:10px">% terhadap Laba</th><th style="text-align:right;padding:10px">% Rumus Komisi</th><th style="text-align:right;padding:10px">% Max Budget</th></tr></thead><tbody>'+rowsHtml+'<tr style="font-weight:800;background:#f8fafc"><td style="padding:10px">Total</td><td style="text-align:right;padding:10px">'+rp(total)+'</td><td style="text-align:right;padding:10px">'+pct(total)+'</td><td style="text-align:right;padding:10px">—</td><td style="text-align:right;padding:10px">60%</td></tr></tbody></table></div></div><div class="hm-cs-mobile">'+data.map(([name,amount,formula,budget])=>'<article style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:8px 0"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>'+esc(name)+'</b><b>'+rp(amount)+'</b></div><div class="hm-cs-mobile-grid"><div><small>% terhadap Laba</small><strong>'+pct(amount)+'</strong></div><div><small>% Rumus Komisi</small><strong>'+formula+'%</strong></div><div><small>% Max Budget</small><strong>'+budget+'%</strong></div></div></article>').join('')+'<article style="border:2px solid #cbd5e1;border-radius:12px;padding:12px;margin-top:12px"><div style="display:flex;justify-content:space-between;gap:10px"><b>Total Komisi</b><b>'+rp(total)+'</b></div><div class="hm-cs-mobile-grid"><div><small>% terhadap Laba</small><strong>'+pct(total)+'</strong></div><div><small>% Rumus Komisi</small><strong>—</strong></div><div><small>% Max Budget</small><strong>60%</strong></div></div></article></div></section>';
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
      '<th style="text-align:right;padding:9px">Hunter</th>'+\n      '<th style="text-align:right;padding:9px">Checker</th>'+
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
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.hunter_commission)+'</td>'+\n          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.checker_commission)+'</td>'+
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
  css.textContent='.hm-cs-mobile{display:none}.hm-cs-mobile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.hm-cs-mobile-grid small{display:block;color:#64748b;font-size:11px}.hm-cs-mobile-grid strong{display:block;margin-top:3px;font-size:14px}@media(max-width:640px){.hm-cs-desktop{display:none!important}.hm-cs-mobile{display:block!important}.hm-cs-mobile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-cs-mobile-grid>div:last-child{grid-column:1/-1}}';
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