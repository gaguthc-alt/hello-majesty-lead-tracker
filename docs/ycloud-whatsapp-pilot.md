# Hello Majesty — YCloud WhatsApp pilot

## Scope of this pilot endpoint

- Receives YCloud webhook POST events.
- Verifies `YCloud-Signature` using HMAC-SHA256 over `timestamp + "." + raw request body`.
- Stores the original event in the existing `public.whatsapp_webhook_events` table.
- Uses `provider_event_id` as the idempotency key. The table already has a unique index on this column.
- Does not create or modify leads, does not send WhatsApp messages, and does not alter the production WhatsApp number.

## Deploy

Deploy as a separate Supabase Edge Function named `ycloud-webhook-pilot` with JWT verification disabled because YCloud is an external webhook sender. Configure these Edge Function secrets before enabling a YCloud endpoint:

- `YCLOUD_WEBHOOK_SECRET`: signing secret returned by YCloud when creating the webhook endpoint.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: use the project's built-in Edge Function environment values; never place them in browser code or commit them.

Function URL:

`https://ksowzhhmzrumyciehuyv.supabase.co/functions/v1/ycloud-webhook-pilot`

## YCloud events to subscribe to first

- `whatsapp.inbound_message.received`
- `whatsapp.message.updated`

## Test sequence

1. Deploy the function and set the webhook signing secret.
2. Use YCloud's webhook test tool with a signed sample event.
3. Confirm one row appears in `public.whatsapp_webhook_events`.
4. Send the same event again; row count must remain unchanged.
5. Send a request with an invalid signature; expect HTTP 401 and no row.
6. Only after these tests pass, implement a separate processor that normalizes inbound events into `whatsapp_messages` and matches or creates leads under explicit attribution rules.

## Safety

Do not connect the production WhatsApp number during the pilot. Do not store API keys or webhook secrets in GitHub. Keep raw webhook events access restricted by existing RLS; the Edge Function writes with its server-side service role key.
