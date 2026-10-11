/* HELLO MAJESTY CHAT — DEVELOPMENT INTEGRATION
   Branch: feature/hello-majesty-chat
   Safe mode: uses only additive chat tables/RPC; does not mutate public.leads.
*/
(function(){
'use strict';
const SUPABASE_URL='https://ksowzhhmzrumyciehuyv.supabase.co';
const SUPABASE_KEY='sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
const DEMO_KEY='hm_chat_dev_demo_v2';
let sb=null, customerUser=null, activeConversation=null, mode='customer';
let demoState=loadDemo();

function el(id){return document.getElementById(id);}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function time(v){return new Date(v||Date.now()).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}
function loadDemo(){try{return JSON.parse(localStorage.getItem(DEMO_KEY))||{messages:[]};}catch(_e){return {messages:[]};}}
function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(demoState));}
function addBubble(box,m){const d=document.createElement('div');d.className='hm-bubble '+(m.sender_type==='CUSTOMER'||m.from==='customer'?'customer':'cs');d.innerHTML=esc(m.message??m.text)+'<span class="hm-time">'+esc(time(m.created_at||m.at))+'</span>';box.appendChild(d);box.scrollTop=box.scrollHeight;}

async function ensureClient(){
  if(sb)return sb;
  if(window.sb){sb=window.sb;return sb;}
  if(!window.supabase?.createClient)throw new Error('Library Supabase belum termuat.');
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  return sb;
}

async function ensureCustomer(){
  await ensureClient();
  const {data:{session}}=await sb.auth.getSession();
  if(session?.user){customerUser=session.user;return customerUser;}
  const {data,error}=await sb.auth.signInAnonymously();
  if(error)throw error;
  if(!data?.user)throw new Error('Sesi customer tidak berhasil dibuat.');
  customerUser=data.user;return customerUser;
}

async function getCustomerConversation(){
  if(!customerUser)return null;
  const {data,error}=await sb.from('chat_conversations').select('*').eq('customer_user_id',customerUser.id).order('created_at',{ascending:false}).limit(1);
  if(error)throw error;
  return data?.[0]||null;
}

async function createConversation(firstMessage){
  await ensureCustomer();
  const {data,error}=await sb.from('chat_conversations').insert({
    customer_name:'Customer',
    source:'HELLO_MAJESTY_CHAT',
    status:'AVAILABLE',
    customer_user_id:customerUser.id
  }).select().single();
  if(error)throw error;
  const msg=await sendCustomerMessage(data.id,firstMessage,true);
  return data;
}

async function sendCustomerMessage(conversationId,message,silent){
  const {data,error}=await sb.from('chat_messages').insert({
    conversation_id:conversationId,
    sender_type:'CUSTOMER',
    sender_user_id:customerUser.id,
    message
  }).select().single();
  if(error)throw error;
  if(!silent)renderCustomerFromDb(conversationId);
  return data;
}

async function renderCustomerFromDb(cid){
  const box=el('hmCustomerMessages');box.innerHTML='';
  const {data,error}=await sb.from('chat_messages').select('*').eq('conversation_id',cid).order('created_at',{ascending:true});
  if(error)throw error;
  if(data?.length){el('hmWelcome').classList.add('hm-hidden');data.forEach(m=>addBubble(box,m));}
}

async function sendCustomer(){
  const input=el('hmCustomerInput');const text=input.value.trim();if(!text)return;
  input.value='';
  try{
    await ensureCustomer();
    let c=await getCustomerConversation();
    if(!c)c=await createConversation(text);else await sendCustomerMessage(c.id,text,false);
    await renderCustomerFromDb(c.id);
  }catch(e){
    console.error(e);
    demoState.messages.push({from:'customer',text,at:Date.now()});saveDemo();renderDemoCustomer();
    const msg=String(e?.message||'');
    if(/anonymous|anonymous sign|signups? not allowed|disabled/i.test(msg)){
      alert('Chat customer siap, tetapi Anonymous Sign-In Supabase belum diaktifkan. Aktifkan Authentication → Providers → Anonymous Sign-Ins, lalu coba lagi.');
    }else{
      alert('Chat server belum aktif untuk customer. Demo lokal tetap berjalan.');
    }
  }
}

function renderDemoCustomer(){const box=el('hmCustomerMessages');box.innerHTML='';demoState.messages.forEach(m=>addBubble(box,m));if(demoState.messages.length)el('hmWelcome').classList.add('hm-hidden');}

async function loadCsInbox(){
  await ensureClient();
  if(!window.sb)throw new Error('CS harus dibuka dari dashboard Hello Majesty agar sesi login digunakan.');
  const {data,error}=await sb.from('chat_conversations').select('*').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  renderInbox(data||[]);
}

