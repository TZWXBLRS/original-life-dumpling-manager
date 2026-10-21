import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: "禾也 HEYE - 手作素饺",
  description:
    "禾也，取“禾”与“和”之音。手作素饺，八味可选：荠菜、酸菜、三鲜、茴香、芹菜、玉米、黑松露、菌菇。支持自取、快递、闪送。",
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
