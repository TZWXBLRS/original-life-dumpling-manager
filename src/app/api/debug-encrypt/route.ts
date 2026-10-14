import { NextResponse } from "next/server";
import { EncryptJWT, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@panva/hkdf";

export async function GET() {
  const result: any = {};
  try {
    result.randomUUID = typeof crypto.randomUUID;
    result.uuid = crypto.randomUUID();

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
    const salt = "authjs.session-token";
    const encryptionSecret = await hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
    result.encryptionKeyLen = encryptionSecret.length;

    const thumbprint = await calculateJwkThumbprint(
      { kty: "oct", k: base64url.encode(encryptionSecret) },
      `sha${encryptionSecret.byteLength << 3}` as "sha256" | "sha384" | "sha512"
    );
    result.thumbprint = thumbprint.slice(0, 20) + "...";

    const jwt = await new EncryptJWT({ test: true })
      .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512", kid: thumbprint })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .setJti(crypto.randomUUID())
      .encrypt(encryptionSecret);
    result.jwtLen = jwt.length;
    result.ok = true;
  } catch (e: any) {
    result.ok = false;
    result.error = e?.message || String(e);
    result.stack = e?.stack?.slice(0, 400);
  }
  return NextResponse.json(result);
}
