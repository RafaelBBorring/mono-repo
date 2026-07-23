import { createSupabaseAdmin } from "@/lib/supabaseServer";

export async function validateClinicAccess(request: Request): Promise<{
  clinicId: string;
  userId: string;
} | { error: string; status: number }> {
  try {
    const body = await request.clone().json().catch(() => ({})) as { clinicId?: string };
    const clinicId = body.clinicId;

    if (!clinicId) return { error: "clinicId e obrigatorio.", status: 400 };

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return { error: "Autenticacao obrigatoria.", status: 401 };

    const supabase = createSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const userId = authData.user?.id;
    if (authError || !userId) return { error: "Sessao invalida ou expirada.", status: 401 };

    const { data: membership, error } = await supabase
      .from("clinic_doctors")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !membership) return { error: "Acesso negado.", status: 403 };
    if (membership.role !== "admin") return { error: "Apenas administradores podem gerenciar cobranca.", status: 403 };

    return { clinicId, userId };
  } catch {
    return { error: "Requisicao invalida.", status: 400 };
  }
}
