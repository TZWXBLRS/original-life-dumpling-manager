const path = require("path");

// Cloudflare Pages 构建时由 scripts/build-cloudflare.js 注入 CF_BUILD=1
const isCloudflareBuild = process.env.CF_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // 本地开发 / 常规 Node 构建：把原生 SQLite 驱动 libsql 交给 Node 运行时
    // 直接 require。否则 @prisma/adapter-libsql 的 Node 入口会拉起 libsql，
    // 其动态 require("""@libsql/<platform>""") 会被 webpack 展开成目录 context
    // 模块，把 README.md 也当 JS 解析而报 ModuleParseError。
    // Cloudflare 构建走 @prisma/adapter-libsql/web 入口，不涉及原生 libsql。
    ...(isCloudflareBuild
      ? {}
      : { serverComponentsExternalPackages: ["libsql"] }),
  },
  webpack: (config, { isServer }) => {
    // 这些 alias 只针对 Cloudflare Workers 构建（CF_BUILD=1 时由
    // scripts/build-cloudflare.js 注入）。本地开发 / 常规 Node 构建
    // 必须走 @prisma/adapter-libsql 的 Node 入口，否则 libSQL 的 /web
    // 入口只支持 http/ws，无法连接本地 SQLite 的 file: URL。
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
    // 本地开发 / 常规 Node 构建：把原生驱动 libsql 交给 Node 运行时 require。
    // libsql/index.js 内含 require(`@libsql/${platform}`) 动态导入，webpack 会
    // 把它展开成目录 context 模块并把 README.md 当 JS 解析（ModuleParseError）。
    if (isServer && !isCloudflareBuild) {
      const prevExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...prevExternals,
        ({ request }, callback) =>
          request === "libsql" ? callback(null, "commonjs libsql") : callback(),
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
