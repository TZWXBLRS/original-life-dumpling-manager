import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { isValidPhone } from "@/lib/utils";

/**
 * GET /api/admin/users
 * 管理员：查询员工账号（ADMIN/KITCHEN）
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "KITCHEN"] },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ users });
}

/**
 * POST /api/admin/users
 * 管理员：创建新员工账号（ADMIN/KITCHEN）
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(1, "姓名不能为空").max(50),
      phone: z.string().refine((v) => isValidPhone(v), "请输入正确的手机号"),
      role: z.enum(["ADMIN", "KITCHEN"]),
      password: z.string().min(6, "密码至少6位").max(50),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { name, phone, role, password } = parsed.data;

    // 检查手机号是否已存在
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) {
      return NextResponse.json({ error: "该手机号已被注册" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        role,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "创建失败" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * 管理员：修改用户状态（启用/禁用）、重置密码、改角色
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const schema = z.object({
      id: z.string().min(1),
      action: z.enum(["TOGGLE_ACTIVE", "RESET_PASSWORD", "UPDATE_ROLE"]),
      isActive: z.boolean().optional(),
      password: z.string().min(6).max(50).optional(),
      role: z.enum(["ADMIN", "KITCHEN"]).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { id, action, isActive, password, role } = parsed.data;

    // 不能禁用自己
    if (id === session.user.id && action === "TOGGLE_ACTIVE" && isActive === false) {
      return NextResponse.json({ error: "不能禁用当前登录的管理员账号" }, { status: 400 });
    }

    const update: any = {};
    if (action === "TOGGLE_ACTIVE" && isActive !== undefined) {
      update.isActive = isActive;
    } else if (action === "RESET_PASSWORD" && password) {
      update.passwordHash = await bcrypt.hash(password, 10);
    } else if (action === "UPDATE_ROLE" && role) {
      // 降权自己不允许
      if (id === session.user.id && role !== "ADMIN") {
        return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
      }
      update.role = role;
    } else {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: update,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "操作失败" },
      { status: 500 }
    );
  }
}
