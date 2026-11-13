# WhatsApp Inbox & Customer Lead Layer

Production integration for Sambungan WhatsApp in the existing Hello Majesty Lead Tracker.

## Data flow
- Every inbound WhatsApp number is normalized and upserted into `public.customers`.
- `customers.whatsapp_normalized` is unique; `chat_conversations.customer_id` links a conversation to one customer record.
- Repeated messages from the same number reuse the same contact and conversation.
- Contacts are saved independently of lead qualification. Spam/general questions remain contacts and do not inflate lead KPIs.
- A returning contact previously marked `NOT_LEAD` is reopened for CS review when a new inbound message arrives.

## CS qualification
- Only the claimed chat PIC can mark a conversation `NOT_LEAD` or create/link a lead.
- `hm_review_whatsapp_conversation(uuid,text,...)` validates the active CS profile and outlet permission.
- New purchase leads are created through the existing `create_lead` RPC; the existing `leads` table and claim workflow remain the source of truth.
- Qualification score is stored in `chat_conversations.lead_qualification_score` and `leads.initial_data`.
- Score guide: 0–39 = CS follow-up; 40–69 = QUALIFIED; 70–100 = POTENSIAL.
- Existing active lead by the same phone/outlet is linked rather than duplicated.

## Handover
- CS uses the existing `handover_lead_to_sales(p_lead_id)` RPC from the Inbox.
- Sales continues to claim through the existing Lead Tracker `claim_lead(p_lead_id,'SALES')` workflow.
- No new Sales claim path or parallel KPI counter is introduced.
- Existing 7-day lead lifecycle and existing commission/KPI logic remain unchanged.

## Security and safety
- `customers` keeps RLS enabled and management-only access. Sambungan webhook writes with the server-side service role; no service key is exposed to the browser.
- The WhatsApp review RPC requires an authenticated active CS, verifies the chat is claimed by that user, uses a fixed empty search_path, and is not executable by anon.
- CS/Sales phone masking remains presentation-only; original numbers remain unchanged in the database.
- Existing `public.leads` rows, finance, stock, Accurate sync, sales closing, and commission rules are not modified by this integration.
