create or replace function public.begin_delete_funded_task(
  p_task_id bigint,
  p_platform_cancellation_fee_rate numeric default 0.15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_task record;
  v_active_activation_count integer := 0;
  v_gross_cents integer := 0;
  v_platform_fee_cents integer := 0;
  v_refund_cents integer := 0;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select id, user_id, status, price, stripe_payment_intent_id
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found or v_task.user_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Task not found');
  end if;

  if v_task.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'This task cannot be deleted in its current state.');
  end if;

  select count(*)::integer
  into v_active_activation_count
  from public.task_activations
  where task_id = p_task_id
    and status in (
      'waiting_submission',
      'pending',
      'resubmission',
      'resubmission_requested',
      'accepted'
    );

  if v_active_activation_count > 0 then
    return jsonb_build_object(
      'ok',
      false,
      'error',
      'This task cannot be deleted because it has active activations.'
    );
  end if;

  if v_task.stripe_payment_intent_id is null then
    return jsonb_build_object(
      'ok',
      false,
      'error',
      'This task cannot be deleted because its payment record is incomplete.'
    );
  end if;

  v_gross_cents := greatest(0, round(coalesce(v_task.price, 0)::numeric * 100)::integer);

  if v_gross_cents <= 0 then
    return jsonb_build_object(
      'ok',
      false,
      'error',
      'This task does not appear to have a valid funded amount.'
    );
  end if;

  v_platform_fee_cents := greatest(
    0,
    round(v_gross_cents * greatest(0, p_platform_cancellation_fee_rate))::integer
  );
  v_refund_cents := greatest(0, v_gross_cents - v_platform_fee_cents);

  update public.tasks
  set status = 'pending_payment'
  where id = p_task_id
    and user_id = v_actor_id
    and status = 'active';

  if not found then
    return jsonb_build_object(
      'ok',
      false,
      'error',
      'This task is already being deleted or was just changed. Please refresh and try again.'
    );
  end if;

  return jsonb_build_object(
    'ok',
    true,
    'payment_intent_id',
    v_task.stripe_payment_intent_id,
    'refund_cents',
    v_refund_cents,
    'platform_fee_cents',
    v_platform_fee_cents
  );
end;
$$;

create or replace function public.rollback_delete_funded_task(
  p_task_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  update public.tasks
  set status = 'active'
  where id = p_task_id
    and user_id = v_actor_id
    and status = 'pending_payment'
    and stripe_payment_intent_id is not null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.finalize_delete_funded_task(
  p_task_id bigint,
  p_platform_fee_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if exists (
    select 1
    from public.tasks
    where id = p_task_id
      and user_id = v_actor_id
      and status = 'pending_payment'
      and stripe_payment_intent_id is not null
  ) then
    if coalesce(p_platform_fee_cents, 0) > 0 then
      insert into public.platform_earnings (
        task_id,
        submitter_id,
        amount_cents
      )
      values (
        p_task_id,
        v_actor_id,
        p_platform_fee_cents
      );
    end if;

    delete from public.tasks
    where id = p_task_id
      and user_id = v_actor_id
      and status = 'pending_payment'
      and stripe_payment_intent_id is not null;

    if found then
      return jsonb_build_object('ok', true);
    end if;
  end if;

  return jsonb_build_object(
    'ok',
    false,
    'error',
    'Refund issued but failed to finalize task deletion.'
  );
end;
$$;

revoke all on function public.begin_delete_funded_task(bigint, numeric) from public;
grant execute on function public.begin_delete_funded_task(bigint, numeric) to authenticated;
grant execute on function public.begin_delete_funded_task(bigint, numeric) to service_role;

revoke all on function public.rollback_delete_funded_task(bigint) from public;
grant execute on function public.rollback_delete_funded_task(bigint) to authenticated;
grant execute on function public.rollback_delete_funded_task(bigint) to service_role;

revoke all on function public.finalize_delete_funded_task(bigint, integer) from public;
grant execute on function public.finalize_delete_funded_task(bigint, integer) to authenticated;
grant execute on function public.finalize_delete_funded_task(bigint, integer) to service_role;