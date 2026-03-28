import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { to, subject, text } = await request.json();

  const apiKey = process.env.RESEND_API_KEY;
  // Strip surrounding quotes that some env parsers leave in
  const from = (process.env.RESEND_FROM_EMAIL ?? "HireAva <onboarding@resend.dev>").replace(/^["']|["']$/g, "");

  if (!apiKey || apiKey === "re_your_api_key_here") {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set — add your key to .env.local and restart the dev server" },
      { status: 500 },
    );
  }

  if (!to || !subject || !text) {
    return NextResponse.json({ error: "to, subject, and text are required" }, { status: 400 });
  }

  let data: unknown;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    data = await res.json();

    if (!res.ok) {
      // Log full Resend response on the server for easier debugging
      console.error("[send-email] Resend error:", JSON.stringify(data, null, 2));
      const resendData = data as Record<string, unknown>;
      const message =
        (resendData?.message as string) ??
        (resendData?.error as string) ??
        `Resend responded with ${res.status}`;
      return NextResponse.json({ error: message }, { status: res.status });
    }
  } catch (err) {
    console.error("[send-email] Network error:", err);
    return NextResponse.json({ error: "Could not reach Resend API" }, { status: 502 });
  }

  return NextResponse.json(data);
}
