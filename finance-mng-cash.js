(function(){
  async function hmEnsureMngCash(){
    try{
      const sb=window.sb;if(!sb)return;
      const panel=document.getElementById('hmMenuPanelBody');if(!panel)return;
      const boxes=[...panel.querySelectorAll('.box')];
      const cashBox=boxes.find(x=>String(x.textContent||'').includes('Posisi Kas & Bank'));
      if(!cashBox)return;
      const {data,error}=await sb.from('accounting_accounts').select('id,code,name,active').in('code',['1103','1104']);
      if(error)throw error;
      const ids=(data||[]).map(x=>x.id);if(!ids.length)return;
      const jr=await sb.from('journal_lines').select('account_id,debit,credit,journal_entries!inner(posted)').in('account_id',ids).eq('journal_entries.posted',true);
      if(jr.error)throw jr.error;
      const money=v=>typeof window.hmRp==='function'?window.hmRp(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
      const rows=(data||[]).map(a=>{const bal=(jr.data||[]).filter(x=>String(x.account_id)===String(a.id)).reduce((s,x)=>s+Number(x.debit||0)-Number(x.credit||0),0);return '<button class="secondary" style="width:100%;text-align:left;margin:4px 0" onclick="hmOpenCash(\\''+a.code+'\\')"><div class="row" style="justify-content:space-between"><span><b>'+a.code+'</b> '+a.name+'</span><b>'+money(bal)+'</b></div></button>';}).join('');
      const holder=cashBox.querySelector('div[style*="margin-top:8px"]');
      if(holder){
        const existing=[...holder.querySelectorAll('button')].filter(b=>/1103|1104/.test(b.textContent||''));
        if(!existing.length)holder.insertAdjacentHTML('afterbegin',rows);
      }
    }catch(e){console.error('[HM] MNG cash display:',e);}
  }
  const old=window.openFinance;
  if(typeof old==='function')window.openFinance=async function(){await old.apply(this,arguments);setTimeout(hmEnsureMngCash,50);};
  else setTimeout(function(){const fn=window.openFinance;if(typeof fn==='function'){window.openFinance=async function(){await fn.apply(this,arguments);setTimeout(hmEnsureMngCash,50);};}},300);
})();