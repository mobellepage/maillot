-- The first version referenced columns of other tables in one condition
-- (plpgsql resolves new.status even when tg_table_name doesn't match), so it
-- failed on profiles. One branch per table.
create or replace function private.audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_action text; v_target text; v_details jsonb := '{}';
begin
  case tg_table_name
    when 'disputes' then
      if new.status is distinct from old.status then
        v_action := 'dispute.' || new.status; v_target := new.id::text; v_details := jsonb_build_object('order_id', new.order_id, 'note', new.resolution_note);
      end if;
    when 'review_queue' then
      if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
        v_action := 'review.' || new.status; v_target := new.id; v_details := jsonb_build_object('reason', new.reason);
      end if;
    when 'orders' then
      if new.inspection is distinct from old.inspection then
        v_action := 'inspection.' || new.inspection; v_target := new.id::text; v_details := jsonb_build_object('note', new.inspection_note, 'outbound_tracking', new.outbound_tracking);
      end if;
    when 'certificates' then
      if new.revoked_at is distinct from old.revoked_at then
        v_action := 'certificate.revoke'; v_target := new.code; v_details := jsonb_build_object('reason', new.revoked_reason);
      elsif new.nfc_uid is distinct from old.nfc_uid then
        v_action := 'certificate.tag'; v_target := new.code; v_details := jsonb_build_object('uid', new.nfc_uid);
      end if;
    when 'api_keys' then
      if tg_op = 'INSERT' then
        v_action := 'api_key.create'; v_target := new.id::text; v_details := jsonb_build_object('label', new.label, 'prefix', new.key_prefix);
      elsif new.revoked_at is distinct from old.revoked_at then
        v_action := 'api_key.revoke'; v_target := new.id::text; v_details := jsonb_build_object('label', new.label);
      end if;
    when 'profiles' then
      if new.is_admin is distinct from old.is_admin then
        v_action := case when new.is_admin then 'admin.grant' else 'admin.revoke' end; v_target := new.id::text;
      end if;
    when 'catalog_shirts' then
      v_action := 'catalog.' || lower(tg_op);
      if tg_op = 'DELETE' then v_target := old.id; else v_target := new.id; end if;
    else
      null;
  end case;
  if v_action is not null then
    insert into audit_log (actor, action, target, details) values (auth.uid(), v_action, v_target, v_details);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke execute on function private.audit() from public, anon, authenticated;
