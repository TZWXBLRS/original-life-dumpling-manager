"use client";

import { useEffect } from "react";

/**
 * 根级错误兜底（App Router 约定）。
 *
 * 当任意页面/根布局出现未捕获的客户端异常时，Next.js 会用本组件替换整页，
 * 避免出现原始的 `Application error: a client-side exception has occurred`。
 * 这里提供一个可重试的友好页面，并在控制台打印真实错误便于排查。
 *
 * 注意：global-error 必须自带 <html> 与 <body>，且不能依赖会导致异常的
 * 外部样式/Provider（因此不接入 CartProvider 等）。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f4",
          color: "#292524",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            padding: 32,
            textAlign: "center",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,.06)",
          }}
        >
          <div style={{ fontSize: 48, lineHeight: 1 }}>🥟</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px" }}>
            页面开小差了
          </h1>
          <p style={{ color: "#78716c", fontSize: 14, margin: "0 0 20px" }}>
            加载时出现了一点小状况，可能是网络波动或服务繁忙，请稍后重试。
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: "#d97706",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              重新加载
            </button>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid #e7e5e4",
                background: "#fff",
                color: "#44403c",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              返回首页
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
