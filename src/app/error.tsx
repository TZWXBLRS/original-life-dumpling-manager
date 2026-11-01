"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 路由级错误兜底（App Router 约定）。
 *
 * 捕获各页面（含后台各页）在渲染/导航过程中抛出的异常，展示友好的
 * 重试页面，避免整页变成 `Application error: a client-side exception has
 * occurred`。相比 global-error，它保留了根布局，因此样式类名可用。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">🥟</div>
        <h1 className="text-xl font-bold mb-2">页面开小差了</h1>
        <p className="text-sm text-stone-500 mb-6">
          加载时出现了一点小状况，可能是网络波动或服务繁忙，请稍后重试。
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button type="button" onClick={() => reset()} className="btn-primary">
            重新加载
          </button>
          <Link href="/" className="btn-secondary">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
