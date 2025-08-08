import { NextResponse } from "next/server";
import { getAuthUrl } from "../../../../lib/youtube";

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
