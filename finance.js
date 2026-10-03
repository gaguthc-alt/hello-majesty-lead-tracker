(function(){
function hmRp(v){return 'Rp'+Number(v||0).toLocaleString('id-ID');}
function hmDateRange(mode){
 const d=new Date(),iso=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;};
 if(mode==='today'){const s=new Date(d.getFullYear(),d.getMonth(),d.getDate());return [iso(s),iso(s)];}
 if(mode==='year'){return [d.getFullYear()+'-01-01',d.getFullYear()+'-12-31'];}
 return [iso(new Date(d.getFullYear(),d.getMonth(),1)),iso(new Date(d.getFullYear(),d.getMonth()+1,0))];
}
window.openFinance=async function(){
 const p=window.profile||window.__HM_PROFILE||{};
 if(!p.is_management){alert('Finance hanya dapat diakses Management.');return;}
 const m=document.getElementById('modal'),t=document.getElementById('mt'),b=document.getElementById('mb');
 if(!m||!t||!b)return;
 t.textContent='💰 Finance';
 b.innerHTML='<div class="box"><h3 style="margin-top:0">💰 FINANCE MANAGEMENT</h3><div class="small">Sumber data: Jurnal yang sudah POSTED.</div><div class="row" style="margin-top:10px"><button class="secondary" onclick="hmFinanceLoad(\'month\')">Bulan Ini</button><button class="secondary" onclick="hmFinanceLoad(\'today\')">Hari Ini</button><button class="secondary" onclick="hmFinanceLoad(\'year\')">Tahun Ini</button></div><div id="hmFinBox" style="margin-top:10px">Memuat...</div></div>';
 m.classList.remove('hidden');
 await hmFinanceLoad('month');
};
window.hmFinanceLoad=async function(mode){
 const box=document.getElementById('hmFinBox'),sb=window.sb,p=window.profile||{};
 if(!box||!sb||!p.is_management)return;
 box.innerHTML='<div class="small">Memuat data Finance...</div>';
 const [start,end]=hmDateRange(mode);
 const x=await sb.rpc('finance_management_dashboard',{p_start_date:start,p_end_date:end});
 if(x.error){box.innerHTML='<div class="danger box">Finance error: '+String(x.error.message||x.error)+'</div>';return;}
 const d=x.data||{},accounts=d.accounts||[];
 const cards=[
  ['💵 Kas & Bank',d.cash_bank],
  ['💰 Uang Masuk',d.cash_in],
  ['💸 Uang Keluar',d.cash_out],
  ['📊 Net Cashflow',d.net_cashflow],
  ['🤝 Hutang Supplier',d.payable_supplier],
  ['👤 Piutang Customer',d.receivable_customer]
 ];
 box.innerHTML='<div class="small">Periode '+start+' s/d '+end+'</div>'+
 '<div class="stats" style="margin-top:10px">'+cards.map(c=>'<div class="stat"><div class="small">'+c[0]+'</div><div class="num">'+hmRp(c[1])+'</div></div>').join('')+'</div>'+
 '<div class="box" style="margin-top:10px"><h3 style="margin-top:0">💵 Kas & Bank</h3>'+
 (accounts.length?accounts.map(a=>'<div class="row" style="justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0"><span><b>'+a.code+'</b> '+a.name+'</span><b>'+hmRp(a.balance)+'</b></div>').join(''):'<div class="small">Belum ada saldo.</div>')+
 '</div><div class="small" style="margin-top:8px">Finance hanya dapat diakses Management.</div>';
};
})();