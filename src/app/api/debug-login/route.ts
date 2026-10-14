import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export const runtime = "edge";

export async function POST(req: Request) {
  const { phone, password } = await req.json();
  const steps: string[] = [];
  try {
    steps.push(`start: phone=${phone}`);
    const user = await prisma.user.findUnique({
      where: { phone: String(phone) },
    });
    steps.push(`user found: ${user ? user.name : "null"}, active=${user?.isActive}, hashLen=${user?.passwordHash?.length || 0}`);
    if (!user) return NextResponse.json({ ok: false, steps, error: "no user" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    steps.push(`bcrypt.compare result: ${ok}`);

    return NextResponse.json({ ok, steps });
  } catch (e: any) {
    steps.push(`ERROR: ${e?.message || String(e)}`);
    steps.push(`STACK: ${e?.stack?.slice(0, 300) || ""}`);
    return NextResponse.json({ ok: false, steps, error: e?.message });
  }
}
