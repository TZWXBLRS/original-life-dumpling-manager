/**
 * Cloudflare Pages 部署构建脚本（原子操作 + 持续 patch，防自我触发）
 *
 * 流程：
 *   1. patch .prisma/client/index.js 和 default.js 为 wasm.js（去掉 .js 后缀）
 *   2. 启动文件 watcher：监听 .prisma/client/index.js 变化
 *   3. watcher 触发时先读文件检查是否已经是 patched 版本，是则跳过（防自我触发）
 *   4. 执行 OpenNext build
 *   5. build 结束后停止 watcher，恢复原文件内容
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const prismaClientDir = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client"
);
const indexFile = path.join(prismaClientDir, "index.js");
const defaultFile = path.join(prismaClientDir, "default.js");
const wasmFile = path.join(prismaClientDir, "wasm.js");

for (const f of [indexFile, defaultFile, wasmFile]) {
  if (!fs.existsSync(f)) {
    console.error(`✗ 找不到 ${f}，请先执行 prisma generate`);
    process.exit(1);
  }
}

// patch 后的内容（patched wasm.js + 改写 require 字符串）
const patchedContent = fs
  .readFileSync(wasmFile, "utf8")
  .replace(
    /require\(['"]@prisma\/client\/runtime\/wasm-engine-edge\.js['"]\)/g,
    "require('@prisma/client/runtime/wasm-engine-edge')"
  );

// patch 标记（写入文件头部），用于 watcher 判断文件是否已经 patched
const PATCH_FLAG = "// __CLOUDFLARE_BUILD_PATCH__";
const flaggedContent = PATCH_FLAG + "\n" + patchedContent;

// 备份原文件
const backups = {
  [indexFile]: fs.readFileSync(indexFile, "utf8"),
  [defaultFile]: fs.readFileSync(defaultFile, "utf8"),
};

// patch 函数：仅当文件不是 patched 版本时才写入
function applyPatchIfNeeded(filePath) {
  try {
    const current = fs.readFileSync(filePath, "utf8");
    if (current.startsWith(PATCH_FLAG)) {
      return false; // 已经 patched
    }
    fs.writeFileSync(filePath, flaggedContent);
    return true;
  } catch (e) {
    console.error(`✗ patch ${path.basename(filePath)} 失败:`, e.message);
    return false;
  }
}

function applyPatch() {
  let changed = false;
  for (const f of [indexFile, defaultFile]) {
    if (applyPatchIfNeeded(f)) changed = true;
  }
  return changed;
}

// 初始 patch
applyPatch();
console.log("✓ 初始 patch 完成（index.js + default.js → patched wasm.js）");

// 标记本次构建面向 Cloudflare（workerd），让 next.config.js 启用 Prisma/libSQL 的 web 别名
process.env.CF_BUILD = "1";

// 启动 OpenNext build（子进程）
// 注意：不使用 fs.watch，因为在 CI 环境可能不稳定。
// 改为在 build 完成后再次 patch，确保 OpenNext 重新生成 client 时也能覆盖。
const child = spawn(
  "npx",
  ["@opennextjs/cloudflare", "build", "--dangerouslyUseUnsupportedNextVersion"],
  {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    shell: process.platform === "win32",
  }
);

// ============ Pages 输出后处理 ============
// OpenNext 面向 Cloudflare Workers 设计：静态资源放在 .open-next/assets，
// 由平台的 assets binding 提供。但 Cloudflare Pages 只在「输出目录根」查找静态文件，
// 且 _worker.js 会拦截所有请求，导致 /_next/static/* 全部 404（页面无样式、按钮不响应）。
// 处理方式：
//   1. 把 .open-next/assets 的内容平铺到输出目录根，让 Pages 能直接命中静态文件
//   2. 生成 _routes.json，将 /_next/static/* 排除出 Worker，交给 Pages 静态资源层
function preparePagesOutput() {
  const openNextDir = path.join(__dirname, "..", ".open-next");
  const assetsDir = path.join(openNextDir, "assets");
  if (!fs.existsSync(assetsDir)) {
    console.error("✗ 找不到 .open-next/assets，跳过 Pages 后处理");
    return;
  }

  // 1. 平铺 assets 到输出目录根
  for (const entry of fs.readdirSync(assetsDir)) {
    fs.cpSync(path.join(assetsDir, entry), path.join(openNextDir, entry), {
      recursive: true,
      force: true,
    });
  }

  // 2. 写入 _routes.json：静态资源交给 Pages，其余路由交给 Worker
  fs.writeFileSync(
    path.join(openNextDir, "_routes.json"),
    JSON.stringify(
      { version: 1, include: ["/*"], exclude: ["/_next/static/*"] },
      null,
      2
    ) + "\n"
  );

  // 3. Pages 高级模式只认 `_worker.js` 作为动态路由入口；
  //    OpenNext 产出的是 `worker.js`（面向 Workers 的 main），
  //    这里复制一份为 _worker.js，相对 import 路径不变，Pages 即可运行 Worker。
  const workerFile = path.join(openNextDir, "worker.js");
  if (fs.existsSync(workerFile)) {
    fs.copyFileSync(workerFile, path.join(openNextDir, "_worker.js"));
  } else {
    console.error("✗ 找不到 .open-next/worker.js，无法生成 _worker.js");
  }

  console.log(
    "✓ 已生成 Pages 输出（assets 平铺 + _routes.json + _worker.js）"
  );
}

child.on("close", (code) => {
  // build 成功后重新 patch（防止 OpenNext 重新生成 client）+ Pages 后处理
  if (code === 0) {
    try {
      applyPatch();
      console.log("✓ build 后重新 patch 完成");
    } catch (e) {
      console.error("✗ build 后重新 patch 失败:", e.message);
    }
    try {
      preparePagesOutput();
    } catch (e) {
      console.error("✗ Pages 后处理失败:", e.message);
    }
  }

  // 恢复原内容
  for (const [f, content] of Object.entries(backups)) {
    fs.writeFileSync(f, content);
    console.log(`✓ 已恢复 ${path.basename(f)}`);
  }

  process.exit(code);
});

child.on("error", (err) => {
  console.error("✗ OpenNext build 失败:", err.message);
  for (const [f, content] of Object.entries(backups)) {
    fs.writeFileSync(f, content);
  }
  process.exit(1);
});
