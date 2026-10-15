#!/usr/bin/env bash
# 一键停止 demo：停服务进程 + 停 tunnel 进程 + 停 docker 容器
set +e
cd "$(dirname "$0")"

echo "🛑 停止素生活饺子馆 Demo..."

# 1. Node 服务
if [ -f logs/app.pid ]; then
  kill $(cat logs/app.pid) 2>/dev/null && echo "✅ 停止 Node 服务"
  rm -f logs/app.pid
fi
pkill -f "next start" 2>/dev/null && echo "✅ 杀掉残留 next 进程"

# 2. 隧道进程
if [ -f logs/tunnel.pid ]; then
  kill $(cat logs/tunnel.pid) 2>/dev/null && echo "✅ 停止隧道进程"
  rm -f logs/tunnel.pid
fi
pkill -f "cloudflared" 2>/dev/null
pkill -f "lt --port" 2>/dev/null
pkill -f "localtunnel" 2>/dev/null
pkill -f "ssh.*serveo\|ssh.*pinggy" 2>/dev/null

# 3. Docker 容器
if command -v docker >/dev/null 2>&1; then
  docker rm -f dumpling 2>/dev/null && echo "✅ 停止并删除 Docker 容器"
fi

echo ""
echo "✅ Demo 已全部停止。"
