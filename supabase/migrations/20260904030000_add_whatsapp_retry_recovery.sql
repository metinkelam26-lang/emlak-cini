-- WhatsApp V1 - Day 1 / Part 3
-- Retry backoff + stuck job recovery

alter table public.whatsapp_mesajlari
    add column if not exists next_retry_at timestamptz;

create index if not exists idx_whatsapp_mesajlari_retry_due
    on public.whatsapp_mesajlari (next_retry_at, received_at)
    where processing_status = 'retry';

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
        where
            wm.processing_status = 'pending'
            or (
                wm.processing_status = 'retry'
                and (
                    wm.next_retry_at is null
                    or wm.next_retry_at <= now()
                )
            )
        order by wm.received_at asc
        for update skip locked
        limit greatest(1, least(coalesce(p_limit, 10), 100))
    ),
    guncellenenler as (
        update public.whatsapp_mesajlari wm
        set
            processing_status = 'processing',
            processing_started_at = now(),
            next_retry_at = null,
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
        processing_started_at = null,
        next_retry_at = null,
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
declare
    v_retry_count integer;
begin
    select retry_count + 1
    into v_retry_count
    from public.whatsapp_mesajlari
    where id = p_mesaj_id
      and processing_status = 'processing'
    for update;

    if v_retry_count is null then
        return;
    end if;

    update public.whatsapp_mesajlari
    set
        retry_count = v_retry_count,
        processing_status =
            case
                when v_retry_count >= greatest(1, coalesce(p_max_retry, 5))
                    then 'failed'
                else 'retry'
            end,
        processing_started_at = null,
        next_retry_at =
            case
                when v_retry_count >= greatest(1, coalesce(p_max_retry, 5))
                    then null
                else now()
                    + make_interval(
                        secs => least(
                            900,
                            15 * power(2, greatest(v_retry_count - 1, 0))::integer
                        )
                    )
            end,
        processed_at =
            case
                when v_retry_count >= greatest(1, coalesce(p_max_retry, 5))
                    then now()
                else null
            end,
        last_error = left(coalesce(p_error, 'unknown error'), 4000),
        updated_at = now()
    where id = p_mesaj_id;
end;
$$;

create or replace function public.whatsapp_processing_recover(
    p_stale_after_minutes integer default 10,
    p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_count integer;
begin
    with stale as (
        select wm.id
        from public.whatsapp_mesajlari wm
        where wm.processing_status = 'processing'
          and wm.processing_started_at is not null
          and wm.processing_started_at
              < now() - make_interval(
                    mins => greatest(1, coalesce(p_stale_after_minutes, 10))
                )
        order by wm.processing_started_at asc
        for update skip locked
        limit greatest(1, least(coalesce(p_limit, 100), 1000))
    )
    update public.whatsapp_mesajlari wm
    set
        processing_status = 'retry',
        processing_started_at = null,
        next_retry_at = now(),
        last_error = coalesce(
            wm.last_error || E'\n',
            ''
        ) || 'processing lease expired; recovered automatically',
        updated_at = now()
    from stale s
    where wm.id = s.id;

    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

revoke all on function public.whatsapp_mesaj_claim(integer) from public;
revoke all on function public.whatsapp_mesaj_tamamla(uuid) from public;
revoke all on function public.whatsapp_mesaj_hata(uuid, text, integer) from public;
revoke all on function public.whatsapp_processing_recover(integer, integer) from public;

comment on column public.whatsapp_mesajlari.next_retry_at is
'Next eligible retry time. Prevents hot-loop retries.';

comment on function public.whatsapp_processing_recover(integer, integer) is
'Returns stale processing jobs to retry state after a lease timeout.';
