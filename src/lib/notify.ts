/**
 * 企业微信群机器人通知（订单创建时推送到客服群）
 *
 * 配置：设置环境变量 `WECOM_BOT_WEBHOOK` 为企业微信群机器人的 webhook 地址
 *      （形如 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx）。
 * 未配置则跳过通知，不影响下单流程。
 *
 * 说明：
 *  - 使用企业微信机器人「markdown」消息类型。
 *  - 下单接口中以 fire-and-forget 方式调用（不 await），避免阻塞下单响应；
 *    发送失败仅记日志，不回滚订单。
 *  - 机器人限流：单机器人 20 条/分钟，饺子店单量足够。
 */

const WECOM_BOT_WEBHOOK = process.env.WECOM_BOT_WEBHOOK;

/** 是否已配置企业微信机器人（据此决定是否发送通知） */
export function isWecomBotConfigured(): boolean {
  return Boolean(WECOM_BOT_WEBHOOK);
}

export interface OrderNotifyPayload {
  orderNo: string;
  deliveryType: string;
  deliveryDate: string;
  pickupSlot?: string | null;
  totalBoxes: number;
  totalAmount: number; // 单位：分
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  note?: string | null;
  items: Array<{ name: string; quantity: number }>;
}

function deliveryTypeLabel(t: string): string {
  switch (t) {
    case "PICKUP":
      return "自取";
    case "DELIVERY":
      return "快递";
    case "EXPRESS":
      return "闪送";
    default:
      return t;
  }
}

function formatYuan(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

/** 构造 markdown 消息内容 */
function buildMarkdown(o: OrderNotifyPayload): string {
  const lines: string[] = [];
  lines.push("## 🥟 新订单通知");
  lines.push(`> 订单号：<font color="comment">${o.orderNo}</font>`);
  lines.push(`> 配送方式：**${deliveryTypeLabel(o.deliveryType)}**`);
  lines.push(`> 日期：${o.deliveryDate}`);
  if (o.pickupSlot) lines.push(`> 自取时段：${o.pickupSlot}`);
  lines.push(`> 盒数：${o.totalBoxes} 盒`);
  lines.push(`> 金额：<font color="info">${formatYuan(o.totalAmount)}</font>`);

  if (o.deliveryType !== "PICKUP") {
    lines.push(`> 收件人：${o.receiverName || "-"} ${o.receiverPhone || ""}`);
    if (o.receiverAddress) lines.push(`> 地址：${o.receiverAddress}`);
  }

  lines.push("");
  lines.push("**商品明细：**");
  for (const it of o.items) {
    lines.push(`- ${it.name} × ${it.quantity}`);
  }

  if (o.note) {
    lines.push("");
    lines.push(`**备注：** ${o.note}`);
  }

  return lines.join("\n");
}

/**
 * 发送企业微信群机器人通知（fire-and-forget）。
 * 未配置 webhook 时直接返回；发送失败仅打印日志，不抛出。
 */
export function notifyNewOrder(payload: OrderNotifyPayload): void {
  if (!WECOM_BOT_WEBHOOK) return;
  const content = buildMarkdown(payload);
  fetch(WECOM_BOT_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: { content },
    }),
  }).catch((e: any) => {
    console.error("[notify] 企业微信通知发送失败:", e?.message || e);
  });
}
