const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
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
