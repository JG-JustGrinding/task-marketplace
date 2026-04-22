create or replace function public.accept_task_submission_with_payout(
  p_task_id bigint,
  p_submission_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_submission record;
  v_profile record;
  v_platform_take_rate numeric := 0.10;
  v_gross_cents integer := 0;
  v_worker_cents integer := 0;
  v_platform_cents integer := 0;
  v_available_at timestamptz;
  v_row_count integer := 0;
begin
  select id, user_id, status, price, title
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Task not found');
  end if;

  if v_task.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Task is not active');
  end if;

  select id, task_id, user_id, status
  into v_submission
  from public.task_submissions
  where id = p_submission_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Submission not found');
  end if;

  if v_submission.task_id <> p_task_id then
    return jsonb_build_object('ok', false, 'error', 'Submission does not belong to this task');
  end if;

  if coalesce(v_submission.status, '') not in ('pending', 'resubmission') then
    return jsonb_build_object('ok', false, 'error', 'Submission is not awaiting review');
  end if;

  select id, pending_balance_cents, earner_pro_active, earner_pro_expires_at
  into v_profile
  from public.profiles
  where id = v_submission.user_id
  for update;

  if not found then
    raise exception 'Profile not found for submission user %', v_submission.user_id;
  end if;

  if coalesce(v_profile.earner_pro_active, false)
    or (v_profile.earner_pro_expires_at is not null and v_profile.earner_pro_expires_at > now()) then
    v_platform_take_rate := 0.03;
  end if;

  v_gross_cents := greatest(0, round(coalesce(v_task.price, 0)::numeric * 100)::integer);
  v_worker_cents := round(v_gross_cents * (1 - v_platform_take_rate));
  v_platform_cents := greatest(0, v_gross_cents - v_worker_cents);

  update public.task_submissions
  set status = 'accepted'
  where id = p_submission_id;

  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Failed to mark submission % as accepted', p_submission_id;
  end if;

  update public.task_submissions
  set status = 'rejected'
  where task_id = p_task_id
    and id <> p_submission_id;

  update public.task_activations
  set status = 'accepted'
  where user_id = v_submission.user_id
    and task_id = p_task_id;

  get diagnostics v_row_count = row_count;
  if v_row_count < 1 then
    raise exception 'Missing activation for accepted submission %, task %', p_submission_id, p_task_id;
  end if;

  update public.task_activations
  set status = 'rejected'
  where task_id = p_task_id
    and user_id <> v_submission.user_id;

  update public.tasks
  set status = 'task_accepted'
  where id = p_task_id;

  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Failed to update task % to task_accepted', p_task_id;
  end if;

  if v_worker_cents > 0 then
    v_available_at := now() + interval '3 days';

    insert into public.task_earnings (
      submitter_id,
      task_id,
      submission_id,
      amount_cents,
      status,
      available_at
    )
    values (
      v_submission.user_id,
      p_task_id,
      p_submission_id,
      v_worker_cents,
      'pending',
      v_available_at
    );

    update public.profiles
    set pending_balance_cents = coalesce(pending_balance_cents, 0) + v_worker_cents
    where id = v_submission.user_id;

    get diagnostics v_row_count = row_count;
    if v_row_count <> 1 then
      raise exception 'Failed to update pending balance for user %', v_submission.user_id;
    end if;
  end if;

  if v_platform_cents > 0 then
    insert into public.platform_earnings (
      task_id,
      submitter_id,
      amount_cents
    )
    values (
      p_task_id,
      v_submission.user_id,
      v_platform_cents
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_task_submission_with_payout(bigint, bigint) from public;
grant execute on function public.accept_task_submission_with_payout(bigint, bigint) to authenticated;
grant execute on function public.accept_task_submission_with_payout(bigint, bigint) to service_role;