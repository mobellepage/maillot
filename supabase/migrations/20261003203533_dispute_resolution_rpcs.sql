-- dispute_resolution_rpcs
-- Admin-only cross-user read of open/all disputes, joined with their order,
-- mirroring the trending_scores() SECURITY DEFINER pattern used elsewhere —
-- avoids having to broaden disputes/orders RLS SELECT policies for admins.
create or replace function public.list_disputes_for_admin()
returns table (
  dispute_id uuid,
  order_id uuid,
  dispute_status text,
  reason text,
  resolution_note text,
  created_at timestamptz,
  buyer_id uuid,
  seller_id uuid,
  shirt_id text,
  custom_item_id text,
  size text,
  amount numeric,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'not authorized';
  end if;

  return query
    select d.id, d.order_id, d.status, d.reason, d.resolution_note, d.created_at,
           o.buyer_id, o.seller_id, o.shirt_id, o.custom_item_id, o.size, o.amount, o.status
    from disputes d
    join orders o on o.id = d.order_id
    order by d.created_at desc;
end;
$$;

-- Atomically resolves a dispute: updates the dispute record and the
-- underlying order's escrow status in one transaction. Reuses the existing
-- on_order_status_change trigger (notify_order_status_change) to notify both
-- parties — it already handles 'released' and 'refunded' generically.
create or replace function public.resolve_dispute(p_dispute_id uuid, p_outcome text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'not authorized';
  end if;
  if p_outcome not in ('release', 'refund') then
    raise exception 'invalid outcome: %', p_outcome;
  end if;

  select order_id into v_order_id from disputes where id = p_dispute_id;
  if v_order_id is null then
    raise exception 'dispute not found';
  end if;

  update orders
    set status = case when p_outcome = 'release' then 'released' else 'refunded' end,
        released_at = case when p_outcome = 'release' then now() else released_at end,
        updated_at = now()
    where id = v_order_id;

  update disputes
    set status = 'resolved_' || p_outcome,
        resolution_note = p_note,
        updated_at = now()
    where id = p_dispute_id;
end;
$$;
