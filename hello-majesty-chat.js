/* HELLO MAJESTY CHAT — DEVELOPMENT INTEGRATION
   Branch: feature/hello-majesty-chat
   Safe mode: uses only additive chat tables/RPC; does not mutate public.leads.
*/
(function(){
'use strict';
const SUPABASE_URL='https://ksowzhhmzrumyciehuyv.supabase.co';
const SUPABASE_KEY='sb_publishable_WfnEfH3-TOZS6wTKV9Ac_w_F58DiOTW';
const DEMO_KEY='hm_chat_dev_demo_v2';
let sb=null, customerUser=null, activeConversation=null, mode='cs';
const customerParams=new URLSearchParams(location.search);
const customerOnly=customerParams.get('mode')==='customer';
const forceNewCustomer=customerOnly&&customerParams.get('new')==='1';
const forceNewSessionKey='hm_chat_force_new_done_'+location.pathname;
if(customerOnly)mode='customer';
let demoState={messages:[]};
let realtimeChannel=null;
let csMessageChannel=null;
let csInboxPollTimer=null;
let csKnownAvailableIds=new Set();
let csInboxNotificationReady=false;
let subscribedConversationId=null;

function el(id){return document.getElementById(id);}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function time(v){return new Date(v||Date.now()).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}
function loadDemo(){try{return JSON.parse(localStorage.getItem(DEMO_KEY))||{messages:[]};}catch(_e){return {messages:[]};}}
function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(demoState));}
function addBubble(box,m){
  const messageId=m?.id;
  if(messageId&&box.querySelector('[data-hm-message-id="'+messageId+'"]'))return;
  const d=document.createElement('div');
  d.className='hm-bubble '+(m.sender_type==='CUSTOMER'||m.from==='customer'?'customer':'cs');
  if(messageId)d.dataset.hmMessageId=messageId;
  d.dataset.hmCreatedAt=m.created_at||m.at||'';
  d.innerHTML=esc(m.message??m.text)+'<span class="hm-time">'+esc(time(m.created_at||m.at))+'</span>';
  box.appendChild(d);
  Array.from(box.children)
    .sort((a,b)=>new Date(a.dataset.hmCreatedAt||0)-new Date(b.dataset.hmCreatedAt||0))
    .forEach(node=>box.appendChild(node));
  box.scrollTop=box.scrollHeight;
}

async function getMainAuth(){
  try{
    const raw=localStorage.getItem('hm_auth_session');
    const s=raw?JSON.parse(raw):null;
    if(!s?.access_token||!s?.user)throw new Error('Sesi login Hello Majesty tidak tersedia.');
    const now=Math.floor(Date.now()/1000);
    if(Number(s.expires_at||0)>now+90)return s;
    if(!s.refresh_token)throw new Error('Sesi login Hello Majesty sudah kedaluwarsa. Silakan login kembali.');
    const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
    const data=await res.json().catch(()=>null);
    if(!res.ok||!data?.access_token)throw new Error(data?.error_description||data?.msg||'Sesi login Hello Majesty sudah kedaluwarsa.');
    const next={...s,...data,user:data.user||s.user,expires_at:data.expires_at||Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
    localStorage.setItem('hm_auth_session',JSON.stringify(next));
    return next;
  }catch(e){throw new Error(e?.message||'Sesi login Hello Majesty tidak tersedia.');}
}
async function ensureClient(){
  if(sb)return sb;
  if(!window.supabase?.createClient)throw new Error('Library Supabase belum termuat.');
  if(customerOnly){
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  }else{
    const session=await getMainAuth();
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:'Bearer '+session.access_token}}});
  }
  return sb;
}
async function getMainUser(){
  const session=await getMainAuth();
  const res=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token}});
  const data=await res.json().catch(()=>null);
  if(!res.ok||!data?.id)throw new Error('Sesi CS tidak tersedia. Silakan login Hello Majesty terlebih dahulu.');
  return data;
}

async function ensureCustomer(){
  await ensureClient();
  if(!customerOnly){
    const user=await getMainUser();
    customerUser=user;
    return customerUser;
  }
  let {data:{session}}=await sb.auth.getSession();
  if(forceNewCustomer&&sessionStorage.getItem(forceNewSessionKey)!=='1'){
    if(session)await sb.auth.signOut({scope:'local'});
    sessionStorage.setItem(forceNewSessionKey,'1');
    session=null;
  }
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
    await subscribeCustomerRealtime(c.id);
  }catch(e){
    console.error('[HM Chat customer send]',e);
    const msg=String(e?.message||'Chat gagal dikirim.');
    alert('Pesan belum terkirim ke CS. '+msg+' Silakan coba lagi.');
  }
}

function renderDemoCustomer(){const box=el('hmCustomerMessages');box.innerHTML='';demoState.messages.forEach(m=>addBubble(box,m));if(demoState.messages.length)el('hmWelcome').classList.add('hm-hidden');}

