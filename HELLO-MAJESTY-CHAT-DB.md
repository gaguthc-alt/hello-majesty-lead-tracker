# Chat database layer

The development prototype now has additive Chat tables in the Hello Majesty Supabase project.

## Tables
- `public.chat_conversations`
- `public.chat_messages`

## Safety
- Existing `public.leads` columns/data were not changed.
- Existing Lead Tracker workflows were not changed.
- Both Chat tables have RLS enabled.
- Customer access is scoped to its own authenticated customer session.
- CS access is limited to active team profiles with role `CS`.
- Direct conversation UPDATE is revoked from authenticated clients.
- Claim uses the atomic RPC `hm_claim_chat_conversation(uuid)`.
- New chat creates `CHAT_NEW_LEAD` notifications for active CS.

## Next integration
The standalone Chat UI should be connected to these tables after UX validation. The first production integration should create/link a Lead only after the Chat conversation is stable; do not rewrite the existing lead claim/closing logic.
