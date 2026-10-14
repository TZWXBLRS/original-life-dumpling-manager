const path = require("path");

// 仅在 Cloudflare (OpenNext) 构建时启用边缘适配，见 scripts/build-cloudflare.js。
// 本地 dev / 自托管 next build+start 走 Node 运行时：
//   - @prisma/adapter-libsql 默认入口(index-node)用原生 SQLite 绑定，支持 file: URL；
//   - 但它的 @libsql/client 依赖带有 webpack 无法解析的动态 require.context 扫描，
//     所以本地构建需要把这些包标为 external，交给 Node 运行时用原生 require 加载。
// 若本地也 alias 成 /web，会因 fetch 客户端只认 libsql:/wss:/https: 而报
//   URL_SCHEME_NOT_SUPPORTED: got "file:"。
const isCloudflareBuild = process.env.CF_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // 本地/自托管构建：把 Prisma + libSQL 相关包排除出打包，运行时用 Node require 加载，
    // 从而走原生 SQLite 绑定支持 file:（Cloudflare 构建不设置，改用 /web 打包）。
    ...(isCloudflareBuild
      ? {}
      : {
          serverComponentsExternalPackages: [
            "@prisma/adapter-libsql",
            "@libsql/client",
            "libsql",
          ],
        }),
  },
  webpack: (config, { isServer }) => {
    if (isServer && isCloudflareBuild) {
      // Cloudflare Workers 环境适配：
      // 1. 把 @prisma/adapter-libsql 强制指向 /web 入口，避开
      //    @libsql/client/lib-esm/node.js 的 require.context 扫描
      //    把 README.md/LICENSE 当模块处理导致 build 失败。
      // 2. 把 @prisma/client/runtime/wasm-engine-edge 明确指向具体文件，
      //    让 webpack 不会因为 exports 字段解析失败 fallback 到 library.js
      //    （library.js 调用 fs.readdir 检测 binary target，Workers 报错）
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@prisma/adapter-libsql": "@prisma/adapter-libsql/web",
        "@prisma/client/runtime/wasm-engine-edge": path.resolve(
          __dirname,
          "node_modules/@prisma/client/runtime/wasm-engine-edge.js"
        ),
        "@prisma/client/runtime/wasm-engine-edge.js": path.resolve(
          __dirname,
          "node_modules/@prisma/client/runtime/wasm-engine-edge.js"
        ),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