async function requestChatNotifications(){try{if('Notification' in window&&Notification.permission==='default')await Notification.requestPermission();}catch(_e){}}
function showInAppChatAlert(c){const box=document.getElementById('hmChatAlert'),txt=document.getElementById('hmChatAlertText'),btn=document.getElementById('hmChatAlertBtn');if(!box)return;if(txt)txt.textContent='Lead baru dari '+(c?.customer_name||'Customer')+' menunggu di-claim.';if(btn)btn.onclick=()=>{box.classList.add('hm-hidden');openCsConversation(c.id)};box.classList.remove('hm-hidden');try{document.title='🔔 Chat Baru • Hello Majesty'}catch(_e){}}
function showChatNotification(c){if(c?.claimed_by||c?.status!=='AVAILABLE')return;showInAppChatAlert(c);try{if(!('Notification' in window)||Notification.permission!=='granted')return;const n=new Notification('🔔 Lead Baru Menunggu Claim',{body:(c?.customer_name||'Customer')+' masuk dari Hello Majesty Chat. Silakan CLAIM.',tag:'hm-chat-'+c.id});n.onclick=()=>{window.focus();openCsConversation(c.id)}}catch(e){console.warn('[HM Chat notification]',e)}}
async function stopRealtime(){if(realtimeChannel){try{await sb.removeChannel(realtimeChannel)}catch(_e){}realtimeChannel=null;}if(csMessageChannel){try{await sb.removeChannel(csMessageChannel)}catch(_e){}csMessageChannel=null;}subscribedConversationId=null;}
async function subscribeCsConversationRealtime(conversationId){
  await ensureClient();
  if(customerOnly||!conversationId)return;
  if(csMessageChannel){try{await sb.removeChannel(csMessageChannel)}catch(_e){}}
  const channelName='hm-cs-conversation-live-'+conversationId;
  csMessageChannel=sb.channel(channelName)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:'conversation_id=eq.'+conversationId},p=>{
      try{
        if(activeConversation?.id!==conversationId)return;
        addBubble(el('hmCsMessages'),p.new);
      }catch(e){console.warn('[HM Chat CS message realtime]',e)}
    })
    .subscribe(async(status)=>{
      console.log('[HM Chat CS message realtime]',status);
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        setTimeout(()=>{if(activeConversation?.id===conversationId)subscribeCsConversationRealtime(conversationId)},1500);
      }
    });
}
async function subscribeCustomerRealtime(conversationId){
  await ensureClient();
  if(!customerOnly||!conversationId||subscribedConversationId===conversationId)return;
  await stopRealtime();
  subscribedConversationId=conversationId;
  realtimeChannel=sb.channel('hm-customer-chat-'+conversationId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:'conversation_id=eq.'+conversationId},p=>{
      try{addBubble(el('hmCustomerMessages'),p.new);el('hmWelcome').classList.add('hm-hidden');}
      catch(e){console.warn('[HM Chat customer realtime]',e)}
    })
    .subscribe(async(status)=>{
      console.log('[HM Chat customer realtime]',status);
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        setTimeout(()=>{if(subscribedConversationId===conversationId)subscribeCustomerRealtime(conversationId)},1500);
      }
    });
}
function stopCsInboxPolling(){if(csInboxPollTimer){clearInterval(csInboxPollTimer);csInboxPollTimer=null;}}
function startCsInboxPolling(){
  stopCsInboxPolling();
  csInboxNotificationReady=false;
  csInboxPollTimer=setInterval(async()=>{
    try{
      if(customerOnly||!el('hmCsView')||el('hmCsView').classList.contains('hm-hidden'))return;
      if(el('hmCsConversation')&&!el('hmCsConversation').classList.contains('hm-hidden'))return;
      const rows=await loadCsInbox();
      const available=(rows||[]).filter(x=>x.status==='AVAILABLE'&&!x.claimed_by);
      const ids=new Set(available.map(x=>x.id));
      if(csInboxNotificationReady){
        for(const row of available){
          if(!csKnownAvailableIds.has(row.id))showChatNotification(row);
        }
      }
      csKnownAvailableIds=ids;
      csInboxNotificationReady=true;
    }catch(e){console.warn('[HM Chat CS inbox fallback]',e)}
  },2000);
}
async function subscribeChatNotifications(){
  try{
    await ensureClient();
    if(customerOnly)return;
    const user=await getMainUser();
    if(!user?.id)return;
    const r=await sb.from('team_profiles').select('role,active').eq('user_id',user.id).maybeSingle();
    const role=String(r.data?.role||'').toUpperCase().replace(/_/g,' ');
    if(!r.data?.active||!(role==='CS'||role==='CUSTOMER SERVICE'))return;
    await requestChatNotifications();
    // Start the fallback immediately. Do not wait for Realtime to reach SUBSCRIBED:
    // if Realtime itself is the part that is failing, waiting for SUBSCRIBED leaves CS needing refresh.
    startCsInboxPolling();
    if(realtimeChannel){try{await sb.removeChannel(realtimeChannel)}catch(_e){}}
    const channelName='hm-cs-inbox-live-'+user.id+'-'+Date.now();
    realtimeChannel=sb.channel(channelName,{config:{broadcast:{self:false}}})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_conversations'},p=>{
        console.log('[HM Chat CS inbox INSERT]',p.new);
        showChatNotification(p.new);
        loadCsInbox().then(rows=>{csKnownAvailableIds=new Set((rows||[]).filter(x=>x.status==='AVAILABLE'&&!x.claimed_by).map(x=>x.id));csInboxNotificationReady=true;}).catch(e=>console.warn('[HM Chat inbox realtime]',e));
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_conversations'},p=>{
        console.log('[HM Chat CS inbox UPDATE]',p.new);
        loadCsInbox().then(rows=>{csKnownAvailableIds=new Set((rows||[]).filter(x=>x.status==='AVAILABLE'&&!x.claimed_by).map(x=>x.id));csInboxNotificationReady=true;}).catch(e=>console.warn('[HM Chat inbox update]',e));
        if(p.new?.status==='AVAILABLE'&&!p.new?.claimed_by)showChatNotification(p.new);
      })
      .subscribe(async(status)=>{
        console.log('[HM Chat CS inbox realtime]',status);
        if(status==='SUBSCRIBED')startCsInboxPolling();
        if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
          startCsInboxPolling();
          setTimeout(()=>subscribeChatNotifications(),1500);
        }
      });
  }catch(e){console.warn('[HM Chat realtime]',e)}
}

