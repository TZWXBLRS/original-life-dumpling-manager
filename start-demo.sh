#!/usr/bin/env bash
# ============================================================
# 原味生活饺子馆 Demo · 一键启动脚本
# 老板在自己电脑/服务器上执行此文件即可启动 + 挂公网隧道
# ============================================================
set -e

echo "🥟 原味生活饺子馆 Demo 启动器"
echo "================================"

# ---------- 0. 进入项目目录 ----------
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)
echo "📁 项目目录: $PROJECT_DIR"

# ---------- 1. 选启动方式（Docker vs 本地 Node）----------
if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "🐳 检测到 Docker，将以容器方式启动（推荐，零依赖）"
  read -p "回车使用 Docker，或输入 n 改用本地 Node：" use_docker
  use_docker=${use_docker:-y}
else
  use_docker="n"
  echo "⚠️  未检测到 Docker，使用本地 Node 启动"
fi

# ---------- 2. 启动服务 ----------
if [ "$use_docker" != "n" ]; then
  # Docker 方式
  echo ""
  echo "🔨 构建 Docker 镜像（首次约 3-5 分钟，之后秒级）..."
  docker build -t dumpling-manager . 2>&1 | tail -5

  echo ""
  echo "🚀 启动容器，映射 3000 端口..."
  docker rm -f dumpling 2>/dev/null || true
  mkdir -p "$PROJECT_DIR/data"
  docker run -d --name dumpling \
    -p 3000:3000 \
    -v "$PROJECT_DIR/data:/app/prisma/data" \
    --restart unless-stopped \
    dumpling-manager

  sleep 3
  LOCAL_URL="http://localhost:3000"
else
  # 本地 Node 方式
  echo ""
  echo "📦 安装依赖..."
  [ -d node_modules ] || npm install --silent 2>&1 | tail -3

  echo ""
  echo "🔧 构建生产版本..."
  DATABASE_URL="file:./prisma/data/dumpling.db" npm run build 2>&1 | tail -3

  echo ""
  echo "🌱 初始化数据库..."
  DATABASE_URL="file:./prisma/data/dumpling.db" npx prisma db push --skip-generate 2>/dev/null || true
  DATABASE_URL="file:./prisma/data/dumpling.db" npm run db:seed 2>/dev/null || true

  echo ""
  echo "🚀 启动服务（后台运行，日志: logs/app.log）..."
  mkdir -p logs
  # 杀掉旧进程
  pkill -f "next start" 2>/dev/null || true
  nohup bash -c '
    export DATABASE_URL="file:./prisma/data/dumpling.db"
    export AUTH_TRUST_HOST=true
    npm run start
  ' > logs/app.log 2>&1 &
  APP_PID=$!
  echo $APP_PID > logs/app.pid
  sleep 4
  LOCAL_URL="http://localhost:3000"
fi

# ---------- 3. 检查本地服务健康 ----------
echo ""
echo "🔍 检查本地服务..."
for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/products 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 本地服务已就绪: $LOCAL_URL"
    break
  fi
  echo "  等待启动... ($i/10, 状态: $HTTP_CODE)"
  sleep 2
done

# ---------- 4. 选公网隧道方式 ----------
echo ""
echo "🛰️  公网分享（让同事从外部访问）"
echo "   选一种隧道方式即可（推荐 Cloudflare，最稳免费）"
echo ""
echo "   1) Cloudflare Quick Tunnel（推荐，无需注册）"
echo "   2) localtunnel（npm 一条命令，无需注册）"
echo "   3) Serveo（SSH 一条命令，无需注册）"
echo "   4) 先不挂公网，我本地局域网用"
echo ""
read -p "请选择 (1-4，默认 1)：" tunnel_choice
tunnel_choice=${tunnel_choice:-1}

mkdir -p logs
pkill -f "cloudflared" 2>/dev/null || true
pkill -f "localtunnel\|lt " 2>/dev/null || true
pkill -f "ssh.*serveo\|ssh.*pinggy" 2>/dev/null || true

