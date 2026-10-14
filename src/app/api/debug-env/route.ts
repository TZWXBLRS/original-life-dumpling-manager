import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    AUTH_SECRET_set: !!process.env.AUTH_SECRET,
    AUTH_SECRET_len: process.env.AUTH_SECRET?.length || 0,
    NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_len: process.env.NEXTAUTH_SECRET?.length || 0,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    CF_PAGES: process.env.CF_PAGES,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN_set: !!process.env.TURSO_AUTH_TOKEN,
    TURSO_AUTH_TOKEN_len: process.env.TURSO_AUTH_TOKEN?.length || 0,
    AUTH_GITHUB_ID_set: !!process.env.AUTH_GITHUB_ID,
  });
}
