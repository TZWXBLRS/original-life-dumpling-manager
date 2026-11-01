/**
 * 章节标题：以「壹 / 贰 / 叁」编号 + 英文小标 + 中文名，明确每个内容区块的边界。
 * 首页各章节共用，保证节奏统一。
 */
export function ChapterHeading({
  no,
  en,
  zh,
}: {
  no: string;
  en: string;
  zh: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-wheat-400/70 bg-rice-50 font-serif-cn text-[12px] text-wheat-700">
        {no}
      </span>
      <span className="text-[10px] tracking-[0.34em] text-primary-600">
        {en}
      </span>
      <span className="h-px w-6 bg-wheat-400/70" aria-hidden="true" />
      <span className="text-[11px] tracking-[0.22em] text-stone-500">
        {zh}
      </span>
    </div>
  );
}
