import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = (body.code || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Informe o codigo do cupom." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("id, code, label, discount_pct, max_uses, current_uses, valid_from, valid_until, active")
      .eq("code", code)
      .maybeSingle();

    if (error || !coupon) {
      return NextResponse.json({ error: "Cupom invalido." }, { status: 404 });
    }

    if (!coupon.active) {
      return NextResponse.json({ error: "Este cupom foi desativado." }, { status: 400 });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ error: "Este cupom ainda nao esta disponivel." }, { status: 400 });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ error: "Este cupom expirou." }, { status: 400 });
    }

    if (coupon.max_uses !== -1 && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ error: "Este cupom atingiu o limite de usos." }, { status: 400 });
    }

    return NextResponse.json({
      id: coupon.id,
      code: coupon.code,
      label: coupon.label,
      discountPct: coupon.discount_pct,
    });
  } catch (err) {
    console.error("Coupon validation failed:", err);
    return NextResponse.json({ error: "Erro ao validar cupom." }, { status: 500 });
  }
}
