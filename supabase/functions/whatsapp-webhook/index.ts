import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN")!;

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
    },
  });
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("90") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90${digits}`;
  }

  return `+${digits}`;
}

async function handleVerification(req: Request) {
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

async function handleWebhook(req: Request) {
  let payload: any;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value;

      const metadata = value?.metadata;
      const phoneNumberId = metadata?.phone_number_id ?? null;

      const messages = Array.isArray(value?.messages)
        ? value.messages
        : [];

      if (!phoneNumberId || messages.length === 0) {
        continue;
      }

      const { data: connection, error: connectionError } =
        await supabase
          .from("whatsapp_baglantilari")
          .select("id, ofis_id")
          .eq("provider", "whatsapp")
          .eq("phone_number_id", phoneNumberId)
          .maybeSingle();

      if (connectionError) {
        console.error("connection_lookup_failed", connectionError);
        continue;
      }

      if (!connection) {
        console.warn("unknown_phone_number_id", phoneNumberId);
        continue;
      }

      for (const message of messages) {
        const providerMessageId = message?.id ?? null;

        if (!providerMessageId) {
          continue;
        }

        const waId = message?.from ?? null;
        const normalizedPhone = normalizePhone(waId);

        let messageText: string | null = null;

        if (message?.type === "text") {
          messageText = message?.text?.body ?? null;
        }

        const receivedAt = message?.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString();

        const { error: insertError } = await supabase
          .from("whatsapp_mesajlari")
          .insert({
            ofis_id: connection.ofis_id,
            baglanti_id: connection.id,
            provider: "whatsapp",
            provider_message_id: providerMessageId,
            phone_number_id: phoneNumberId,
            wa_id: waId,
            telefon_normalized: normalizedPhone,
            yon: "inbound",
            mesaj_tipi: message?.type ?? "unknown",
            mesaj_metni: messageText,
            raw_payload: {
              entry_id: entry?.id ?? null,
              field: change?.field ?? null,
              value,
              message,
            },
            processing_status: "pending",
            retry_count: 0,
            received_at: receivedAt,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            console.log("duplicate_message_ignored", providerMessageId);
            continue;
          }

          console.error(
            "message_insert_failed",
            providerMessageId,
            insertError,
          );
        }
      }
    }
  }

  return jsonResponse({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return handleVerification(req);
  }

  if (req.method === "POST") {
    return handleWebhook(req);
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      allow: "GET, POST",
    },
  });
});
