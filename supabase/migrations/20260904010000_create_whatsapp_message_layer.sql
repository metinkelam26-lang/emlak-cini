-- WhatsApp V1 - Day 1
-- Durable message ingestion + office connection mapping

create table if not exists public.whatsapp_baglantilari (
    id uuid primary key default gen_random_uuid(),
    ofis_id uuid not null references public.ofisler(id) on delete cascade,

    provider text not null default 'whatsapp'
        check (provider in ('whatsapp')),

    waba_id text,
    phone_number_id text not null,
    display_phone_number text,

    durum text not null default 'test'
        check (durum in ('test', 'aktif', 'pasif', 'hata')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (provider, phone_number_id)
);

create table if not exists public.whatsapp_mesajlari (
    id uuid primary key default gen_random_uuid(),

    ofis_id uuid not null references public.ofisler(id) on delete cascade,
    baglanti_id uuid references public.whatsapp_baglantilari(id) on delete set null,
    musteri_id uuid references public.musteriler(id) on delete set null,

    provider text not null default 'whatsapp'
        check (provider in ('whatsapp')),

    provider_message_id text not null,

    phone_number_id text,
    wa_id text,
    telefon_normalized text,

    yon text not null default 'inbound'
        check (yon in ('inbound', 'outbound')),

    mesaj_tipi text not null default 'text',

    mesaj_metni text,

    raw_payload jsonb not null default '{}'::jsonb,

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

    last_error text,

    received_at timestamptz not null default now(),
    processing_started_at timestamptz,
    processed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (provider, provider_message_id)
);

create index if not exists idx_whatsapp_mesajlari_ofis_status
    on public.whatsapp_mesajlari (ofis_id, processing_status, received_at);

create index if not exists idx_whatsapp_mesajlari_pending
    on public.whatsapp_mesajlari (received_at)
    where processing_status in ('pending', 'retry');

create index if not exists idx_whatsapp_mesajlari_telefon
    on public.whatsapp_mesajlari (ofis_id, telefon_normalized);

create index if not exists idx_whatsapp_mesajlari_musteri
    on public.whatsapp_mesajlari (musteri_id, received_at desc)
    where musteri_id is not null;

create index if not exists idx_whatsapp_baglantilari_ofis
    on public.whatsapp_baglantilari (ofis_id);

alter table public.whatsapp_baglantilari enable row level security;
alter table public.whatsapp_mesajlari enable row level security;

drop policy if exists "whatsapp_baglantilari_select_own_office"
    on public.whatsapp_baglantilari;

create policy "whatsapp_baglantilari_select_own_office"
on public.whatsapp_baglantilari
for select
to authenticated
using (
    ofis_id in (
        select public.kullanici_ofisleri()
    )
);

drop policy if exists "whatsapp_mesajlari_select_own_office"
    on public.whatsapp_mesajlari;

create policy "whatsapp_mesajlari_select_own_office"
on public.whatsapp_mesajlari
for select
to authenticated
using (
    ofis_id in (
        select public.kullanici_ofisleri()
    )
);

revoke all on public.whatsapp_baglantilari from anon;
revoke all on public.whatsapp_mesajlari from anon;

grant select on public.whatsapp_baglantilari to authenticated;
grant select on public.whatsapp_mesajlari to authenticated;

comment on table public.whatsapp_baglantilari is
'WhatsApp Cloud API phone number / office mapping. Access tokens and secrets are NOT stored here.';

comment on table public.whatsapp_mesajlari is
'Durable WhatsApp message inbox. Messages are stored before parser, matching or action processing.';

comment on column public.whatsapp_mesajlari.provider_message_id is
'Provider supplied unique message id used for idempotency / duplicate prevention.';

comment on column public.whatsapp_mesajlari.raw_payload is
'Original webhook message payload retained for debugging and safe reprocessing.';
