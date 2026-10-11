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
const requestedConversationId=customerParams.get('conversation');
const forceNewCustomer=customerOnly&&customerParams.get('new')==='1';
const forceNewSessionKey='hm_chat_force_new_done_'+location.pathname;
if(customerOnly)mode='customer';
let demoState={messages:[]};
let realtimeChannel=null;
let csMessageChannel=null;
let csNotificationChannel=null;
let csInboxPollTimer=null;
let csKnownAvailableIds=new Set();
let csInboxNotificationReady=false;
let subscribedConversationId=null;
let csRealtimeWatchdog=null;
let csRealtimeTokenTimer=null;

function el(id){return document.getElementById(id);}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function time(v){return new Date(v||Date.now()).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});}
function loadDemo(){try{return JSON.parse(localStorage.getItem(DEMO_KEY))||{messages:[]};}catch(_e){return {messages:[]};}}
function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(demoState));}
function addBubble(box,m){
  const messageId=m?.id;
  if(messageId&&box.querySelector('[data-hm-message-id="'+messageId+'"]'))return;
  const d=document.createElement('div');
  const isCustomerMessage=m.sender_type==='CUSTOMER'||m.from==='customer';
  // Bubble direction is relative to the current view:
  // Customer view: customer right, CS left.
  // CS view: CS right, customer left.
  const isMine=customerOnly?isCustomerMessage:!isCustomerMessage;
  d.className='hm-bubble '+(isMine?'mine':'other')+' '+(isCustomerMessage?'customer':'cs');
  // Set alignment inline as a final guard so cached/older CSS cannot invert the role direction.
  d.style.alignSelf=isMine?'flex-end':'flex-start';
  if(isMine){
    d.style.background='#d9fdd3';
    d.style.borderTopRightRadius='3px';
    d.style.borderTopLeftRadius='';
  }else{
    d.style.background='#fff';
    d.style.borderTopLeftRadius='3px';
    d.style.borderTopRightRadius='';
  }
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
  if(!window.supabase?.createClient)throw new Error('Library Supabase belum termuat.');
  if(customerOnly){
    if(!sb)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    return sb;
  }
  // Use Supabase's accessToken callback instead of a fixed Authorization header.
  // The callback refreshes the Hello Majesty session when needed and supplies the
  // same current JWT to both PostgREST (RLS) and Realtime, avoiding stale-token
  // inserts that fail with "new row violates row-level security policy".
  if(!sb){
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      accessToken:async()=>{const session=await getMainAuth();return session.access_token;}
    });
  }else{
    const session=await getMainAuth();
    if(sb.realtime?.setAuth)await sb.realtime.setAuth(session.access_token);
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
function stopCsRealtimeWatchdog(){
  if(csRealtimeWatchdog){clearInterval(csRealtimeWatchdog);csRealtimeWatchdog=null;}
  if(csRealtimeTokenTimer){clearInterval(csRealtimeTokenTimer);csRealtimeTokenTimer=null;}
}
async function refreshCsRealtimeAuth(){
  if(customerOnly||!sb?.realtime?.setAuth)return;
  try{
    const session=await getMainAuth();
    await sb.realtime.setAuth(session.access_token);
  }catch(e){console.warn('[HM Chat CS realtime auth refresh]',e);}
}
function startCsRealtimeWatchdog(){
  if(customerOnly||csRealtimeWatchdog)return;
  // Keep the websocket authorized and recover silently after mobile sleep,
  // network changes, or an expired access token.
  refreshCsRealtimeAuth();
  csRealtimeTokenTimer=setInterval(refreshCsRealtimeAuth,4*60*1000);
  csRealtimeWatchdog=setInterval(async()=>{
    try{
      const active=csMessageChannel?.state;
      if(active&&active!=='joined'&&active!=='joining'){
        await refreshCsRealtimeAuth();
        if(activeConversation?.id)await subscribeCsConversationRealtime(activeConversation.id);
      }
      if(csNotificationChannel?.state&&csNotificationChannel.state!=='joined'&&csNotificationChannel.state!=='joining'){
        await refreshCsRealtimeAuth();
        await subscribeChatNotifications();
      }
    }catch(e){console.warn('[HM Chat CS realtime watchdog]',e);}
  },5000);
}
async function stopRealtime(){if(realtimeChannel){try{await sb.removeChannel(realtimeChannel)}catch(_e){}realtimeChannel=null;}if(csMessageChannel){try{await sb.removeChannel(csMessageChannel)}catch(_e){}csMessageChannel=null;}if(csNotificationChannel){try{await sb.removeChannel(csNotificationChannel)}catch(_e){}csNotificationChannel=null;}stopCsInboxPolling();subscribedConversationId=null;stopCsRealtimeWatchdog();}
async function subscribeConversationRealtime(conversationId, targetBoxId, channelPrefix){
  await ensureClient();
  if(!conversationId)return;
  if(csMessageChannel){try{await sb.removeChannel(csMessageChannel)}catch(_e){}}
  
  const box=el(targetBoxId);
  if(!box)return;
  const channel=sb.channel(channelPrefix+conversationId)
    .on('postgres_changes',{
      event:'INSERT',
      schema:'public',
      table:'chat_messages',
      filter:'conversation_id=eq.'+conversationId
    },p=>{
      try{
        addBubble(box,p.new);
        if(targetBoxId==='hmCustomerMessages')el('hmWelcome').classList.add('hm-hidden');
      }catch(e){console.warn('[HM Chat message realtime]',e)}
    })
    .subscribe(async(status)=>{
      console.log('[HM Chat message realtime]',channelPrefix,status);
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        setTimeout(()=>{
          if(targetBoxId==='hmCsMessages'&&activeConversation?.id===conversationId){
            subscribeConversationRealtime(conversationId,targetBoxId,channelPrefix);
          }else if(targetBoxId==='hmCustomerMessages'&&subscribedConversationId===conversationId){
            subscribeConversationRealtime(conversationId,targetBoxId,channelPrefix);
          }
        },1500);
      }
    });
  if(targetBoxId==='hmCustomerMessages'){
    realtimeChannel=channel;
    subscribedConversationId=conversationId;
  }else{
    csMessageChannel=channel;
  }
}
async function subscribeCsConversationRealtime(conversationId){
  if(customerOnly||!conversationId)return;
  return subscribeConversationRealtime(conversationId,'hmCsMessages','hm-cs-chat-');
}
async function subscribeCustomerRealtime(conversationId){
  if(!customerOnly||!conversationId||subscribedConversationId===conversationId)return;
  await stopRealtime();
  return subscribeConversationRealtime(conversationId,'hmCustomerMessages','hm-customer-chat-');
}
function stopCsInboxPolling(){if(csInboxPollTimer){clearInterval(csInboxPollTimer);csInboxPollTimer=null;}}
function startCsInboxPolling(){
  if(customerOnly||csInboxPollTimer)return;
  // Realtime is the primary path. Polling is only an inbox safety net for
  // missed websocket events; the active conversation itself is not reloaded.
  csInboxPollTimer=setInterval(async()=>{
    try{await loadCsInbox();}
    catch(e){console.warn('[HM Chat CS inbox fallback]',e);}
  },3000);
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

    if(csNotificationChannel){try{await sb.removeChannel(csNotificationChannel)}catch(_e){}}
    const channelName='hm-cs-direct-chat-'+user.id+'-'+Date.now();
    csNotificationChannel=sb.channel(channelName)
      // Primary signal: exactly the same table/event used by Customer Chat.
      // A new customer message means the CS inbox must be checked immediately.
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},async p=>{
        try{
          const cid=p.new?.conversation_id;
          if(!cid)return;
          const {data:conv,error}=await sb.from('chat_conversations').select('*').eq('id',cid).single();
          if(error)throw error;
          if(conv.status==='AVAILABLE'&&!conv.claimed_by){
            showChatNotification(conv);
            await loadCsInbox();
          }
        }catch(e){console.warn('[HM Chat CS direct message realtime]',e)}
      })
      // Keep conversation INSERT/UPDATE as a secondary signal for inbox state.
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_conversations'},async p=>{
        try{
          if(p.new?.status==='AVAILABLE'&&!p.new?.claimed_by){
            showChatNotification(p.new);
            await loadCsInbox();
          }
        }catch(e){console.warn('[HM Chat CS conversation realtime]',e)}
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_conversations'},async p=>{
        try{
          await loadCsInbox();
          if(p.new?.status==='AVAILABLE'&&!p.new?.claimed_by)showChatNotification(p.new);
        }catch(e){console.warn('[HM Chat CS conversation update realtime]',e)}
      })
      .subscribe(status=>{
        console.log('[HM Chat CS direct realtime]',status);
        if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
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
    startCsRealtimeWatchdog();
    startCsInboxPolling();
  }catch(e){console.error(e);alert(e.message||'Chat gagal dibuka.');}
}

