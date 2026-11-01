/**
 * 禾也品牌基础视觉：一株抽穗的禾苗 + 字标 + 朱砂小印
 */

export function RiceMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 43V17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M23.8 34c-4.6 1.7-8.6.2-10.8-3.4 4.8-1.8 8.7-.2 10.8 3.4Z"
        fill="currentColor"
        opacity=".55"
      />
      <path
        d="M24.2 28c4.6 1.7 8.6.2 10.8-3.4-4.8-1.8-8.7-.2-10.8 3.4Z"
        fill="currentColor"
        opacity=".32"
      />
      <g fill="currentColor">
        <ellipse cx="20.2" cy="21.2" rx="1.9" ry="3.6" transform="rotate(-34 20.2 21.2)" />
        <ellipse cx="27.8" cy="21.2" rx="1.9" ry="3.6" transform="rotate(34 27.8 21.2)" />
        <ellipse cx="21.1" cy="15.8" rx="1.8" ry="3.4" transform="rotate(-30 21.1 15.8)" />
        <ellipse cx="26.9" cy="15.8" rx="1.8" ry="3.4" transform="rotate(30 26.9 15.8)" />
        <ellipse cx="24" cy="11.6" rx="1.55" ry="3" />
      </g>
    </svg>
  );
}

export function BrandLogo({
  light = false,
  compact = false,
  className = "",
}: {
  light?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <RiceMark
        className={`h-9 w-9 shrink-0 ${light ? "text-wheat-300" : "text-primary-600"}`}
      />
      <span className="flex flex-col leading-none">
        <span
          className={`font-serif-cn text-[1.4rem] tracking-brand ${
            light ? "text-rice-50" : "text-primary-800"
          }`}
        >
          禾也
        </span>
        {!compact && (
          <span
            className={`mt-1 text-[9px] tracking-[0.3em] ${
              light ? "text-rice-300/80" : "text-stone-500"
            }`}
          >
            HEYE · 手作素饺
          </span>
        )}
      </span>
    </span>
  );
}

export function SealStamp({
  text = "禾也",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <span className={`seal ${className}`} aria-hidden="true">
      {text}
    </span>
  );
}

export function WheatDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="hairline flex-1" />
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-wheat-500" fill="currentColor">
        <ellipse cx="12" cy="6" rx="1.4" ry="3" />
        <ellipse cx="8.4" cy="10" rx="1.3" ry="2.7" transform="rotate(-26 8.4 10)" />
        <ellipse cx="15.6" cy="10" rx="1.3" ry="2.7" transform="rotate(26 15.6 10)" />
        <ellipse cx="9.4" cy="15" rx="1.2" ry="2.5" transform="rotate(-24 9.4 15)" />
        <ellipse cx="14.6" cy="15" rx="1.2" ry="2.5" transform="rotate(24 14.6 15)" />
        <path d="M12 19v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="hairline flex-1" />
    </div>
  );
}
