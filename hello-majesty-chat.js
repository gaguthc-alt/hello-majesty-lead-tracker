/* HELLO MAJESTY CHAT — SAFE PROTOTYPE
   Development-only prototype. No Supabase writes and no production lead mutation.
*/
(function(){
'use strict';
const KEY='hm_chat_dev_demo_v1';
const CS_NAME='Demo CS';
let state=load();
let activeConversation=null;

function load(){
  try{return JSON.parse(localStorage.getItem(KEY))||{conversations:[]};}catch(e){return {conversations:[]};}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function id(){return 'CHAT-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
function time(){return new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function ensureDemo(){
  if(state.conversations.length)return;
  state.conversations.push({
    id:id(),customer:'Budi',source:'TikTok',creator:'Rizky',
    status:'AVAILABLE',pic:null,createdAt:new Date().toISOString(),
    messages:[
      {from:'customer',text:'Kak iPhone 13 Pink masih ada?',at:time()}
    ]
  });
  save();
}
function renderCustomer(){
  const box=document.getElementById('hmCustomerMessages');
  box.innerHTML='';
  const all=state.conversations.filter(x=>x.customer==='Customer Demo');
  const c=all[all.length-1];
  if(!c)return;
  c.messages.forEach(m=>addBubble(box,m));
  document.getElementById('hmWelcome').classList.add('hm-hidden');
}
function addBubble(box,m){
  const d=document.createElement('div');
  d.className='hm-bubble '+(m.from==='customer'?'customer':'cs');
  d.innerHTML=esc(m.text)+'<span class="hm-time">'+esc(m.at||'')+'</span>';
  box.appendChild(d);box.scrollTop=box.scrollHeight;
}
function createCustomerLead(text){
  let c=state.conversations.find(x=>x.customer==='Customer Demo'&&x.status!=='CLOSED');
  if(!c){
    c={id:id(),customer:'Customer Demo',source:'Hello Majesty Chat',creator:'-',status:'AVAILABLE',pic:null,createdAt:new Date().toISOString(),messages:[]};
    state.conversations.push(c);
  }
  c.messages.push({from:'customer',text,at:time()});
  save();renderCustomer();renderInbox();
}
function renderInbox(){
  const inbox=document.getElementById('hmInbox');
  const rows=state.conversations.slice().reverse();
  document.getElementById('hmInboxCount').textContent=rows.filter(x=>x.status==='AVAILABLE').length+' lead baru';
  inbox.innerHTML='';
  if(!rows.length){inbox.innerHTML='<div class="hm-lead-card">Belum ada chat masuk.</div>';return;}
  rows.forEach(c=>{
    const card=document.createElement('div');card.className='hm-lead-card';
    const last=c.messages[c.messages.length-1]?.text||'Belum ada pesan';
    const owner=c.pic?'🔒 Ditangani '+c.pic:'🟢 BELUM DI-CLAIM';
    card.innerHTML='<h3>'+esc(c.customer)+'</h3>'+
      '<p>'+esc(last)+'</p>'+
      '<p>Source: '+esc(c.source)+' • Creator: '+esc(c.creator)+'</p>'+
      '<div class="hm-lead-status">'+owner+'</div>';
    const b=document.createElement('button');b.className='hm-claim'+(c.pic?' locked':'');b.textContent=c.pic?(c.pic===CS_NAME?'BUKA CHAT':'SUDAH DI-HANDLE '+c.pic):'CLAIM LEAD';
    b.onclick=()=>openConversation(c.id);
    if(!c.pic)b.onclick=()=>claimAndOpen(c.id);
    card.appendChild(b);inbox.appendChild(card);
  });
}
function claimAndOpen(cid){
  const c=state.conversations.find(x=>x.id===cid);if(!c)return;
  if(c.pic&&c.pic!==CS_NAME){alert('Lead ini sedang ditangani '+c.pic+'.');return;}
  if(!c.pic){c.pic=CS_NAME;c.status='HANDLING';c.claimedAt=new Date().toISOString();save();}
  openConversation(cid);
}
function openConversation(cid){
  const c=state.conversations.find(x=>x.id===cid);if(!c)return;
  if(c.pic&&c.pic!==CS_NAME){alert('Lead ini sedang ditangani '+c.pic+'.');return;}
  activeConversation=cid;
  document.getElementById('hmInbox').classList.add('hm-hidden');
  document.querySelector('.hm-inbox-toolbar').classList.add('hm-hidden');
  document.getElementById('hmCsConversation').classList.remove('hm-hidden');
  document.getElementById('hmCsCustomerName').textContent=c.customer;
  document.getElementById('hmCsOwnership').textContent=c.pic?'🔒 PIC: '+c.pic:'Belum di-claim';
  const box=document.getElementById('hmCsMessages');box.innerHTML='';
  c.messages.forEach(m=>addBubble(box,m));
}
function sendCs(){
  const input=document.getElementById('hmCsInput');const text=input.value.trim();
  if(!text||!activeConversation)return;
  const c=state.conversations.find(x=>x.id===activeConversation);if(!c)return;
  if(!c.pic){c.pic=CS_NAME;c.status='HANDLING';}
  c.messages.push({from:'cs',text,at:time()});save();input.value='';
  openConversation(c.id);renderInbox();
}
function sendCustomer(){
  const input=document.getElementById('hmCustomerInput');const text=input.value.trim();
  if(!text)return;input.value='';createCustomerLead(text);
}
function switchMode(){
  const cv=document.getElementById('hmCustomerView'),cs=document.getElementById('hmCsView');
  const showingCustomer=!cv.classList.contains('hm-hidden');
  cv.classList.toggle('hm-hidden',showingCustomer);
  cs.classList.toggle('hm-hidden',!showingCustomer);
  document.getElementById('hmChatSubtitle').textContent=showingCustomer?'CS Inbox':'Customer';
  if(showingCustomer){document.getElementById('hmModeBtn').textContent='‹';renderInbox();}
  else{document.getElementById('hmModeBtn').textContent='⋮';renderCustomer();}
}
document.getElementById('hmCustomerSend').onclick=sendCustomer;
document.getElementById('hmCsSend').onclick=sendCs;
document.getElementById('hmBackInbox').onclick=()=>{activeConversation=null;document.getElementById('hmCsConversation').classList.add('hm-hidden');document.getElementById('hmInbox').classList.remove('hm-hidden');document.querySelector('.hm-inbox-toolbar').classList.remove('hm-hidden');renderInbox();};
document.getElementById('hmModeBtn').onclick=switchMode;
document.getElementById('hmResetDemo').onclick=()=>{if(confirm('Reset demo chat?')){localStorage.removeItem(KEY);state={conversations:[]};ensureDemo();renderInbox();}};
document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{document.getElementById('hmCustomerInput').value=b.dataset.quick;sendCustomer();});
['hmCustomerInput','hmCsInput'].forEach(id0=>document.getElementById(id0).addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();id0==='hmCustomerInput'?sendCustomer():sendCs();}}));
ensureDemo();renderCustomer();renderInbox();
})();