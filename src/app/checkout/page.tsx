import { redirect } from "next/navigation";

/**
 * 结算页已与购物车合并，统一到 /cart 单页完成下单。
 * 此路由保留并重定向，兼容旧链接 / 浏览器书签。
 */
export default function CheckoutPage() {
  redirect("/cart");
}
