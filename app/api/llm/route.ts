import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "LLM provider not configured yet. Implement in M4 (per tickets)." },
    { status: 501 }
  );
}
