import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/shared/CartProvider";

export const metadata: Metadata = {
  title: "原味生活饺子馆 - 手工冷冻饺子订购",
  description:
    "原味生活饺子馆，手工现包冷冻饺子。经典口味荠菜、酸菜、三鲜、茴香、芹菜、玉米；特色黑松露、菌菇。支持自取、快递、闪送。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
