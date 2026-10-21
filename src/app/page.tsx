import Link from "next/link";
import {
  MapPin,
  Clock,
  Leaf,
  Truck,
  ArrowRight,
  Sprout,
  Globe2,
  Clock3,
  Star,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SealStamp, WheatDivider } from "@/components/BrandLogo";

const classicFlavors = [
  { name: "荠菜", note: "新鲜荠菜，清香可口" },
  { name: "酸菜", note: "东北酸菜风味，酸爽开胃" },
  { name: "三鲜", note: "三种时蔬鲜香搭配" },
  { name: "茴香", note: "北方特色茴香，回味悠长" },
  { name: "芹菜", note: "新鲜芹菜，清爽不腻" },
  { name: "玉米", note: "甜玉米粒，老少皆宜" },
];

const specialtyFlavors = [
  { name: "黑松露", note: "珍稀黑松露，高端风味（每盒12只）" },
  { name: "菌菇", note: "多种野生菌菇混合，鲜美无比" },
];

const beliefs = [
  {
    icon: Sprout,
    title: "身体之和",
    text: "吃素，是身体和肠胃的“和”。",
  },
  {
    icon: Clock3,
    title: "生活之和",
    text: "慢食，是人和生活的“和”。",
  },
  {
    icon: Globe2,
    title: "地球之和",
    text: "素食环保，是人和地球的“和”。",
  },
];

