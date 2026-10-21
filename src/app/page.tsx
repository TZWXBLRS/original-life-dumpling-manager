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
  Heart,
  Quote,
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
                src="/images/heye-hero-v2.jpg"
                alt="竹笼里刚出锅的手工素饺，旁边是新鲜荠菜与麦穗"
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

      {/* 一碗的温度 · 顾客 H 的故事 */}
      <section
        id="warmth"
        className="relative overflow-hidden border-t border-rice-300/70 bg-rice-100/60 paper-grain py-20 md:py-28"
      >
        <div
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-wheat-200/35 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-200/35 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="animate-fade-up">
            <div className="text-[11px] tracking-[0.4em] text-primary-600">
              A BOWL OF WARMTH · 一碗的温度
            </div>
            <h2 className="mt-4 font-serif-cn text-4xl leading-tight text-primary-900 md:text-5xl">
              同样的饺子，
              <br />
              为什么店里更好吃？
            </h2>
            <WheatDivider className="my-7 max-w-[16rem]" />

            <div className="font-serif-cn text-[17px] leading-[2.1] text-stone-600">
              <p className="flex gap-2">
                <Quote className="mt-1.5 h-4 w-4 shrink-0 text-wheat-500" aria-hidden="true" />
                <span>
                  经常有顾客问我们：为什么在家里煮同样的饺子，
                  <br className="hidden sm:block" />
                  感觉没有店里做的好吃？
                </span>
              </p>
              <p className="mt-4">
                不同的，也许是食客的心情。
                <br />
                在这里，你听到的是亲切的招待，
                <br />
                触摸的是归家的温暖，体会的是做餐人的用心。
              </p>
            </div>

            <div className="relative mt-9 rounded-2xl border border-accent-200/70 bg-rice-50 p-6 shadow-paper">
              <div className="absolute -top-3 left-6 flex items-center gap-1.5 bg-rice-50 px-2 text-[10px] tracking-[0.26em] text-accent-600">
                <Heart className="h-3 w-3" aria-hidden="true" />
                CUSTOMER H · 顾客 H
              </div>
              <div className="flex items-start gap-5">
                <div className="shrink-0 border border-accent-200 bg-rice-100 px-3 py-2 text-center">
                  <div className="font-serif-cn text-3xl leading-none text-accent-600">
                    60
                  </div>
                  <div className="mt-1 text-[10px] tracking-[0.14em] text-stone-500">
                    个饺子
                  </div>
                </div>
                <p className="font-serif-cn text-[15px] leading-[1.95] text-stone-700">
                  那天，顾客 H 来店里品尝我们的水饺。
                  他品到了背后的用心，感动得落泪——
                  那一顿，他一共吃了 60 个饺子。
                </p>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-up delay-2">
            <div className="relative overflow-hidden rounded-[2rem] border border-rice-300 shadow-soft">
              <img
                src="/images/heye-story-warm-1.jpg"
                alt="双手端着一碗刚出锅的素饺，热气缓缓升起"
                className="h-[20rem] w-full object-cover sm:h-[26rem]"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-primary-900/60 to-transparent" />
              <div className="absolute left-5 bottom-4 font-serif-cn text-lg text-rice-50 [text-shadow:0_1px_8px_rgba(24,36,28,0.55)]">
                那一碗，还冒着热气
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <img
                src="/images/heye-story-warm-2.jpg"
                alt="木桌上的一碗素饺、筷子与醋碟"
                className="h-32 w-full rounded-2xl border border-rice-300 object-cover shadow-paper sm:h-40"
              />
              <img
                src="/images/heye-story-warm-3.jpg"
                alt="俯拍的素饺、麦穗与木筷，安静的一餐"
                className="h-32 w-full rounded-2xl border border-rice-300 object-cover shadow-paper sm:h-40"
              />
            </div>

            <div className="mt-4 flex items-center gap-2.5 text-[10px] tracking-[0.22em] text-stone-500">
              <span className="h-px w-6 bg-wheat-400/70" aria-hidden="true" />
              同一碗饺子 · 三种温度
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-6xl px-4 md:mt-20">
          <div className="flex items-center gap-3 text-[10px] tracking-[0.32em] text-primary-600">
            <span className="h-px w-8 bg-wheat-400/70" aria-hidden="true" />
            MORE VOICES · 还有这些话
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <article className="flex flex-col overflow-hidden rounded-2xl border border-accent-200/70 bg-rice-50 shadow-paper">
              <img
                src="/images/heye-voices-f.jpg"
                alt="禾也店内靠窗的木桌、豆绿餐盘、麦穗与绿植，午后阳光落在桌面上"
                className="h-44 w-full object-cover sm:h-52"
              />
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.26em] text-accent-600">
                    CUSTOMER F · 顾客 F
                  </span>
                  <Quote className="h-4 w-4 text-accent-300" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-serif-cn text-xl leading-snug text-primary-900 sm:text-2xl">
                  “吃了你们的饺子，
                  <br />
                  我再也不自己包了。”
                </h3>
                <div className="mt-4 space-y-3 text-[14px] leading-[1.95] text-stone-600">
                  <p>
                    顾客 F 来到店里，点了经典混合口味的水饺，赞不绝口。
                    她说自己平时特别会包饺子，可吃过我们的饺子之后，
                    再也不打算自己做了。
                  </p>
                  <p>
                    她喜欢店里的陈设与氛围，看到连洗手间都打扫得干干净净，
                    也欣赏我们对美的这份追求。
                  </p>
                  <p>
                    她分享说，以前一直处在生存的阶段，不知道为什么会那么忙碌，
                    像一只在滚轮里奔跑的老鼠。而吃我们的饺子，
                    能感觉到每一个口味都那么用心。
                  </p>
                </div>
                <p className="mt-auto border-l-2 border-accent-300 pl-4 pt-4 font-serif-cn text-[15px] leading-[1.9] text-stone-700">
                  她说，在这里品尝到了爱的滋味，油然而生感恩与幸福。
                </p>
              </div>
            </article>

            <article className="flex flex-col overflow-hidden rounded-2xl border border-primary-200/80 bg-primary-50/60 shadow-paper">
              <img
                src="/images/heye-voices-m.jpg"
                alt="店员把一碗热气腾腾的素饺递到顾客手中，两人相视而笑"
                className="h-44 w-full object-cover object-[center_35%] sm:h-52"
              />
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.26em] text-primary-700">
                    CUSTOMER M · 顾客 M
                  </span>
                  <Quote className="h-4 w-4 text-primary-300" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-serif-cn text-xl leading-snug text-primary-900 sm:text-2xl">
                  “因为这里，
                  <br />
                  不止有饺子。”
                </h3>
                <div className="mt-4 space-y-3 text-[14px] leading-[1.95] text-stone-600">
                  <p>
                    顾客 M 经常来店里用餐。她问：为什么总觉得店里的饺子更好吃？
                    店员回答：因为这里不止有饺子。
                  </p>
                  <p>
                    她很开心用餐时能和店里的服务人员聊上几句，
                    在一餐一饭的互动里，感受到积极、热情的能量。
                  </p>
                  <p>
                    有时只是几句家常，一顿饭就变得轻松起来。
                  </p>
                </div>
                <p className="mt-auto border-l-2 border-primary-300 pl-4 pt-4 font-serif-cn text-[15px] leading-[1.9] text-stone-700">
                  一餐饭的温度，一半在饺子里，一半在人身上。
                </p>
              </div>
            </article>
          </div>
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