function renderInbox(rows){
  const inbox=el('hmInbox');inbox.innerHTML='';
  el('hmInboxCount').textContent=rows.filter(x=>x.status==='AVAILABLE').length+' lead baru';
  if(!rows.length){inbox.innerHTML='<div class="hm-lead-card">Belum ada chat masuk.</div>';return;}
  rows.forEach(c=>{
    const card=document.createElement('div');card.className='hm-lead-card';
    card.innerHTML='<h3>'+esc(c.customer_name||'Customer')+'</h3><p>'+esc(c.source||'HELLO_MAJESTY_CHAT')+'</p><p>Creator: '+esc(c.content_creator||'-')+'</p><div class="hm-lead-status">'+(c.claimed_name?'🔒 Ditangani '+esc(c.claimed_name):'🟢 BELUM DI-CLAIM')+'</div>';
    const b=document.createElement('button');b.className='hm-claim'+(c.claimed_by?' locked':'');
    b.textContent=c.claimed_by?'BUKA CHAT':'CLAIM LEAD';
    b.onclick=()=>openCsConversation(c.id);card.appendChild(b);inbox.appendChild(card);
  });
}

async function openCsConversation(cid){
  try{
    const {data,error}=await sb.from('chat_conversations').select('*').eq('id',cid).single();
    if(error)throw error;
    if(!data.claimed_by){
      const claim=await sb.rpc('hm_claim_chat_conversation',{p_conversation_id:cid});
      if(claim.error)throw claim.error;
      activeConversation=claim.data;
    }else activeConversation=data;
    const c=activeConversation;
    el('hmInbox').classList.add('hm-hidden');el('hmCsConversation').classList.remove('hm-hidden');el('hmCsCustomerName').textContent=c.customer_name||'Customer';el('hmCsOwnership').textContent='🔒 PIC: '+(c.claimed_name||'CS');
    const box=el('hmCsMessages');box.innerHTML='';
    const msgs=await sb.from('chat_messages').select('*').eq('conversation_id',cid).order('created_at',{ascending:true});
    if(msgs.error)throw msgs.error;(msgs.data||[]).forEach(m=>addBubble(box,m));
  }catch(e){console.error(e);alert(e.message||'Chat gagal dibuka.');}
}

async function sendCs(){
  const input=el('hmCsInput');const text=input.value.trim();if(!text||!activeConversation)return;
  input.value='';
  try{
    const {data:userData}=await sb.auth.getUser();
    if(!userData?.user)throw new Error('Sesi CS tidak tersedia.');
    const {error}=await sb.from('chat_messages').insert({conversation_id:activeConversation.id,sender_type:'CS',sender_user_id:userData.user.id,message:text});
    if(error)throw error;
    await openCsConversation(activeConversation.id);
  }catch(e){console.error(e);alert(e.message||'Pesan CS gagal dikirim.');}
}

async function switchMode(){
  const cv=el('hmCustomerView'),cs=el('hmCsView');
  const showingCustomer=!cv.classList.contains('hm-hidden');
  cv.classList.toggle('hm-hidden',showingCustomer);cs.classList.toggle('hm-hidden',!showingCustomer);
  el('hmChatSubtitle').textContent=showingCustomer?'CS Inbox':'Customer';
  if(showingCustomer){mode='cs';el('hmModeBtn').textContent='‹';try{await loadCsInbox();}catch(e){el('hmInbox').innerHTML='<div class="hm-lead-card">'+esc(e.message||'CS belum login.')+'</div>';}}
  else{mode='customer';el('hmModeBtn').textContent='⋮';try{const c=await getCustomerConversation();if(c)await renderCustomerFromDb(c.id);else renderDemoCustomer();}catch(_e){renderDemoCustomer();}}
}

el('hmCustomerSend').onclick=sendCustomer;el('hmCsSend').onclick=sendCs;
el('hmBackInbox').onclick=async()=>{activeConversation=null;el('hmCsConversation').classList.add('hm-hidden');el('hmInbox').classList.remove('hm-hidden');await loadCsInbox();};
el('hmModeBtn').onclick=switchMode;
el('hmResetDemo').onclick=()=>{localStorage.removeItem(DEMO_KEY);demoState={messages:[]};renderDemoCustomer();};
document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{el('hmCustomerInput').value=b.dataset.quick;sendCustomer();});
['hmCustomerInput','hmCsInput'].forEach(id0=>el(id0).addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();id0==='hmCustomerInput'?sendCustomer():sendCs();}}));

(async()=>{try{await ensureClient();}catch(e){console.warn('[HM Chat]',e);}renderDemoCustomer();})();
})();