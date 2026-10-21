import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  Clock,
  CheckCircle2,
  Truck,
  Package,
  MapPin,
  Store,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { formatYuan } from "@/lib/pricing";
import OrderActionButtons from "@/components/OrderActionButtons";

const STATUS_STEPS = [
  { key: "PENDING_PAYMENT", label: "待支付", icon: Clock },
  { key: "PAID", label: "已支付" },
  { key: "PREPARING", label: "备餐中" },
  { key: "READY", label: "待取 / 待发货" },
  { key: "SHIPPED", label: "配送中" },
  { key: "COMPLETED", label: "已完成", icon: CheckCircle2 },
];

const STATUS_TEXT: Record<string, string> = {
  PENDING_PAYMENT: "等待支付",
  PAID: "已支付",
  PREPARING: "后厨备餐中",
  READY: "已备好，等待取货/发货",
  READY_FOR_PICKUP: "已备好，等待取货",
  SHIPPED: "配送中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function OrderDetailPage(props: {
  params: { id: string };
}) {
  const session = await auth();
  // 顾客端未登录时回到「我的订单」，那里提供一键登录入口
  if (!session?.user?.id) redirect("/orders");

  const order = await prisma.order.findUnique({
    where: { id: props.params.id },
    include: {
      items: {
        select: {
          productName: true,
          category: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
  });

  if (!order) notFound();

  // 顾客只能看自己的订单；管理员和后厨可以看所有
  if (
    order.userId !== session.user.id &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "KITCHEN"
  ) {
    redirect("/orders");
  }

  const isOwner = order.userId === session.user.id;
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  // 自取地址从系统配置取（兜底写死）
  const pickupCfg = await prisma.systemConfig
    .findUnique({ where: { key: "PICKUP_ADDRESS" } })
    .catch(() => null);
  const pickupAddress =
    pickupCfg?.value || "北京昌平路181号院卢卡新天地3号楼底商负107 禾也";

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href={
              session.user.role === "CUSTOMER" ? "/orders" : "/admin/orders"
            }
            className="text-stone-500 hover:text-primary-600 text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> 返回
          </Link>
          <h1 className="font-bold">订单详情</h1>
          <div className="flex-1" />
          <span className="text-xs font-mono text-stone-400">
            {order.orderNo}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 操作按钮区（放在最上面，方便操作） */}
        {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
          <OrderActionButtons
            orderId={order.id}
            status={order.status}
            deliveryType={order.deliveryType}
            userRole={session.user.role}
            isOwner={isOwner}
          />
        )}

        {/* 状态时间线 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-stone-500">订单状态</div>
              <div className="text-xl font-bold text-primary-700 mt-1">
                {STATUS_TEXT[order.status] || order.status}
              </div>
            </div>
            {order.status === "CANCELLED" ? (
              <span className="px-3 py-1 rounded-full text-sm bg-stone-100 text-stone-500">
                订单已取消
                {order.cancelReason ? `：${order.cancelReason}` : ""}
              </span>
            ) : (
              <span className="text-right text-sm text-primary-600 font-medium">
                共 {order.totalBoxes} 盒
              </span>
            )}
          </div>

          {order.status !== "CANCELLED" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIdx;
                const cur = i === currentIdx;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center ${
                      i < STATUS_STEPS.length - 1 ? "flex-1" : ""
                    } shrink-0`}
                  >
                    <div
                      className={`flex items-center gap-1.5 whitespace-nowrap ${
                        done ? "text-primary-700 font-medium" : "text-stone-400"
                      } ${cur ? "bg-primary-50 px-2 py-1 rounded-md ring-1 ring-primary-200" : ""}`}
                    >
                      {done && step.icon ? (
                        <step.icon className="w-3.5 h-3.5" />
                      ) : (
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                            done
                              ? "bg-primary-500 text-white"
                              : "bg-stone-200 text-stone-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm">{step.label}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 min-w-6 ${
                          i < currentIdx ? "bg-primary-400" : "bg-stone-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 状态时间戳 */}
          <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-stone-500">
            {order.paidAt && (
              <div>
                支付：{order.paidAt.toLocaleString("zh-CN")}
              </div>
            )}
            {order.preparingAt && (
              <div>
                开始备餐：{order.preparingAt.toLocaleString("zh-CN")}
              </div>
            )}
            {order.readyAt && (
              <div>
                备好：{order.readyAt.toLocaleString("zh-CN")}
              </div>
            )}
            {order.shippedAt && (
              <div>
                发货：{order.shippedAt.toLocaleString("zh-CN")}
              </div>
            )}
            {order.completedAt && (
              <div>
                完成：{order.completedAt.toLocaleString("zh-CN")}
              </div>
            )}
            {order.cancelledAt && (
              <div>
                取消：{order.cancelledAt.toLocaleString("zh-CN")}
              </div>
            )}
          </div>
        </div>

        {/* 配送信息 */}
        <div className="card p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            {order.deliveryType === "PICKUP" ? (
              <Store className="w-5 h-5" />
            ) : (
              <Truck className="w-5 h-5" />
            )}
            {order.deliveryType === "PICKUP" ? "自取信息" : "配送信息"}
          </h3>
          {order.deliveryType === "PICKUP" ? (
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-stone-500 w-20 inline-block">自取地址：</span>
                {pickupAddress}
              </div>
              <div>
                <span className="text-stone-500 w-20 inline-block">自取时段：</span>
                {order.pickupSlot || "—"}
              </div>
              {order.pickupCode && (
                <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg text-center">
                  <div className="text-xs text-primary-600 mb-1">取货码</div>
                  <div className="text-3xl font-bold text-primary-700 tracking-widest font-mono">
                    {order.pickupCode}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">到店出示此码取货</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">
                    {order.receiverName} {order.receiverPhone}
                  </span>
                  <div className="text-stone-600 mt-0.5">
                    {order.receiverProvince} {order.receiverCity} {order.receiverDistrict}
                    {order.receiverAddress}
                  </div>
                </div>
              </div>
              {order.deliveryType === "DELIVERY" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1 text-blue-700 font-medium">
                    <Package className="w-3.5 h-3.5" /> 快递发货说明
                  </div>
                  <div className="text-blue-600">
                    发货窗口：每天 18:00-20:00（快递发货需满8小时冷冻）
                  </div>
                  {order.deliveryETA && (
                    <div className="text-blue-600">
                      预计送达：{order.deliveryETA.toLocaleDateString("zh-CN")}
                    </div>
                  )}
                  {order.customerAckRisk && (
                    <div className="text-amber-700 flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      顾客已确认运输超时风险，变质损失自理
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 商品明细 */}
        <div className="card p-5">
          <h3 className="font-bold mb-3">商品明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-stone-500 text-xs">
                  <th className="text-left py-2 pr-3">商品</th>
                  <th className="text-left py-2 pr-3">类别</th>
                  <th className="text-right py-2 pr-3">单价</th>
                  <th className="text-right py-2 pr-3">数量</th>
                  <th className="text-right py-2">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order.items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium">{it.productName}</td>
                    <td className="py-2 pr-3 text-stone-500">
                      {it.category === "CLASSIC" ? "经典" : "特色"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      ¥{formatYuan(it.unitPrice)}
                    </td>
                    <td className="py-2 pr-3 text-right">× {it.quantity}</td>
                    <td className="py-2 text-right font-medium">
                      ¥{formatYuan(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 费用 + 备注 */}
        <div className="card p-5">
          <h3 className="font-bold mb-3">费用合计</h3>
          <div className="text-sm space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-stone-600">
              <span>商品合计（{order.totalBoxes}盒）</span>
              <span>
                ¥{formatYuan(order.totalAmount - order.foamBoxAmount)}
              </span>
            </div>
            {order.foamBoxCount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>泡沫箱 × {order.foamBoxCount}</span>
                <span>¥{formatYuan(order.foamBoxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-stone-200 text-lg font-bold text-primary-600">
              <span>总计</span>
              <span>¥{formatYuan(order.totalAmount)}</span>
            </div>
          </div>
          {order.note && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <div className="text-xs text-stone-500 mb-1">顾客备注</div>
              <div className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg">
                {order.note}
              </div>
            </div>
          )}
          <div className="mt-4 text-xs text-stone-400 text-right">
            下单时间：
            {order.createdAt.toLocaleString("zh-CN")}
          </div>
        </div>
      </main>
    </div>
  );
}
