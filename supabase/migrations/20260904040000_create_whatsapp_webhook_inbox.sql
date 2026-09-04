-- WhatsApp V1 - Durable raw webhook inbox
-- Store verified provider events before message extraction.

create table if not exists public.whatsapp_webhook_events (
    id uuid primary key default gen_random_uuid(),

    provider text not null default 'whatsapp'
        check (provider = 'whatsapp'),

    payload_hash text not null,

    object_type text,
    provider_entry_id text,

    phone_number_id text,
    ofis_id uuid references public.ofisler(id) on delete set null,

    raw_payload jsonb not null,

    processing_status text not null default 'pending'
        check (
            processing_status in (
                'pending',
                'processing',
                'completed',
                'failed',
                'retry',
                'ignored'
            )
        ),

    retry_count integer not null default 0
        check (retry_count >= 0),

    next_retry_at timestamptz,
    processing_started_at timestamptz,
    processed_at timestamptz,

    last_error text,

    received_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (provider, payload_hash)
);

create index if not exists idx_whatsapp_webhook_events_queue
    on public.whatsapp_webhook_events (
        processing_status,
        next_retry_at,
        received_at
    );

create index if not exists idx_whatsapp_webhook_events_phone
    on public.whatsapp_webhook_events (
        phone_number_id,
        received_at desc
    );

create index if not exists idx_whatsapp_webhook_events_ofis
    on public.whatsapp_webhook_events (
        ofis_id,
        received_at desc
    )
    where ofis_id is not null;

alter table public.whatsapp_webhook_events enable row level security;

revoke all on public.whatsapp_webhook_events from anon;
revoke all on public.whatsapp_webhook_events from authenticated;

comment on table public.whatsapp_webhook_events is
'Verified raw WhatsApp webhook inbox. Provider payload is persisted before message extraction or business processing.';

comment on column public.whatsapp_webhook_events.payload_hash is
'SHA-256 hash of the raw request body used for webhook-level idempotency.';

comment on column public.whatsapp_webhook_events.raw_payload is
'Original verified provider webhook payload retained for replay, debugging and recovery.';
