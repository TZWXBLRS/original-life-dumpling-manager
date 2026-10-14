const path = require("path");

// 仅在面向 Cloudflare (workerd) 构建时套用这些别名。
// 本地 `next dev`/`next build`(Node 运行时) 需要 @prisma/adapter-libsql 的 Node 入口，
// 否则 /web 入口只支持 libsql/wss/http，无法使用 `file:` 本地 SQLite。
const isCloudflareBuild = process.env.CF_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // 本地开发（Node 运行时）：不要把 libsql/prisma 适配器交给 webpack 打包。
    // @libsql/client 的 Node 入口会被 webpack 解析成 context module，
    // 把目录下的 README.md 当代码解析，导致 ModuleParseError 使 dev server 崩溃。
    // 交给 Node 运行时 require 即可（Cloudflare 构建走 web 别名，不适用此项）。
    ...(isCloudflareBuild
      ? {}
      : {
          serverComponentsExternalPackages: [
            "@libsql/client",
            "@prisma/adapter-libsql",
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
        // Cloudflare Workers 没有 Node 的 crypto 模块，jose 的 node 构建
        // 会调用 crypto.createCipheriv 导致 [unenv] not implemented 错误。
        // 强制使用 browser 构建，走 Web Crypto (crypto.subtle)。
        jose: path.resolve(__dirname, "node_modules/jose/dist/browser/index.js"),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