async function loadCsInbox(){
  await ensureClient();
  if(customerOnly)throw new Error('Mode customer aktif.');
  await getMainUser();
  const {data,error}=await sb.from('chat_conversations').select('*').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  renderInbox(data||[]);
  return data||[];
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
    stopCsInboxPolling();
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
    await subscribeCsConversationRealtime(cid);
  }catch(e){console.error(e);alert(e.message||'Chat gagal dibuka.');}
}

async function sendCs(){
  const input=el('hmCsInput');const text=input.value.trim();if(!text||!activeConversation)return;
  input.value='';
  try{
    const userData=await getMainUser();
    const {error}=await sb.from('chat_messages').insert({conversation_id:activeConversation.id,sender_type:'CS',sender_user_id:userData.id,message:text});
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
  else{mode='customer';el('hmModeBtn').textContent='⋮';try{await ensureCustomer();const c=await getCustomerConversation();if(c){await renderCustomerFromDb(c.id);await subscribeCustomerRealtime(c.id);}else{el('hmCustomerMessages').innerHTML='';el('hmWelcome').classList.remove('hm-hidden');}}catch(e){console.error('[HM Chat customer view]',e);alert(e.message||'Chat customer gagal dimuat.');}}
}

el('hmCustomerSend').onclick=sendCustomer;el('hmCsSend').onclick=sendCs;
if(customerOnly){
  el('hmModeBtn').classList.add('hm-hidden');
  el('hmCsView').classList.add('hm-hidden');
  el('hmCustomerView').classList.remove('hm-hidden');
}
el('hmBackInbox').onclick=async()=>{activeConversation=null;el('hmCsConversation').classList.add('hm-hidden');el('hmInbox').classList.remove('hm-hidden');await loadCsInbox();};
el('hmModeBtn').onclick=switchMode;
el('hmResetDemo').onclick=()=>{localStorage.removeItem(DEMO_KEY);demoState={messages:[]};renderDemoCustomer();};
document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{el('hmCustomerInput').value=b.dataset.quick;sendCustomer();});
['hmCustomerInput','hmCsInput'].forEach(id0=>el(id0).addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();id0==='hmCustomerInput'?sendCustomer():sendCs();}}));

(async()=>{
  try{
    await ensureClient();
    if(customerOnly){
      await ensureCustomer();
      const c=await getCustomerConversation();
      if(c){await renderCustomerFromDb(c.id);await subscribeCustomerRealtime(c.id);}else{el('hmCustomerMessages').innerHTML='';el('hmWelcome').classList.remove('hm-hidden');}
    }else{
      el('hmCustomerView').classList.add('hm-hidden');
      el('hmCsView').classList.remove('hm-hidden');
      el('hmChatSubtitle').textContent='CS Inbox';
      await loadCsInbox();
      await subscribeChatNotifications();
    }
  }catch(e){
    console.warn('[HM Chat]',e);
    if(customerOnly){
      const box=el('hmCustomerMessages');
      if(box)box.innerHTML='<div class="hm-server-error">Chat belum terhubung ke server: '+esc(e.message||'silakan muat ulang halaman.')+'</div>';
      if(el('hmWelcome'))el('hmWelcome').classList.remove('hm-hidden');
    }else el('hmInbox').innerHTML='<div class="hm-lead-card">'+esc(e.message||'CS belum login.')+'</div>';
  }
})();
})();