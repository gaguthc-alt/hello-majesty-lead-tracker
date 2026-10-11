-- Enable Supabase Realtime for Hello Majesty Chat.
alter publication supabase_realtime add table public.chat_conversations, public.chat_messages;
