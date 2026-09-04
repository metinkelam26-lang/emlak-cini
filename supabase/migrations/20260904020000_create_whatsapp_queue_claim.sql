-- WhatsApp V1 - Day 1 / Part 2
-- Atomic queue claim + completion / retry helpers

create or replace function public.whatsapp_mesaj_claim(
    p_limit integer default 10
)
returns setof public.whatsapp_mesajlari
language plpgsql
security definer
set search_path = ''
as $$
begin
    return query
    with secilenler as (
        select wm.id
        from public.whatsapp_mesajlari wm
        where wm.processing_status in ('pending', 'retry')
        order by wm.received_at asc
        for update skip locked
        limit greatest(1, least(coalesce(p_limit, 10), 100))
    ),
    guncellenenler as (
        update public.whatsapp_mesajlari wm
        set
            processing_status = 'processing',
            processing_started_at = now(),
            updated_at = now(),
            last_error = null
        from secilenler s
        where wm.id = s.id
        returning wm.*
    )
    select *
    from guncellenenler
    order by received_at asc;
end;
$$;

create or replace function public.whatsapp_mesaj_tamamla(
    p_mesaj_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.whatsapp_mesajlari
    set
        processing_status = 'completed',
        processed_at = now(),
        updated_at = now(),
        last_error = null
    where id = p_mesaj_id
      and processing_status = 'processing';
end;
$$;

create or replace function public.whatsapp_mesaj_hata(
    p_mesaj_id uuid,
    p_error text,
    p_max_retry integer default 5
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.whatsapp_mesajlari
    set
        retry_count = retry_count + 1,
        processing_status =
            case
                when retry_count + 1 >= greatest(1, coalesce(p_max_retry, 5))
                    then 'failed'
                else 'retry'
            end,
        processing_started_at = null,
        processed_at =
            case
                when retry_count + 1 >= greatest(1, coalesce(p_max_retry, 5))
                    then now()
                else null
            end,
        last_error = left(coalesce(p_error, 'unknown error'), 4000),
        updated_at = now()
    where id = p_mesaj_id
      and processing_status = 'processing';
end;
$$;

revoke all on function public.whatsapp_mesaj_claim(integer) from public;
revoke all on function public.whatsapp_mesaj_tamamla(uuid) from public;
revoke all on function public.whatsapp_mesaj_hata(uuid, text, integer) from public;

comment on function public.whatsapp_mesaj_claim(integer) is
'Atomically claims pending/retry WhatsApp messages using FOR UPDATE SKIP LOCKED. Intended for trusted backend workers only.';

comment on function public.whatsapp_mesaj_tamamla(uuid) is
'Marks a claimed WhatsApp message as completed.';

comment on function public.whatsapp_mesaj_hata(uuid, text, integer) is
'Marks a claimed WhatsApp message for retry or permanently failed after max retries.';
