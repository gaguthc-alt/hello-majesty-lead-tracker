(function(){
 const fmt=n=>Number(n||0).toLocaleString('id-ID');
 const escF=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const base=window.renderContentPerformance;
 if(typeof base!=='function'||base.__funnelWrapped)return;
 const wrapped=async function(){
  await base.apply(this,arguments);
  const root=document.getElementById('cpBody');if(!root)return;
  const box=document.createElement('section');box.id='cpFunnel';box.style.cssText='margin-top:18px;padding:14px;border:1px solid #dbe3ee;border-radius:16px;background:#fff';
  box.innerHTML='<h3 style="margin:0 0 6px">📊 CONTENT PERFORMANCE FUNNEL</h3><div class="small">Melacak perjalanan lead per Content Creator berdasarkan ID lead yang sama.</div><div class="small" id="cpfStatus" style="margin:10px 0">⏳ Menghitung funnel...</div><div id="cpfRows"></div><div class="small" style="margin-top:12px;color:#64748b">WA masuk dihitung dari pesan inbound yang sudah terhubung ke lead. Closing operasional dihitung dari event SALES_CLOSING. Omzet dan laba belum ditampilkan karena memerlukan akses laporan transaksi khusus Management.</div>';
  root.appendChild(box);
  try{
   const now=new Date();const p={start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)};
   const leadQ=await sb.from('leads').select('id,lead_id,content_creator,created_at,cs_claimed_by,claimed_at,sales_handover_at,sales_handover_by,sales_claimed_at,sales_claimed_by,status_lead,sales_result,hasil').gte('created_at',p.start.toISOString()).lt('created_at',p.end.toISOString());
   if(leadQ.error)throw leadQ.error;
   const leads=leadQ.data||[];
   const ids=leads.map(x=>x.lead_id).filter(Boolean);
   const [evQ,msgQ]=await Promise.all([
    ids.length?sb.from('lead_events').select('lead_id,event_type,event_at').in('lead_id',ids):Promise.resolve({data:[],error:null}),
    ids.length?sb.from('whatsapp_messages').select('lead_id,direction,created_at').eq('direction','INBOUND').in('lead_id',ids):Promise.resolve({data:[],error:null})
   ]);
   if(evQ.error)throw evQ.error;if(msgQ.error)throw msgQ.error;
   const groups={};
   leads.forEach(l=>{const name=String(l.content_creator||'').trim()||'Belum teratribusi';const k=name.toLocaleLowerCase('id');if(!groups[k])groups[k]={name,leadIds:new Set(),wa:new Set(),claim:new Set(),handover:new Set(),salesClaim:new Set(),closing:new Set()};groups[k].leadIds.add(l.lead_id);if(l.cs_claimed_by||l.claimed_at)groups[k].claim.add(l.lead_id);if(l.sales_handover_at||l.sales_handover_by)groups[k].handover.add(l.lead_id);if(l.sales_claimed_at||l.sales_claimed_by)groups[k].salesClaim.add(l.lead_id);});
   const owner={};Object.entries(groups).forEach(([k,g])=>g.leadIds.forEach(id=>owner[id]=k));
   (msgQ.data||[]).forEach(m=>{const g=groups[owner[m.lead_id]];if(g)g.wa.add(m.lead_id);});
   (evQ.data||[]).forEach(e=>{const g=groups[owner[e.lead_id]];if(!g)return;const t=String(e.event_type||'').toUpperCase();if(t==='SALES_CLOSING')g.closing.add(e.lead_id);});
   const rows=Object.values(groups).sort((a,b)=>b.leadIds.size-a.leadIds.size);
   const th=['Content Creator','WA Masuk','CS Claim','CS Handover','Sales Claim','Closing'];
   const table='<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:690px"><thead><tr>'+th.map(x=>'<th style="padding:9px 7px;text-align:left;border-bottom:1px solid #dbe3ee">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(g=>'<tr><td style="padding:9px 7px;border-bottom:1px solid #edf1f6;font-weight:700">'+escF(g.name)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.wa.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.claim.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.handover.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.salesClaim.size)+'</td><td style="padding:9px 7px;border-bottom:1px solid #edf1f6">'+fmt(g.closing.size)+'</td></tr>').join('')+'</tbody></table></div>';
   document.getElementById('cpfRows').innerHTML=table;
   document.getElementById('cpfStatus').textContent=fmt(leads.length)+' lead dalam periode · '+fmt((msgQ.data||[]).length)+' pesan inbound terhubung.';

  }catch(e){const s=document.getElementById('cpfStatus');if(s)s.innerHTML='<span style="color:#b91c1c">Funnel gagal dimuat: '+escF(e?.message||e)+'</span>';}
 };
 wrapped.__funnelWrapped=true;window.renderContentPerformance=wrapped;
})();