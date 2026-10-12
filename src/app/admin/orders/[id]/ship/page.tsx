import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ShipConfirmClient from "./ShipConfirmClient";

/**
 * 后台 - 快递发货确认页面（服务端组件）
 *
 * 读取真实订单及其商品的冷冻记录，传给客户端组件做实时检查与发货。
 * PRD 4.4：发货需校验冷冻满 8 小时、发货时间窗口 18:00-20:00、无记录不可发。
 */
export default async function ShipConfirmPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderNo: true,
      status: true,
      deliveryType: true,
      frozenConfirmRequired: true,
      receiverName: true,
      receiverPhone: true,
      receiverProvince: true,
      receiverCity: true,
      receiverDistrict: true,
      receiverAddress: true,
      items: {
        select: {
          productId: true,
          productName: true,
          quantity: true,
          product: { select: { lastFrozenAt: true } },
        },
      },
    },
  });

  if (!order) notFound();
  // 仅快递订单可走发货流程
  if (order.deliveryType !== "DELIVERY") redirect("/admin/orders");

  // 组装各商品的冷冻信息（Date 序列化为 ISO 字符串后传给客户端）
  const frozenInfos = order.items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    lastFrozenAt: it.product.lastFrozenAt
      ? it.product.lastFrozenAt.toISOString()
      : null,
  }));

  return (
    <ShipConfirmClient
      orderId={order.id}
      orderNo={order.orderNo}
      status={order.status}
      frozenConfirmRequired={order.frozenConfirmRequired}
      receiver={{
        name: order.receiverName,
        phone: order.receiverPhone,
        province: order.receiverProvince,
        city: order.receiverCity,
        district: order.receiverDistrict,
        address: order.receiverAddress,
      }}
      frozenInfos={frozenInfos}
    />
  );
}