/**
 * 顾客端页面 - 首页
 */
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-rice-50">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden paper-grain">
        <div
          className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-wheat-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div className="animate-fade-up">
            <div className="flex items-center gap-3 text-[11px] tracking-[0.4em] text-primary-600">
              <span>HEYE</span>
              <span className="h-px w-8 bg-wheat-400/70" aria-hidden="true" />
              <span>禾 · 和 · 何也</span>
            </div>

            <h1 className="mt-5 font-serif-cn text-[3.4rem] leading-[1.08] text-primary-900 sm:text-[4rem] md:text-[4.6rem]">
              禾也<span className="text-wheat-500">？</span>
              <br />
              和也<span className="text-accent-500">。</span>
            </h1>

            <p className="mt-7 max-w-md text-[15px] leading-[2] text-stone-600">
              素饺为体，清茶为伴，咖啡为醒。
              <br />
              好好吃饭，是与自己讲和；
              <br />
              选择素食，是与地球讲和。
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="btn-primary-glow text-base !px-6 !py-3"
              >
                选一盒素饺
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#story"
                className="btn-secondary-glass text-base !px-6 !py-3"
              >
                听品牌故事
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-2.5">
              <span className="feature-chip">
                <MapPin className="h-3.5 w-3.5 text-primary-600" /> 支持自取
              </span>
              <span className="feature-chip">
                <Clock className="h-3.5 w-3.5 text-primary-600" /> 预约时段
              </span>
              <span className="feature-chip">
                <Leaf className="h-3.5 w-3.5 text-primary-600" /> 纯素配方
              </span>
              <span className="feature-chip">
                <Truck className="h-3.5 w-3.5 text-primary-600" /> 京东快递
              </span>
            </div>
          </div>

          {/* 主视觉：禾苗拱门 */}
          <div className="relative animate-fade-up delay-1">
            <div className="relative overflow-hidden rounded-t-[9rem] rounded-b-3xl border border-rice-300 bg-rice-100 shadow-soft">
              <img
                src="/images/heye-hero.jpg"
                alt="竹笼里刚蒸好的手工素饺，旁边是新鲜荠菜与麦穗"
                className="h-[24rem] w-full object-cover sm:h-[30rem] md:h-[34rem]"
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary-900/80 via-primary-900/25 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between">
                <div className="text-rice-50">
                  <div className="inline-block rounded-full bg-primary-900/60 px-2.5 py-1 text-[11px] tracking-[0.22em] text-rice-100 backdrop-blur-sm">
                    今日现包
                  </div>
                  <div className="mt-1 font-serif-cn text-xl [text-shadow:0_1px_8px_rgba(24,36,28,0.55)]">
                    一箸之和
                  </div>
                </div>
                <SealStamp />
              </div>
            </div>

            <div className="absolute left-2 top-10 -rotate-3 border border-rice-300 bg-rice-50 px-3.5 py-2 shadow-paper sm:-left-3">
              <div className="text-[9px] tracking-[0.24em] text-wheat-600">
                原素生活
              </div>
              <div className="mt-0.5 text-xs text-stone-700">现名禾也</div>
            </div>

            <div className="absolute right-2 bottom-24 rotate-2 border border-primary-200 bg-primary-50/95 px-3 py-1.5 text-[10px] tracking-[0.16em] text-primary-700 shadow-paper backdrop-blur sm:-right-2">
              今日 · 和浓度 100%
            </div>
          </div>
        </div>
      </section>

      {/* Slogan 横条 */}
      <div className="border-y border-primary-700/40 bg-primary-800 text-rice-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] tracking-[0.28em]">
          <span>素饺为体</span>
          <span className="text-wheat-300">·</span>
          <span>清茶为伴</span>
          <span className="text-wheat-300">·</span>
          <span>咖啡为醒</span>
          <span className="text-wheat-300">·</span>
          <span>禾也，就是和也</span>
        </div>
      </div>

      {/* 品牌故事 */}
      <section id="story" className="relative paper-grain py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="animate-fade-up">
            <div className="text-[11px] tracking-[0.4em] text-primary-600">
              OUR STORY · 品牌故事
            </div>
            <h2 className="mt-4 font-serif-cn text-4xl leading-tight text-primary-900 md:text-5xl">
              口中有禾，
              <br />
              即为和。
            </h2>
            <WheatDivider className="my-7 max-w-[16rem]" />
            <div className="font-serif-cn text-[17px] leading-[2.1] text-stone-600">
              <p>
                禾也，取“禾”与“和”之音。
                <br />
                素饺为体，清茶为伴，咖啡为醒。
                <br />
                我们相信，好好吃饭是与自己讲和，
                <br />
                选择素食，是与地球讲和。
              </p>
            </div>
            <p className="mt-6 font-serif-cn text-2xl text-primary-800">
              禾也，就是和也。
            </p>
            <div className="mt-7 flex items-center gap-4">
              <SealStamp />
              <div className="text-xs leading-relaxed text-stone-500">
                <div className="text-stone-700">禾也 HEYE</div>
                <div className="tracking-[0.22em]">素饺 · 茶 · 咖啡</div>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-up delay-2">
            <img
              src="/images/heye-story.jpg"
              alt="在撒了面粉的木板上手工包素饺，旁边是切好的青菜与麦穗"
              className="h-[22rem] w-full rounded-[2rem] border border-rice-300 object-cover shadow-soft sm:h-[27rem]"
            />
            <div className="absolute -bottom-6 left-4 max-w-[16rem] border border-rice-300 bg-rice-50 p-5 shadow-paper sm:left-8">
              <div className="text-[10px] tracking-[0.3em] text-wheat-600">
                禾也 → 何也？
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                名字里自带一个问句，
                等你在门头前问一句“为什么叫禾也”。
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-20 grid gap-4 md:grid-cols-3">
          {beliefs.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-rice-300/80 bg-rice-50/80 p-6 transition-colors hover:border-primary-200"
            >
              <b.icon className="h-5 w-5 text-primary-600" />
              <h3 className="mt-4 font-serif-cn text-lg text-primary-900">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {b.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 产品介绍 */}
      <section id="menu" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-[11px] tracking-[0.4em] text-primary-600">
              OUR DUMPLINGS · 产品介绍
            </div>
            <h2 className="mt-4 font-serif-cn text-4xl text-primary-900 md:text-5xl">
              八味素饺，一箸之和
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-stone-500">
              循禾苗之本，守一箸之和。不逐快食，只煮当下。
              每日手工现包，经典六味、特色两味。
            </p>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="relative lg:sticky lg:top-28">
              <img
                src="/images/heye-products.jpg"
                alt="八种素饺整齐摆放在豆绿色陶盘上，配以玉米、菌菇与黑松露"
                className="w-full rounded-[2rem] border border-rice-300 object-cover shadow-soft"
              />
              <div className="absolute -bottom-5 right-4 border border-rice-300 bg-rice-50 px-4 py-2.5 shadow-paper">
                <div className="text-[10px] tracking-[0.2em] text-wheat-600">
                  每盒 20 只
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  黑松露每盒 12 只
                </div>
              </div>

              <div className="mt-10 hidden border-l-2 border-wheat-400/70 pl-5 lg:block">
                <div className="text-[10px] tracking-[0.3em] text-wheat-600">
                  本味 · 每日手作
                </div>
                <p className="mt-2 max-w-sm font-serif-cn text-[15px] leading-[1.9] text-stone-600">
                  面皮现擀，馅料现调。
                  不追快，只把当天的菜与豆香，
                  包进一只只素饺里。
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between border-b border-rice-300 pb-2.5">
                <h3 className="font-serif-cn text-xl text-primary-800">
                  经典六味
                </h3>
                <span className="text-xs text-stone-500">
                  ¥33 / 盒 · 4 盒 ¥100
                </span>
              </div>
              <ul className="divide-y divide-rice-200">
                {classicFlavors.map((f, i) => (
                  <li key={f.name} className="flex items-baseline gap-4 py-3">
                    <span className="w-5 text-[10px] tabular-nums text-wheat-600">
                      0{i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-serif-cn text-[17px] text-stone-800">
                        {f.name}
                      </div>
                      <div className="mt-0.5 text-xs text-stone-500">
                        {f.note}
                      </div>
                    </div>
                    <span className="text-sm text-primary-700">¥33</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-baseline justify-between border-b border-rice-300 pb-2.5">
                <h3 className="font-serif-cn text-xl text-primary-800">
                  特色两味
                </h3>
                <span className="text-xs text-stone-500">
                  ¥38 / 盒 · 3 盒 ¥100
                </span>
              </div>
              <ul className="divide-y divide-rice-200">
                {specialtyFlavors.map((f, i) => (
                  <li key={f.name} className="flex items-baseline gap-4 py-3">
                    <span className="w-5 text-[10px] tabular-nums text-wheat-600">
                      0{i + 7}
                    </span>
                    <div className="flex-1">
                      <div className="font-serif-cn text-[17px] text-stone-800">
                        {f.name}
                      </div>
                      <div className="mt-0.5 text-xs text-stone-500">
                        {f.note}
                      </div>
                    </div>
                    <span className="text-sm text-primary-700">¥38</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/products" className="btn-primary !px-5 !py-2.5">
                  看今日库存与选购
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <span className="text-xs text-stone-500">
                  4 盒起自动按最优组合计价
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 三次停顿 */}
      <section className="bg-primary-800 py-16 text-rice-100 md:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-[10px] tracking-[0.4em] text-wheat-300">
            THREE PAUSES
          </div>
          <p className="mt-6 font-serif-cn text-2xl leading-[1.8] md:text-3xl">
            饺子暖胃，茶管慢，咖啡管清醒——
            <br />
            禾也，是好好生活的三次停顿。
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-wheat-400/60" aria-hidden="true" />
            <SealStamp />
            <span className="h-px w-8 bg-wheat-400/60" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* 优惠活动 */}
      <section id="promo" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-[11px] tracking-[0.4em] text-primary-600">
              COMBINATIONS · 组合优惠
            </div>
            <h2 className="mt-4 font-serif-cn text-3xl text-primary-900 md:text-4xl">
              多买多省，系统自动算好
            </h2>
            <p className="mt-3 text-sm text-stone-500">
              结账时自动按对顾客最划算的方案计价
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="relative rounded-2xl border border-primary-200 bg-primary-50/70 p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Leaf className="h-5 w-5" />
                </div>
                <span className="badge-classic">最受欢迎</span>
              </div>
              <h3 className="mt-5 font-serif-cn text-lg text-primary-900">
                四盒经典
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                经典口味任意搭配，4 盒起享活动价
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-serif-cn text-3xl text-primary-800">
                  ¥100
                </span>
                <span className="text-xs text-stone-500">4 盒起</span>
              </div>
            </div>

            <div className="relative rounded-2xl border border-wheat-200 bg-wheat-50/70 p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-wheat-100 text-wheat-700">
                  <Star className="h-5 w-5" />
                </div>
                <span className="badge-specialty">特色精选</span>
              </div>
              <h3 className="mt-5 font-serif-cn text-lg text-primary-900">
                三盒特色
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                黑松露、菌菇，珍稀口味的组合
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-serif-cn text-3xl text-primary-800">
                  ¥100
                </span>
                <span className="text-xs text-stone-500">3 盒</span>
              </div>
            </div>

            <div className="relative rounded-2xl border border-rice-300 bg-rice-100/70 p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rice-200 text-stone-700">
                  <Sprout className="h-5 w-5" />
                </div>
                <span className="badge-stock">混拼乐享</span>
              </div>
              <h3 className="mt-5 font-serif-cn text-lg text-primary-900">
                六盒混拼
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                任意搭配，经典与特色各取所需
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-serif-cn text-3xl text-primary-800">
                  ¥158
                </span>
                <span className="text-xs text-stone-500">6 盒起</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 和浓度贴纸 */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="paper-grain flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-primary-200 bg-primary-50 px-7 py-8 sm:flex-row sm:items-center">
            <div>
              <div className="text-[10px] tracking-[0.32em] text-primary-600">
                今日店内 · 和浓度 100%
              </div>
              <h3 className="mt-2 font-serif-cn text-xl text-primary-900 sm:text-2xl">
                本店与地球的关系：已和解。
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
                少一点肉，多一点禾。每一盒素饺，都是一次对土地更温柔的取用。
              </p>
            </div>
            <SealStamp className="scale-125" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
