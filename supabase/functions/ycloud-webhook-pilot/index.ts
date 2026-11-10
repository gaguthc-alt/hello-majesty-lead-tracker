// Hello Majesty — YCloud WhatsApp webhook pilot
// Receives signed YCloud events and stores them in the existing
// public.whatsapp_webhook_events queue. It does not create leads or send messages yet.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, ycloud-signature, x-webhook-endpoint-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function parseSignature(header: string | null) {
  if (!header) return null;
  const parts = new Map<string, string>();
  for (const item of header.split(",")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    parts.set(item.slice(0, separator).trim(), item.slice(separator + 1).trim());
  }
  const timestamp = parts.get("t");
  const signature = parts.get("s");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return null;
  }
  return { timestamp, signature: signature.toLowerCase() };
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function verifyYCloudSignature(rawBody: string, header: string | null, secret: string) {
  const parsed = parseSignature(header);
  if (!parsed) return false;

  // Allow YCloud retries over several hours; unique provider event IDs prevent replay.
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(parsed.timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 24 * 60 * 60) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedPayload = new TextEncoder().encode(parsed.timestamp + "." + rawBody);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signedPayload));
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected, parsed.signature);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method === "GET") return json({ service: "hello-majesty-ycloud-webhook-pilot", ready: true });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const webhookSecret = Deno.env.get("YCLOUD_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook endpoint is not configured" }, 503);
  }

  const rawBody = await request.text();
  if (rawBody.length > 1024 * 1024) return json({ error: "Payload too large" }, 413);

  const valid = await verifyYCloudSignature(
    rawBody,
    request.headers.get("YCloud-Signature"),
    webhookSecret,
  ).catch(() => false);
  if (!valid) return json({ error: "Invalid webhook signature" }, 401);

  let event: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ error: "Invalid event payload" }, 400);
    }
    event = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const eventId = typeof event.id === "string" ? event.id.trim() : "";
  if (!eventId) return json({ error: "Missing provider event ID" }, 400);

  const response = await fetch(
    `${supabaseUrl}/rest/v1/whatsapp_webhook_events?on_conflict=provider_event_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        provider_event_id: eventId,
        event_type: typeof event.type === "string" ? event.type : "unknown",
        payload: event,
        processed: false,
      }),
    },
  );

  if (!response.ok) {
    // Do not acknowledge to YCloud; its retry policy can redeliver the event.
    return json({ error: "Could not persist webhook event" }, 503);
  }

  return json({ received: true });
});
