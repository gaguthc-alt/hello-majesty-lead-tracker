(function(){
 const fmt=n=>Number(n||0).toLocaleString('id-ID');
 const escF=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const base=window.renderContentPerformance;
 if(typeof base!=='function'||base.__funnelWrapped)return;
 const wrapped=async function(){
  await base.apply(this,arguments);
  const root=document.getElementById('cpBody');if(!root)return;
  const box=document.createElement('section');box.id='cpFunnel';box.style.cssText='margin-top:18px;padding:14px;border:1px solid #dbe3ee;border-radius:16px;background:#fff';
  box.innerHTML='<h3 style="margin:0 0 6px">📊 CONTENT PERFORMANCE FUNNEL</h3><div class="small">Melacak perjalanan lead per Content Creator berdasarkan ID lead yang sama.</div><div class="small" id="cpfStatus" style="margin:10px 0">⏳ Menghitung funnel...</div><div id="cpfRows"></div><div class="small" style="margin-top:12px;color:#64748b">WA masuk dihitung dari pesan inbound yang sudah terhubung ke lead. Closing operasional dihitung dari event SALES_CLOSING. Omzet/laba hanya ditampilkan jika transaksi memiliki lead_id yang terhubung; transaksi yang belum tertaut tidak ditebak.</div>';
  root.appendChild(box);
  try{
   const now=new Date();const p={start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)};
   const leadQ=await sb.from('leads').select('id,lead_id,content_creator,created_at').gte('created_at',p.start.toISOString()).lt('created_at',p.end.toISOString());
   if(leadQ.error)throw leadQ.error;
   const leads=leadQ.data||[];
   const ids=leads.map(x=>x.lead_id).filter(Boolean);
   const uuidIds=leads.map(x=>x.id).filter(Boolean);
   const [evQ,msgQ,saleQ]=await Promise.all([
    ids.length?sb.from('lead_events').select('lead_id,event_type,event_at').in('lead_id',ids):Promise.resolve({data:[],error:null}),
    ids.length?sb.from('whatsapp_messages').select('lead_id,direction,created_at').eq('direction','INBOUND').in('lead_id',ids):Promise.resolve({data:[],error:null}),
    uuidIds.length?sb.from('sales_transactions').select('lead_id,sale_price,gross_profit,is_cancelled').in('lead_id',uuidIds):Promise.resolve({data:[],error:null})
   ]);
   if(evQ.error)throw evQ.error;if(msgQ.error)throw msgQ.error;if(saleQ.error)throw saleQ.error;
   const groups={};
   leads.forEach(l=>{const name=String(l.content_creator||'').trim()||'Belum teratribusi';const k=name.toLocaleLowerCase('id');if(!groups[k])groups[k]={name,leadIds:new Set(),wa:new Set(),claim:new Set(),handover:new Set(),salesClaim:new Set(),closing:new Set(),sales:new Set(),revenue:0,profit:0};groups[k].leadIds.add(l.lead_id);});
   const owner={};Object.entries(groups).forEach(([k,g])=>g.leadIds.forEach(id=>owner[id]=k));
   (msgQ.data||[]).forEach(m=>{const g=groups[owner[m.lead_id]];if(g)g.wa.add(m.lead_id);});
   (evQ.data||[]).forEach(e=>{const g=groups[owner[e.lead_id]];if(!g)return;const t=String(e.event_type||'').toUpperCase();if(t==='CS_CLAIM')g.claim.add(e.lead_id);if(t==='CS_POTENSIAL'||t==='CS_QUALIFIED')g.handover.add(e.lead_id);if(t==='SALES_CLAIM')g.salesClaim.add(e.lead_id);if(t==='SALES_CLOSING')g.closing.add(e.lead_id);});
   const leadByUuid={};leads.forEach(l=>leadByUuid[l.id]=l.lead_id);
   (saleQ.data||[]).forEach(s=>{if(s.is_cancelled)return;const leadId=leadByUuid[s.lead_id],g=groups[owner[leadId]];if(!g)return;g.sales.add(leadId);g.revenue+=Number(s.sale_price||0);g.profit+=Number(s.gross_profit||0);});
   const rows=Object.values(groups).sort((a,b)=>b.leadIds.size-a.leadIds.size);
   const th=['Content Creator','WA Masuk','CS Claim','CS Handover','Sales Claim','Closing','Transaksi tertaut'];
   const table='<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:690px"><thead><tr>'+th.map(x=>'<th style="padding:9px 7px;text-align:left;border-bottom:1px solid #dbe3ee">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(g=>'<tr><td style="padding:9px 7px;border-bottom:1px solid #edf1f6;font-weight:700">'+escF(g.name)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.wa.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.claim.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.handover.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.salesClaim.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.closing.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.sales.size)+'</td></tr>').join('')+'</tbody></table></div>';
   document.getElementById('cpfRows').innerHTML=table+'<div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">'+[['Omzet transaksi tertaut',rows.reduce((s,g)=>s+g.revenue,0)],['Laba transaksi tertaut',rows.reduce((s,g)=>s+g.profit,0)]].map(([k,v])=>'<div style="padding:10px;border:1px solid #e2e8f0;border-radius:12px"><div class="small">'+k+'</div><b>Rp '+fmt(v)+'</b></div>').join('')+'</div>';
   document.getElementById('cpfStatus').textContent=fmt(leads.length)+' lead dalam periode · '+fmt((msgQ.data||[]).length)+' pesan inbound terhubung · '+fmt((saleQ.data||[]).filter(s=>!s.is_cancelled).length)+' transaksi tertaut.';
  }catch(e){const s=document.getElementById('cpfStatus');if(s)s.innerHTML='<span style="color:#b91c1c">Funnel gagal dimuat: '+escF(e?.message||e)+'</span>';}
 };
 wrapped.__funnelWrapped=true;window.renderContentPerformance=wrapped;
};
})();