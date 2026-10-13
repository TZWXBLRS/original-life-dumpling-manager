import Link from "next/link";
import { ShoppingCart, MapPin, Clock, Star } from "lucide-react";

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
                原味生活
              </div>
              <div className="text-xs text-stone-500 -mt-1">手工饺子</div>
            </div>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/products" className="text-stone-600 hover:text-primary-600">
              全部口味
            </Link>
            <Link href="/cart" className="relative text-stone-600 hover:text-primary-600">
              <ShoppingCart className="w-5 h-5 inline" />
              <span className="ml-1">购物车</span>
            </Link>
            <Link href="/orders" className="btn-secondary !py-1.5 !px-3 text-sm">
              我的订单
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-accent-50 py-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm mb-4">
              🎉 限时特惠 · 4盒组合¥100起
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 leading-tight mb-4">
              手工现包
              <br />
              <span className="text-primary-600">家的味道</span>
            </h1>
            <p className="text-stone-600 mb-8 leading-relaxed">
              原味生活饺子馆，坚持每日手工现包，精选新鲜食材。
              <br />
              六种经典口味，两种特色风味，总有一款适合你。
            </p>
            <div className="flex gap-3">
              <Link href="/products" className="btn-primary text-lg !px-6 !py-3">
                立即选购 🥟
              </Link>
              <a href="#promo" className="btn-secondary text-lg !px-6 !py-3">
                查看活动
              </a>
            </div>
            <div className="flex gap-6 mt-10 text-sm text-stone-500">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> 支持自取
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> 预约时间
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" /> 京东快递
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-square bg-white rounded-3xl shadow-xl border border-stone-200 flex items-center justify-center text-9xl">
              🥟
            </div>
          </div>
        </div>
      </section>

      {/* 活动说明 */}
      <section id="promo" className="py-16 max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 text-center">🎁 优惠活动</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6 bg-gradient-to-br from-green-50 to-white">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="font-bold text-lg mb-2">规则A·4盒组合</h3>
            <p className="text-stone-600 text-sm mb-3">
              经典+特色任意搭配，4盒起享活动价
            </p>
            <div className="text-2xl font-bold text-primary-600">
              4盒 ¥100 起
              <span className="text-sm text-stone-500 ml-2">特色每盒+¥10</span>
            </div>
          </div>
          <div className="card p-6 bg-gradient-to-br from-amber-50 to-white">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-bold text-lg mb-2">规则B·3盒特色</h3>
            <p className="text-stone-600 text-sm mb-3">黑松露、菌菇 · 珍稀口味</p>
            <div className="text-2xl font-bold text-primary-600">
              3盒 ¥100
              <span className="text-sm text-stone-400 line-through ml-2">¥114</span>
            </div>
          </div>
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-white">
            <div className="text-4xl mb-3">🎲</div>
            <h3 className="font-bold text-lg mb-2">规则C·6盒乐享</h3>
            <p className="text-stone-600 text-sm mb-3">
              任意搭配6盒，特色≤2盒不加价
            </p>
            <div className="text-2xl font-bold text-primary-600">
              6盒 ¥158 起
              <span className="text-sm text-stone-500 ml-2">特色超2盒每盒+¥10</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-stone-500">
          <div className="mb-2">原味生活饺子馆 · 用心做好每一个饺子</div>
          <div>© {new Date().getFullYear()} Original Life Dumpling Manager</div>
        </div>
      </footer>
    </div>
  );
}
