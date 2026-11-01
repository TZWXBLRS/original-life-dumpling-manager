"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";

export type Chapter = {
  id: string;
  no: string;
  label: string;
};

// 吸顶导航高 4.5rem；章节条吸附在导航正下方，因此滚动只让出导航高度。
const HEADER_OFFSET = 72;

/**
 * 移动端章节分页器：
 * - 桌面端（md 及以上）所有章节按原顺序完整铺开，保持长页阅读；
 * - 移动端同一时间只显示一个章节，通过顶部章节条点击或左右滑动切换，
 *   避免首页纵向滚动过长。
 * 章节与子元素通过 chapterIndexes 对应（允许多个子元素归入同一章节）。
 */
export function MobileChapterDeck({
  chapters,
  chapterIndexes,
  children,
}: {
  chapters: Chapter[];
  chapterIndexes: number[];
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const [active, setActive] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const scrollToDeck = useCallback(() => {
    const el = deckRef.current;
    if (!el || window.innerWidth >= 768) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }, []);

  const selectChapter = useCallback(
    (index: number) => {
      if (index < 0 || index >= chapters.length) return;
      const isMobile = window.innerWidth < 768;
      setActive(index);
      if (!isMobile) return;
      if (index !== active) {
        window.history.replaceState(null, "", `#${chapters[index].id}`);
      }
      // 内容高度切换后再定位，确保章节条紧贴导航下方
      requestAnimationFrame(() => requestAnimationFrame(scrollToDeck));
    },
    [active, chapters, scrollToDeck]
  );

  // 支持从其他页面带 #story / #menu 等锚点进入，直接打开对应章节
  const activateFromHash = useCallback(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const index = chapters.findIndex((c) => c.id === id);
    if (index < 0) return;
    setActive(index);
    requestAnimationFrame(() => requestAnimationFrame(scrollToDeck));
  }, [chapters, scrollToDeck]);

  useEffect(() => {
    activateFromHash();
    const onHashChange = () => activateFromHash();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [activateFromHash]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || window.innerWidth >= 768) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // 只识别明确的横向手势，避免干扰纵向滚动
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    selectChapter(dx < 0 ? active + 1 : active - 1);
  };

  const isChapterEnd = (index: number) =>
    index === items.length - 1 ||
    chapterIndexes[index + 1] !== chapterIndexes[index];

  return (
    <div ref={deckRef} className="md:contents">
      {/* 章节条：移动端吸顶，随页面滚动保持在导航下方 */}
      <div className="sticky top-[4.5rem] z-30 border-y border-rice-300/80 bg-rice-50/95 backdrop-blur-md md:hidden">
        <div className="flex gap-1.5 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chapters.map((chapter, index) => {
            const isActive = index === active;
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => selectChapter(index)}
                aria-pressed={isActive}
                aria-label={`${chapter.no} · ${chapter.label}`}
                className={`flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full border text-[11px] transition-colors ${
                  isActive
                    ? "border-primary-700 bg-primary-700 text-rice-50"
                    : "border-rice-300 bg-rice-50 text-stone-600"
                }`}
              >
                <span
                  className={`font-serif-cn text-[12px] ${
                    isActive ? "text-wheat-300" : "text-wheat-600"
                  }`}
                >
                  {chapter.no}
                </span>
                {chapter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        {items.map((child, index) => {
          const chapterIndex = chapterIndexes[index] ?? 0;
          const isActive = chapterIndex === active;
          const prev = chapters[chapterIndex - 1];
          const next = chapters[chapterIndex + 1];
          return (
            <div
              key={index}
              className={isActive ? "block" : "hidden md:block"}
            >
              {child}

              {/* 章节末尾：明确的边界与上一章 / 下一章入口，仅移动端 */}
              {isChapterEnd(index) && (
                <div className="border-t border-rice-300/70 md:hidden">
                  <div className="mx-auto flex max-w-6xl items-stretch gap-2 px-4 py-4">
                    {prev && (
                      <button
                        type="button"
                        onClick={() => selectChapter(chapterIndex - 1)}
                        className="flex flex-1 items-center gap-2 rounded-xl border border-rice-300 bg-rice-50 px-4 py-3 text-left"
                      >
                        <span aria-hidden="true" className="text-stone-400">
                          ←
                        </span>
                        <span>
                          <span className="block text-[10px] tracking-[0.22em] text-stone-400">
                            上一章
                          </span>
                          <span className="mt-0.5 block font-serif-cn text-[15px] text-stone-700">
                            {prev.no} · {prev.label}
                          </span>
                        </span>
                      </button>
                    )}
                    {next && (
                      <button
                        type="button"
                        onClick={() => selectChapter(chapterIndex + 1)}
                        className="flex flex-1 items-center justify-end gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-right"
                      >
                        <span>
                          <span className="block text-[10px] tracking-[0.22em] text-primary-600">
                            下一章
                          </span>
                          <span className="mt-0.5 block font-serif-cn text-[15px] text-primary-900">
                            {next.no} · {next.label}
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-primary-600">
                          →
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
