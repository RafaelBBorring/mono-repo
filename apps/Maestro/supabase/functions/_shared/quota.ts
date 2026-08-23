import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

export async function requireMonthlyQuota(
  service: SupabaseClient,
  workspaceId: string,
  metric: string,
  entitlementKey: string,
  quantity: number,
  context: { projectId: string; userId: string; idempotencyKey: string },
) {
  const { data, error } = await service.rpc('reserve_monthly_quota', {
    target_workspace_id: workspaceId,
    target_project_id: context.projectId,
    target_user_id: context.userId,
    target_metric: metric,
    entitlement_key: entitlementKey,
    requested_quantity: quantity,
    request_key: context.idempotencyKey,
  })
  if (error) throw error
  return data
}
