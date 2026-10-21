import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * 全站统一页脚：品牌信息、门店地址、快捷入口与更名说明。
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rice-300 bg-rice-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <BrandLogo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-stone-600">
            禾也，取“禾”与“和”之音。
            <br />
            好好吃饭，是与自己讲和。
          </p>
        </div>

        <div className="text-sm text-stone-600">
          <div className="text-[10px] tracking-[0.3em] text-wheat-600">
            到店自取
          </div>
          <p className="mt-3 flex items-start gap-2 leading-relaxed">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            北京昌平路181号院卢卡新天地
            <br />
            3号楼底商负107 禾也
          </p>
          <p className="mt-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-600" />
            每日 9:30 – 20:30
          </p>
        </div>

        <div className="text-sm text-stone-600">
          <div className="text-[10px] tracking-[0.3em] text-wheat-600">
            逛一逛
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/products" className="hover:text-primary-700">
              全部口味
            </Link>
            <Link href="/cart" className="hover:text-primary-700">
              购物车
            </Link>
            <Link href="/orders" className="hover:text-primary-700">
              我的订单
            </Link>
            <a href="/#story" className="hover:text-primary-700">
              品牌故事
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-rice-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <span>原素生活，现名禾也 · 过渡期请老客认准新门头</span>
          <span>© {new Date().getFullYear()} 禾也 HEYE · 素饺 · 茶 · 咖啡</span>
        </div>
      </div>
    </footer>
  );
}
