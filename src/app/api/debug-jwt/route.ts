import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function GET() {
  try {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
    const enc = new TextEncoder();
    const jwt = await new SignJWT({ test: true })
      .setProtectedHeader({ alg: "HS256" })
      .sign(enc.encode(secret));
    return NextResponse.json({ ok: true, jwt: jwt.slice(0, 30) + "..." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) });
  }
}
