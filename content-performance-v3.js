(function(){
function cpFmt(n){return Number(n||0).toLocaleString('id-ID')}
function cpEsc(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function cpLoad(mode){
 const now=new Date();
 const y=now.getFullYear(), m=now.getMonth();
 let start,end,label;
 if(mode==='last_month'){start=new Date(y,m-1,1);end=new Date(y,m,1);label='BULAN KEMARIN'}
 else if(mode==='today'){start=new Date(y,m,now.getDate());end=new Date(y,m,now.getDate()+1);label='HARI INI'}
 else {start=new Date(y,m,1);end=new Date(y,m+1,1);label='BULAN INI'}
 const q=await sb.from('content_posts').select('content_creator,outlet,views,comments,dms,posted_at').eq('active',true).gte('posted_at',start.toISOString()).lt('posted_at',end.toISOString()).order('posted_at',{ascending:false});
 if(q.error)throw q.error;
 const rows=q.data||[];
 const total=rows.reduce((a,r)=>({views:a.views+Number(r.views||0),comments:a.comments+Number(r.comments||0),dms:a.dms+Number(r.dms||0)}),{views:0,comments:0,dms:0});
 const groups={};
 rows.forEach(r=>{const k=(r.outlet||'-')+'|'+(r.content_creator||'-');if(!groups[k])groups[k]={outlet:r.outlet||'-',creator:r.content_creator||'-',content:0,views:0,comments:0,dms:0};groups[k].content++;groups[k].views+=Number(r.views||0);groups[k].comments+=Number(r.comments||0);groups[k].dms+=Number(r.dms||0)});
 return {label,total,groups:Object.values(groups)};
}
window.renderContentPerformance=async function(){
 const node=document.getElementById('contentPerformance');
 if(!node)throw new Error('Panel Content Performance tidak ditemukan.');
 node.innerHTML='<h3 style="margin-top:0">🎬 CONTENT PERFORMANCE</h3><div class="row" style="margin-bottom:12px"><button class="secondary" type="button" data-cp-mode="today">Hari Ini</button><button class="secondary" type="button" data-cp-mode="month">Bulan Ini</button><button class="secondary" type="button" data-cp-mode="last_month">Bulan Kemarin</button></div><div id="cpBody"><div class="small">⏳ Memuat...</div></div>';
 const load=async mode=>{
   const body=document.getElementById('cpBody');if(!body)return;
   body.innerHTML='<div class="small">⏳ Memuat data...</div>';
   try{
    const r=await cpLoad(mode);
    body.innerHTML='<div class="stats"><div class="stat"><div class="small">Content</div><div class="num">'+cpFmt(Object.values(r.groups).reduce((a,x)=>a+x.content,0))+'</div></div><div class="stat"><div class="small">Views</div><div class="num">'+cpFmt(r.total.views)+'</div></div><div class="stat"><div class="small">Comments</div><div class="num">'+cpFmt(r.total.comments)+'</div></div><div class="stat"><div class="small">DM</div><div class="num">'+cpFmt(r.total.dms)+'</div></div></div><div class="small" style="margin:10px 0">Periode: <b>'+cpEsc(r.label)+'</b></div>'+(r.groups.length?r.groups.map(x=>'<div class="lead"><b>🎬 '+cpEsc(x.creator)+'</b><div class="small">'+cpEsc(x.outlet)+'</div><div style="margin-top:6px">Content <b>'+cpFmt(x.content)+'</b> • Views <b>'+cpFmt(x.views)+'</b> • Comments <b>'+cpFmt(x.comments)+'</b> • DM <b>'+cpFmt(x.dms)+'</b></div></div>').join(''):'<div class="small">Belum ada content pada periode ini.</div>');
   }catch(e){body.innerHTML='<div style="color:#b42318">Gagal memuat data: '+cpEsc(e?.message||e)+'</div>'}
 };
 node.querySelectorAll('[data-cp-mode]').forEach(b=>b.onclick=()=>load(b.getAttribute('data-cp-mode')||'month'));
 await load('month');
};
})();