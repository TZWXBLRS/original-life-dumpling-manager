import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result: any = {};
  try {
    // 1. Test bcrypt hash + compare
    const testHash = await bcrypt.hash("test123", 10);
    result.hashLen = testHash.length;
    result.compareOk = await bcrypt.compare("test123", testHash);
    result.compareFail = !(await bcrypt.compare("wrong", testHash));

    // 2. Test database lookup for admin
    const admin = await prisma.user.findUnique({
      where: { phone: "15313659956" },
      select: { id: true, name: true, phone: true, role: true, isActive: true, passwordHash: true },
    });
    result.adminFound = !!admin;
    if (admin) {
      result.adminName = admin.name;
      result.adminRole = admin.role;
      result.adminActive = admin.isActive;
      result.hashPrefix = admin.passwordHash.slice(0, 7);
      // 3. Test bcrypt.compare against real hash
      result.realCompareOk = await bcrypt.compare("sushenghuo107", admin.passwordHash);
    }
    result.ok = true;
  } catch (e: any) {
    result.ok = false;
    result.error = e?.message || String(e);
    result.stack = e?.stack?.slice(0, 500);
  }
  return NextResponse.json(result);
}
