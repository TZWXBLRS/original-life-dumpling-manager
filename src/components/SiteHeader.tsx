import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CartLink } from "@/components/CartLink";
import { UserMenu } from "@/components/UserMenu";

/**
 * 全站统一头部：更名过渡条 + 禾也导航。
 * 首页与商品页共用，保证品牌视觉一致。
 */
export function SiteHeader() {
  return (
    <>
      <div className="bg-primary-800 px-3 py-1.5 text-center text-[11px] tracking-[0.18em] text-rice-100">
        原素生活，现名禾也 · 门头已换，味道未变
      </div>

      <header className="sticky top-0 z-40 border-b border-rice-300/70 bg-rice-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="禾也首页">
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-5">
            <Link
              href="/products"
              className="hidden px-2 py-2 text-stone-600 hover:text-primary-700 sm:inline"
            >
              全部口味
            </Link>
            <Link
              href="/#story"
              className="hidden px-2 py-2 text-stone-600 hover:text-primary-700 md:inline"
            >
              品牌故事
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-stone-600 hover:text-primary-700 sm:hidden"
            >
              选购
            </Link>
            <CartLink className="min-h-11 min-w-11 justify-center sm:min-h-0 sm:min-w-0" />
            <Link
              href="/orders"
              className="hidden rounded-full border border-rice-300 px-4 py-1.5 text-sm text-stone-700 hover:bg-rice-100 sm:inline-flex"
            >
              我的订单
            </Link>
            <UserMenu />
          </nav>
        </div>
      </header>
    </>
  );
}
