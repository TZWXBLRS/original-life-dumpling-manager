import { NextResponse } from "next/server";
import { hkdf } from "@panva/hkdf";

export async function GET() {
  try {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
    const salt = "authjs.session-token";
    const key = await hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
    return NextResponse.json({ ok: true, keyLen: key.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e), stack: e?.stack?.slice(0, 300) });
  }
}
