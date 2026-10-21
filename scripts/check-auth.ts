import { prisma } from "../src/lib/prisma";
import * as bcrypt from "bcryptjs";

async function main() {
  const phone = "15313659956";
  const password = "sushenghuo107";
  console.log("DATABASE_URL =", process.env.DATABASE_URL);

  const all = await prisma.user.findMany({
    select: { id: true, name: true, phone: true, role: true, isActive: true },
  });
  console.log("ALL USERS:", JSON.stringify(all, null, 2));

  const user = await prisma.user.findUnique({ where: { phone } });
  console.log("FOUND:", user ? { id: user.id, name: user.name, role: user.role, isActive: user.isActive } : null);
  if (user) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("bcrypt.compare =>", ok);
    console.log("hash prefix:", user.passwordHash.slice(0, 12));
  }
}

main()
  .catch((e) => {
    console.error("ERR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
