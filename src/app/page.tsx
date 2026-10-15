import Link from "next/link";
import {
  MapPin,
  Clock,
  Star,
  Sparkles,
  Leaf,
  Truck,
} from "lucide-react";
import { CartLink } from "@/components/CartLink";
import { UserMenu } from "@/components/UserMenu";

/**
 * 顾客端页面 - 首页
 */
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥟</span>
            <div>
              <div className="font-bold text-lg text-primary-700">
                素生活
              </div>
              <div className="text-xs text-stone-500 -mt-1">手工饺子</div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-5">
            <Link href="/products" className="hidden text-stone-600 hover:text-primary-600 sm:inline">
              全部口味
            </Link>
            <Link href="/products" className="text-stone-600 hover:text-primary-600 sm:hidden">
              选购
            </Link>
            <CartLink />
            <Link href="/orders" className="btn-secondary !py-1.5 !px-3 text-sm">
              我的订单
            </Link>
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 py-14 md:py-20">
        {/* 背景装饰 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ed7312 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-primary-200/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-0 w-80 h-80 rounded-full bg-accent-200/30 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-primary-200 text-primary-700 px-3.5 py-1.5 rounded-full text-sm font-medium mb-5 shadow-sm">
              <Sparkles className="w-4 h-4" />
              限时特惠 · 4盒组合 ¥100 起
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 leading-tight mb-4 tracking-tight">
              手工现包
              <br />
              <span className="text-primary-600">家的味道</span>
            </h1>
            <p className="text-stone-600 mb-8 leading-relaxed">
              素生活饺子馆，坚持每日手工现包，精选新鲜食材。
              <br />
              六种经典口味，两种特色风味，总有一款适合你。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary-glow text-lg !px-6 !py-3">
                立即选购 🥟
              </Link>
              <a href="#promo" className="btn-secondary-glass text-lg !px-6 !py-3">
                查看活动
              </a>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              <span className="feature-chip">
                <MapPin className="w-3.5 h-3.5 text-primary-500" /> 支持自取
              </span>
              <span className="feature-chip">
                <Clock className="w-3.5 h-3.5 text-primary-500" /> 预约时间
              </span>
              <span className="feature-chip">
                <Leaf className="w-3.5 h-3.5 text-green-600" /> 纯素配方
              </span>
              <span className="feature-chip">
                <Truck className="w-3.5 h-3.5 text-primary-500" /> 京东快递
              </span>
            </div>
          </div>

          {/* 右侧视觉卡 */}
          <div className="hidden md:block animate-fade-up">
            <div className="relative aspect-square rounded-[2rem] bg-gradient-to-br from-primary-100 via-white to-accent-100 border border-white shadow-xl overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #d9565a 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
                aria-hidden="true"
              />
              <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />
              <div className="absolute -bottom-16 -left-12 w-52 h-52 rounded-full bg-accent-200/40 blur-3xl" aria-hidden="true" />

              <span className="relative text-[9rem] leading-none drop-shadow-sm animate-float">
                🥟
              </span>

              <div className="absolute top-6 left-6 bg-white/85 backdrop-blur rounded-2xl px-3.5 py-2 shadow-md border border-stone-100">
                <div className="text-[10px] text-stone-400">当日新鲜</div>
                <div className="text-sm font-bold text-stone-700">每日现包</div>
              </div>
              <div className="absolute bottom-6 right-6 bg-white/85 backdrop-blur rounded-2xl px-3.5 py-2 shadow-md border border-stone-100 text-right">
                <div className="text-[10px] text-stone-400">口味丰富</div>
                <div className="text-sm font-bold text-stone-700">6 经典 · 2 特色</div>
              </div>
              <div className="absolute bottom-6 left-6 inline-flex items-center gap-1 bg-amber-400/95 text-stone-900 rounded-full px-3 py-1 text-xs font-semibold shadow-md">
                <Star className="w-3.5 h-3.5 fill-stone-900" /> 手工现包
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 活动说明 */}
      <section id="promo" className="py-14 md:py-16 max-w-6xl mx-auto px-4 w-full">
        <div className="text-center mb-9">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-800">
            🎁 优惠活动
          </h2>
          <p className="text-stone-500 text-sm mt-2">
            多买多省，系统结账时自动按最优方案计价
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* 特惠套餐A */}
          <div className="promo-card bg-gradient-to-br from-green-50 to-white">
            <span className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-green-400 to-emerald-200" aria-hidden="true" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">
                💰
              </div>
              <span className="badge-classic">最受欢迎</span>
            </div>
            <h3 className="font-bold text-lg mb-2">特惠套餐A · 4盒组合</h3>
            <p className="text-stone-600 text-sm mb-4">
              经典+特色任意搭配，4盒起享活动价
            </p>
            <div className="text-2xl font-bold text-primary-600">
              4盒 ¥100 起
              <span className="text-sm text-stone-500 ml-2 font-normal">
                特色每盒+¥10
              </span>
            </div>
          </div>

          {/* 特惠套餐B */}
          <div className="promo-card bg-gradient-to-br from-amber-50 to-white">
            <span className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-400 to-orange-200" aria-hidden="true" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">
                ✨
              </div>
              <span className="badge-specialty">特色精选</span>
            </div>
            <h3 className="font-bold text-lg mb-2">特惠套餐B · 3盒特色</h3>
            <p className="text-stone-600 text-sm mb-4">
              黑松露、菌菇 · 珍稀口味
            </p>
            <div className="text-2xl font-bold text-primary-600">3盒 ¥100</div>
          </div>

          {/* 特惠套餐C */}
          <div className="promo-card bg-gradient-to-br from-primary-50 to-white">
            <span className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary-400 to-orange-200" aria-hidden="true" />
            <div className="flex items-start justify-between mb-4">
              {/* 无合适图标，保留空位以保持三卡对齐 */}
              <div className="w-12 h-12" aria-hidden="true" />
              <span className="badge-stock">超值乐享</span>
            </div>
            <h3 className="font-bold text-lg mb-2">特惠套餐C · 6盒乐享</h3>
            <p className="text-stone-600 text-sm mb-4">
              任意搭配6盒，特色≤2盒不加价
            </p>
            <div className="text-2xl font-bold text-primary-600">
              6盒 ¥158 起
              <span className="text-sm text-stone-500 ml-2 font-normal">
                特色超2盒每盒+¥10
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-stone-500">
          <div className="mb-2">素生活饺子馆 · 用心做好每一个饺子</div>
          <div className="mt-2">© {new Date().getFullYear()} 素生活饺子馆</div>
        </div>
      </footer>
    </div>
  );
}
