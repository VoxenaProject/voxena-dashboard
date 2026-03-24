import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/support — Enregistre un message de support
// Stocke dans agent_logs (visible dans l'admin) et pourrait envoyer un email
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { message, email } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  // Enregistrer dans agent_logs pour être visible dans le dashboard admin
  await supabase.from("agent_logs").insert({
    event_type: "support_message",
    payload: {
      message: message.trim(),
      email: email?.trim() || null,
      timestamp: new Date().toISOString(),
    },
  });

  // TODO: Envoyer un email à info@voxena.pro via Resend ou un autre service
  // await resend.emails.send({
  //   from: 'support@app.getvoxena.com',
  //   to: 'info@voxena.pro',
  //   subject: `[Support] Nouveau message${email ? ` de ${email}` : ''}`,
  //   text: message,
  // });

  return NextResponse.json({ success: true });
}
