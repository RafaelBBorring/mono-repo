update public.source_items
set title = null
where remote_type = 'image'
  and nullif(metadata->>'filename', '') is not null
  and lower(title) = lower(metadata->>'filename');

create or replace function public.merge_miro_sdk_capture(target_workspace_id uuid, target_project_id uuid, target_source_id uuid, captured_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  captured jsonb;
  merged_count integer := 0;
begin
  if not public.is_workspace_editor(target_workspace_id) and auth.role() <> 'service_role' then
    raise exception 'Sem permissão para esta fonte';
  end if;
  if not exists (select 1 from public.project_sources where id = target_source_id and project_id = target_project_id and workspace_id = target_workspace_id and provider = 'miro') then
    raise exception 'Fonte do Miro não encontrada';
  end if;
  for captured in select value from jsonb_array_elements(captured_items)
  loop
    insert into public.source_items (
      workspace_id,
      project_id,
      source_id,
      remote_id,
      remote_type,
      parent_remote_id,
      title,
      active,
      metadata
    ) values (
      target_workspace_id,
      target_project_id,
      target_source_id,
      captured->>'id',
      coalesce(captured->>'type', 'unsupported'),
      nullif(captured->>'parentId', ''),
      nullif(captured->>'title', ''),
      true,
      jsonb_build_object(
        'position', jsonb_build_object('x', captured->'x', 'y', captured->'y', 'relativeTo', captured->'relativeTo'),
        'geometry', jsonb_build_object('width', captured->'width', 'height', captured->'height', 'rotation', captured->'rotation'),
        'sdkCapture', true,
        'filename', captured->'filename'
      )
    )
    on conflict (source_id, remote_id) do update set
      remote_type = excluded.remote_type,
      parent_remote_id = coalesce(excluded.parent_remote_id, public.source_items.parent_remote_id),
      title = coalesce(excluded.title, public.source_items.title),
      content_hash = null,
      active = true,
      metadata = public.source_items.metadata || excluded.metadata,
      updated_at = now();
    merged_count := merged_count + 1;
  end loop;
  return merged_count;
end;
$$;

revoke all on function public.merge_miro_sdk_capture(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.merge_miro_sdk_capture(uuid, uuid, uuid, jsonb) to service_role;
