import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const META_APP_SECRET = Deno.env.get("META_APP_SECRET");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
if (!WHATSAPP_VERIFY_TOKEN) throw new Error("WHATSAPP_VERIFY_TOKEN missing");
if (!META_APP_SECRET) throw new Error("META_APP_SECRET missing");

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let diff = 0;

  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

function hexToBytes(hex: string) {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("invalid hex");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

async function hmacSha256(
  secret: string,
  body: Uint8Array,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      body,
    ),
  );
}

async function verifyMetaSignature(
  body: Uint8Array,
  signatureHeader: string | null,
) {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const suppliedHex = signatureHeader.slice("sha256=".length);

  let supplied: Uint8Array;

  try {
    supplied = hexToBytes(suppliedHex);
  } catch {
    return false;
  }

  const expected = await hmacSha256(
    META_APP_SECRET,
    body,
  );

  return timingSafeEqual(expected, supplied);
}

async function sha256Hex(body: Uint8Array) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", body),
  );

  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extractMetadata(payload: any) {
  const objectType =
    typeof payload?.object === "string"
      ? payload.object
      : null;

  const firstEntry =
    Array.isArray(payload?.entry)
      ? payload.entry[0]
      : null;

  const providerEntryId =
    typeof firstEntry?.id === "string"
      ? firstEntry.id
      : null;

  const firstChange =
    Array.isArray(firstEntry?.changes)
      ? firstEntry.changes[0]
      : null;

  const phoneNumberId =
    typeof firstChange?.value?.metadata?.phone_number_id === "string"
      ? firstChange.value.metadata.phone_number_id
      : null;

  return {
    objectType,
    providerEntryId,
    phoneNumberId,
  };
}

async function handleVerification(req: Request) {
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return new Response("Forbidden", {
    status: 403,
    headers: {
      "cache-control": "no-store",
    },
  });
}

async function handleWebhook(req: Request) {
  const rawBody = new Uint8Array(await req.arrayBuffer());

  const signatureHeader =
    req.headers.get("x-hub-signature-256");

  const validSignature =
    await verifyMetaSignature(
      rawBody,
      signatureHeader,
    );

  if (!validSignature) {
    console.warn("whatsapp_webhook_invalid_signature");

    return jsonResponse(
      {
        ok: false,
        error: "invalid_signature",
      },
      401,
    );
  }

  let payload: any;

  try {
    payload = JSON.parse(
      new TextDecoder().decode(rawBody),
    );
  } catch {
    console.warn("whatsapp_webhook_invalid_json");

    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
      },
      400,
    );
  }

  const payloadHash = await sha256Hex(rawBody);

  const {
    objectType,
    providerEntryId,
    phoneNumberId,
  } = extractMetadata(payload);

  let officeId: string | null = null;

  if (phoneNumberId) {
    const { data: connection, error: connectionError } =
      await supabase
        .from("whatsapp_baglantilari")
        .select("ofis_id")
        .eq("provider", "whatsapp")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

    if (connectionError) {
      console.error(
        "whatsapp_connection_lookup_failed",
        connectionError,
      );

      return jsonResponse(
        {
          ok: false,
          error: "connection_lookup_failed",
        },
        500,
      );
    }

    officeId = connection?.ofis_id ?? null;
  }

  const { error: insertError } = await supabase
    .from("whatsapp_webhook_events")
    .insert({
      provider: "whatsapp",
      payload_hash: payloadHash,
      object_type: objectType,
      provider_entry_id: providerEntryId,
      phone_number_id: phoneNumberId,
      ofis_id: officeId,
      raw_payload: payload,
      processing_status: "pending",
      retry_count: 0,
      received_at: new Date().toISOString(),
    });

  if (insertError) {
    if (insertError.code === "23505") {
      console.log(
        "whatsapp_webhook_duplicate_ignored",
        payloadHash,
      );

      return jsonResponse({
        ok: true,
        duplicate: true,
      });
    }

    console.error(
      "whatsapp_webhook_persist_failed",
      insertError,
    );

    return jsonResponse(
      {
        ok: false,
        error: "persist_failed",
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    stored: true,
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "GET") {
      return await handleVerification(req);
    }

    if (req.method === "POST") {
      return await handleWebhook(req);
    }

    return new Response(
      "Method Not Allowed",
      {
        status: 405,
        headers: {
          "allow": "GET, POST",
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "whatsapp_webhook_unhandled_error",
      error,
    );

    return jsonResponse(
      {
        ok: false,
        error: "internal_error",
      },
      500,
    );
  }
});
