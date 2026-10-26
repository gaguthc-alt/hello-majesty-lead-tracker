-- Allow a Lead Tracker lead to be deleted without deleting the related Hello Majesty Chat conversation.
-- The chat remains as history; its lead link is cleared automatically.
alter table public.chat_conversations drop constraint if exists chat_conversations_lead_id_fkey;
alter table public.chat_conversations
  add constraint chat_conversations_lead_id_fkey
  foreign key (lead_id) references public.leads(id)
  on delete set null;