async function sendCs(){
  const input=el('hmCsInput');const text=input.value.trim();if(!text||!activeConversation)return;
  input.value='';
  try{
    await ensureClient();
    const userData=await getMainUser();
    if(activeConversation.claimed_by&&activeConversation.claimed_by!==userData.id){
      throw new Error('Chat ini ditangani '+(activeConversation.claimed_name||'CS lain')+'. Hanya PIC yang claim chat ini yang dapat membalas.');
    }
    const {data:sent,error}=await sb.from('chat_messages').insert({conversation_id:activeConversation.id,sender_type:'CS',sender_user_id:userData.id,message:text}).select().single();
    if(error)throw error;
    // Render immediately from the exact inserted row. Realtime will deliver
    // the same row too, and addBubble deduplicates it by message id.
    addBubble(el('hmCsMessages'),sent);
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
/* Receive the main dashboard's global chat signal while this page is open. */
try{
  const bc='BroadcastChannel' in window?new BroadcastChannel('hm-chat-global'):null;
  if(bc)bc.onmessage=async e=>{if(!customerOnly&&e.data?.type==='NEW_CHAT')try{await loadCsInbox();}catch(_e){}};
  window.addEventListener('storage',async e=>{
    if(customerOnly||e.key!=='hm_chat_global_event'||!e.newValue)return;
    try{await loadCsInbox();}catch(_e){}
  });
}catch(_e){}

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
      startCsRealtimeWatchdog();
      startCsInboxPolling();
      if(requestedConversationId)await openCsConversation(requestedConversationId);
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