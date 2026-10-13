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

// 启动 fs.watch 监听 .prisma/client 目录变化
// 注意：fs.watch 在 Linux 下用 inotify，对目录监听会收到目录下所有文件变化事件
let watcher;
let watchTimeout = null;
try {
  watcher = fs.watch(prismaClientDir, (eventType, filename) => {
    if (!filename) return;
    if (filename !== "index.js" && filename !== "default.js") return;

    // 防抖：短时间内多次触发合并为一次检查
    if (watchTimeout) clearTimeout(watchTimeout);
    watchTimeout = setTimeout(() => {
      watchTimeout = null;
      // 检查是否需要重新 patch（如果是 patched 版本就跳过，防自我触发）
      const filesToCheck = [indexFile, defaultFile];
      let changed = false;
      for (const f of filesToCheck) {
        if (applyPatchIfNeeded(f)) changed = true;
      }
      if (changed) {
        console.log(`↻ 检测到 prisma 重新生成，已重新 patch`);
      }
    }, 100);
  });
} catch (e) {
  console.error("✗ 启动 watcher 失败:", e.message);
}

// 启动 OpenNext build（子进程）
const child = spawn(
  "npx",
  ["@opennextjs/cloudflare", "build", "--dangerouslyUseUnsupportedNextVersion"],
  {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    shell: process.platform === "win32",
  }
);

child.on("close", (code) => {
  // 停止 watcher
  if (watcher) watcher.close();
  if (watchTimeout) clearTimeout(watchTimeout);

  // 恢复原内容
  for (const [f, content] of Object.entries(backups)) {
    fs.writeFileSync(f, content);
    console.log(`✓ 已恢复 ${path.basename(f)}`);
  }

  process.exit(code);
});

child.on("error", (err) => {
  console.error("✗ OpenNext build 失败:", err.message);
  if (watcher) watcher.close();
  if (watchTimeout) clearTimeout(watchTimeout);
  for (const [f, content] of Object.entries(backups)) {
    fs.writeFileSync(f, content);
  }
  process.exit(1);
});