PUBLIC_URL=""

case $tunnel_choice in
  1)
    echo ""
    echo "🌩️  启动 Cloudflare Quick Tunnel..."
    if ! command -v cloudflared >/dev/null 2>&1; then
      echo "   首次使用，下载 cloudflared..."
      case "$(uname -s)" in
        Darwin)
          # macOS
          if [[ $(uname -m) == "arm64" ]]; then
            curl -sSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64
          else
            curl -sSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64
          fi
          ;;
        Linux)
          if [[ $(uname -m) == "aarch64" ]]; then
            curl -sSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
          else
            curl -sSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
          fi
          ;;
        MINGW*|MSYS*|CYGWIN*)
          curl -sSL -o /tmp/cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
          ;;
      esac
      chmod +x /tmp/cloudflared* 2>/dev/null || true
    else
      CF_BIN=$(which cloudflared)
    fi
    CF_BIN=${CF_BIN:-/tmp/cloudflared}
    nohup $CF_BIN tunnel --url http://localhost:3000 --no-autoupdate > logs/tunnel.log 2>&1 &
    TUNNEL_PID=$!
    echo $TUNNEL_PID > logs/tunnel.pid
    echo "   正在分配公网域名（最多 30 秒）..."
    for i in {1..15}; do
      URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" logs/tunnel.log 2>/dev/null | head -1 || true)
      if [ -n "$URL" ]; then
        PUBLIC_URL="$URL"
        break
      fi
      sleep 2
    done
    ;;
  2)
    echo ""
    echo "🌐 启动 localtunnel（npm）..."
    npx --yes localtunnel --port 3000 > logs/tunnel.log 2>&1 &
    TUNNEL_PID=$!
    echo $TUNNEL_PID > logs/tunnel.pid
    echo "   正在分配域名（最多 30 秒）..."
    for i in {1..15}; do
      URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.loca\.lt" logs/tunnel.log 2>/dev/null | head -1 || true)
      if [ -n "$URL" ]; then
        PUBLIC_URL="$URL"
        break
      fi
      sleep 2
    done
    ;;
  3)
    echo ""
    echo "🪜 启动 Serveo（SSH 隧道）..."
    nohup ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:3000 serveo.net > logs/tunnel.log 2>&1 <<< "" &
    TUNNEL_PID=$!
    echo $TUNNEL_PID > logs/tunnel.pid
    echo "   正在分配域名（最多 45 秒）..."
    for i in {1..22}; do
      URL=$(grep -oE "https?://[a-zA-Z0-9.-]+\.serveo\.(net|com)" logs/tunnel.log 2>/dev/null | head -1 || true)
      if [ -n "$URL" ]; then
        PUBLIC_URL="$URL"
        break
      fi
      sleep 2
    done
    ;;
  *)
    echo "✅ 不挂公网，仅本地/局域网访问："
    PUBLIC_URL="http://localhost:3000"
    ;;
esac

# ---------- 5. 输出结果 ----------
echo ""
echo ""
echo "═══════════════════════════════════════════════════"
echo "  🥟 原味生活饺子馆 Demo · 分享信息"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  🖥️  本地访问:   http://localhost:3000"
if [ -n "$PUBLIC_URL" ] && [ "$PUBLIC_URL" != "http://localhost:3000" ]; then
  echo "  🌍 公网地址:   $PUBLIC_URL"
  echo "     ⚠️  免费隧道域名随机，有效期为本脚本运行期间"
fi
echo ""
echo "  👑 管理员账号:  15313659956  /  sushenghuo107"
echo "  🍳 后厨账号:    18301576627  /  sushenghuo105"
echo "  🙋 顾客账号:    点击「立即注册」自己创建（任意手机号）"
echo ""
echo "  📄 试用指南（发群配套文档）: $PROJECT_DIR/同事试用指南.html"
echo ""
echo "  ⛔ 关闭 Demo: cd $PROJECT_DIR && ./stop-demo.sh"
echo "═══════════════════════════════════════════════════"
