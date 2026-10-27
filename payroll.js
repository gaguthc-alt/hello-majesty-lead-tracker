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
          return '<tr'+(over?' class="hm-budget-over"':'')+'><td>'+esc(name)+(over?' <strong>⚠️ MELEBIHI BUDGET</strong>':'')+'</td><td class="hm-cs-amount">'+rp(amount)+'</td><td>'+pct(amount,s.profit)+'</td><td>'+budget+'%</td></tr>';
        }).join('');
        const overAny=budgets.some(([,budget,key])=>s.profit>0&&s[key]/s.profit*100>budget);
        return '<div style="margin:12px 0;border:1px solid '+(overAny?'#dc2626':'#dbe2ea')+';border-radius:12px;padding:12px">'+
          '<h4 style="margin:0 0 8px">'+esc(outlet)+'</h4>'+
          '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px"><span><small>Total Laba Outlet</small><br><strong>'+rp(s.profit)+'</strong></span><span><small>Total Komisi</small><br><strong>'+rp(total)+'</strong></span><span><small>Total Komisi terhadap Laba</small><br><strong>'+pct(total,s.profit)+'</strong></span></div>'+
          (s.profit<=0?'<p class="hm-budget-note">⚠️ Laba outlet nol atau belum tersedia; rasio budget belum dapat dihitung.</p>':'')+
          (overAny?'<p class="hm-budget-alert">⚠️ Ada jenis komisi yang melewati acuan budget. Perlu ditinjau Management; tidak ada pemotongan otomatis.</p>':'')+
          '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:left;padding:8px">Jenis Komisi</th><th style="text-align:right;padding:8px">Nominal</th><th style="text-align:right;padding:8px">% terhadap Laba</th><th style="text-align:right;padding:8px">Acuan Budget Merah</th></tr></thead><tbody>'+detail+
          '<tr style="font-weight:800;background:#f8fafc"><td style="padding:8px">Total</td><td style="text-align:right;padding:8px">'+rp(total)+'</td><td style="text-align:right;padding:8px">'+pct(total,s.profit)+'</td><td style="text-align:right;padding:8px">—</td></tr></tbody></table></div></div>';
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
  css.textContent='.hm-budget-over{background:#fef2f2;color:#991b1b}.hm-budget-over strong{display:block;font-size:11px}.hm-budget-alert{background:#fee2e2;color:#991b1b;border-radius:8px;padding:10px;font-weight:700}.hm-budget-note{background:#fff7ed;color:#9a3412;border-radius:8px;padding:10px}.hm-cs-mobile{display:none}.hm-cs-mobile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.hm-cs-mobile-grid small{display:block;color:#64748b;font-size:11px}.hm-cs-mobile-grid strong{display:block;margin-top:3px;font-size:14px}@media(max-width:640px){.hm-cs-desktop{display:none!important}.hm-cs-mobile{display:block!important}.hm-cs-mobile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-cs-mobile-grid>div:last-child{grid-column:1/-1}}';
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