import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "../../../../lib/youtube";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!code)
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    await exchangeCodeForTokens(code);
    // In a real UI you might redirect back to the app with a success message
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("YouTube OAuth callback error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
