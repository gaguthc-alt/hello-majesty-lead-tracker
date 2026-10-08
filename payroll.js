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
    return new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10);
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
        ' | Sales '+rp(r.sales_commission)+
        ' | Hunter '+rp(r.hunter_commission)+
        ' | Content '+rp(r.content_creator_commission)+
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

  async function renderCommissionDetail(host){
    const rows=await loadCommission();
    const groups={};
    rows.forEach(r=>(groups[r.outlet]??=[]).push(r));
    let html='<div style="overflow:auto;border:1px solid #e5e7eb;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:980px"><thead><tr style="background:#f8fafc">'+
      '<th style="text-align:left;padding:9px">Nama</th>'+
      '<th style="text-align:right;padding:9px">CS Handover</th>'+
      '<th style="text-align:right;padding:9px">CS Closing</th>'+
      '<th style="text-align:right;padding:9px">Sales</th>'+
      '<th style="text-align:right;padding:9px">Hunter</th>'+
      '<th style="text-align:right;padding:9px">Content</th>'+
      '<th style="text-align:right;padding:9px">Fasilitator</th>'+
      '<th style="text-align:right;padding:9px">Total</th>'+
      '</tr></thead><tbody>';
    Object.entries(groups).forEach(([outlet,list])=>{
      html+='<tr><td colspan="8" style="padding:8px 9px;background:#eef2f7;font-weight:800">'+esc(outlet)+'</td></tr>';
      list.forEach(r=>{
        const handover=Math.max(Number(r.cs_commission||0)-Number(r.cs_closing_commission||0),0);
        html+='<tr>'+
          '<td style="padding:8px 9px;border-top:1px solid #eef2f7;font-weight:600">'+esc(r.name)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(handover)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.cs_closing_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.sales_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.hunter_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.content_creator_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7">'+rp(r.facilitator_commission)+'</td>'+
          '<td style="padding:8px 9px;text-align:right;border-top:1px solid #eef2f7;font-weight:800">'+rp(r.total_commission)+'</td>'+
        '</tr>';
      });
    });
    html+='</tbody></table></div>';
    host.innerHTML=html;
  }

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