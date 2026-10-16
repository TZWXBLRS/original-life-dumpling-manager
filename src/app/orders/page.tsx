import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  Package,
  PackageCheck,
  Clock,
  MapPin,
  Store,
  Truck,
  ChevronRight,
} from "lucide-react";
import { formatYuan } from "@/lib/pricing";
import { PhoneLoginPanel } from "@/components/PhoneLoginPanel";
import { UserMenu } from "@/components/UserMenu";

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "待支付", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "已支付", cls: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "备餐中", cls: "bg-indigo-100 text-indigo-800" },
  READY: { label: "待自取/配送", cls: "bg-teal-100 text-teal-800" },
  SHIPPED: { label: "配送中", cls: "bg-cyan-100 text-cyan-800" },
  COMPLETED: { label: "已完成", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", cls: "bg-stone-100 text-stone-500" },
};

const DELIVERY_ICON: Record<string, any> = {
  PICKUP: Store,
  DELIVERY: Truck,
  EXPRESS: MapPin,
};

export default async function OrdersPage() {
  const session = await auth();
  // demo 模式：未登录时不跳转，显示演示登录条
  // 真实接入微信小程序后会自动静默登录，此分支不会进入
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🥟</span>
              <span className="font-bold text-primary-700">素生活</span>
            </Link>
            <UserMenu />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Package /> 我的订单
          </h1>
          <div className="max-w-md">
            <div className="card p-4 mb-3">
              <PhoneLoginPanel />
            </div>
            <div className="card p-8 text-center text-stone-400">
              <PackageCheck className="w-12 h-12 mx-auto mb-3" />
              登录后可查看历史订单
            </div>
          </div>
        </main>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: { productName: true, quantity: true, unitPrice: true },
      },
    },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥟</span>
            <span className="font-bold text-primary-700">素生活</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <span className="hidden sm:inline">我的订单</span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package /> 我的订单
        </h1>

        {orders.length === 0 ? (
          <div className="card p-16 text-center text-stone-400">
            <PackageCheck className="w-16 h-16 mx-auto mb-4 text-stone-300" />
            <div className="mb-4">还没有任何订单</div>
            <Link href="/products" className="btn-primary inline-block">
              去选购饺子
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const st = STATUS_TEXT[order.status] || STATUS_TEXT.PENDING_PAYMENT;
              const DIco = DELIVERY_ICON[order.deliveryType] || Package;
              return (
                <Link
                  key={order.id}
                  href={"/orders/" + order.id}
                  className="card p-5 block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-stone-400">
                        {order.orderNo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <DIco className="w-3 h-3" />
                        {order.deliveryType === "PICKUP"
                          ? order.pickupSlot
                            ? `自取 · ${order.pickupSlot}`
                            : "自取"
                          : order.deliveryType === "DELIVERY"
                          ? "快递"
                          : "闪送"}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1 text-sm">
                      {order.items.slice(0, 3).map((it, i) => (
                        <div key={i} className="flex justify-between text-stone-600">
                          <span className="truncate">
                            {it.productName} × {it.quantity}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-xs text-stone-400">
                          ... 共 {order.items.length} 项，合计 {order.totalBoxes} 盒
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleString("zh-CN", {
                          timeZone: "Asia/Shanghai",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-xl font-bold text-primary-600">
                        ¥{formatYuan(order.totalAmount)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
