import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

/**
 * GET /api/admin/users?group=staff|customer
 * 管理员：查询用户账号
 *   - group=staff（默认）：门店账号（ADMIN/KITCHEN）
 *   - group=customer：顾客账号（CUSTOMER）
 *   - group=all：全部
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const group = req.nextUrl.searchParams.get("group") || "staff";
  const roleFilter =
    group === "customer"
      ? { in: ["CUSTOMER"] }
      : group === "all"
      ? { in: ["ADMIN", "KITCHEN", "CUSTOMER"] }
      : { in: ["ADMIN", "KITCHEN"] };

  const users = await prisma.user.findMany({
    where: {
      role: roleFilter as any,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ users, group });
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
      phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
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
      action: z.enum([
        "TOGGLE_ACTIVE",
        "RESET_PASSWORD",
        "UPDATE_ROLE",
        "UPDATE_PHONE",
        "UPDATE_NAME",
      ]),
      isActive: z.boolean().optional(),
      password: z.string().min(6).max(50).optional(),
      role: z.enum(["ADMIN", "KITCHEN"]).optional(),
      phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号").optional(),
      name: z.string().min(1, "姓名不能为空").max(50).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { id, action, isActive, password, role, phone, name } = parsed.data;

    // 不能禁用自己
    if (id === session.user.id && action === "TOGGLE_ACTIVE" && isActive === false) {
      return NextResponse.json({ error: "不能禁用当前登录的管理员账号" }, { status: 400 });
    }

    const update: any = {};
    if (action === "TOGGLE_ACTIVE" && isActive !== undefined) {
      update.isActive = isActive;
    } else if (action === "RESET_PASSWORD" && password) {
      update.passwordHash = await bcrypt.hash(password, 10);
    } else if (action === "UPDATE_PHONE" && phone) {
      // 手机号唯一：改号前先确认没有别的账号占用
      const dup = await prisma.user.findUnique({ where: { phone } });
      if (dup && dup.id !== id) {
        return NextResponse.json(
          { error: "该手机号已被其他账号使用" },
          { status: 400 }
        );
      }
      update.phone = phone;
    } else if (action === "UPDATE_ROLE" && role) {
      // 降权自己不允许
      if (id === session.user.id && role !== "ADMIN") {
        return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
      }
      update.role = role;
    } else if (action === "UPDATE_NAME" && name) {
      update.name = name;
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

/**
 * DELETE /api/admin/users
 * 管理员：删除顾客账号
 *   - 仅允许删除 CUSTOMER（门店账号不可删）
 *   - 有订单的顾客不可删（避免订单与账号失联）
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const schema = z.object({ id: z.string().min(1) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { id } = parsed.data;

    if (id === session.user.id) {
      return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, _count: { select: { orders: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "仅支持删除顾客账号" }, { status: 400 });
    }
    if (user._count.orders > 0) {
      return NextResponse.json(
        { error: "该顾客已有订单，不能删除" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "删除失败" },
      { status: 500 }
    );
  }
}
