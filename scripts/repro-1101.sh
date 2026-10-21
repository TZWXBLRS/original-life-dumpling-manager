#!/bin/bash
# 复现生产环境「点选订单信息 → Error 1101」
BASE="https://dumpling-shop.pages.dev"
CJ=/tmp/admin_cj.txt
rm -f "$CJ"

echo "=== 1. 获取 CSRF ==="
CSRF=$(curl -s -c "$CJ" "$BASE/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
echo "csrf=${CSRF:0:16}..."

echo "=== 2. 管理员登录 ==="
curl -s -b "$CJ" -c "$CJ" -o /dev/null -w "login HTTP:%{http_code} -> %{redirect_url}\n" \
  -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "phone=15313659956" \
  --data-urlencode "password=123456" \
  --data-urlencode "callbackUrl=$BASE/admin/dashboard"

echo "=== 3. 会话 ==="
curl -s -b "$CJ" "$BASE/api/auth/session" | head -c 200
echo ""

echo "=== 4. 订单列表页 ==="
curl -s -b "$CJ" -o /tmp/orders.html -w "HTTP:%{http_code} size:%{size_download}\n" "$BASE/admin/orders"

echo "=== 5. 提取详情链接 ==="
grep -oE 'href="/orders/[^"]+"' /tmp/orders.html | sort -u | head -5

echo "=== 6. 逐个访问订单详情页 ==="
for ID in $(grep -oE 'href="/orders/[^"]+"' /tmp/orders.html | sed 's/href="\/orders\///;s/"//' | sort -u | head -4); do
  CODE=$(curl -s -b "$CJ" -o /tmp/detail_$ID.html -w "%{http_code}" "$BASE/orders/$ID")
  SIZE=$(wc -c < /tmp/detail_$ID.html)
  echo "  /orders/$ID → HTTP $CODE (${SIZE} bytes)"
  if [ "$CODE" != "200" ]; then
    echo "    ---- 响应前 400 字符 ----"
    head -c 400 /tmp/detail_$ID.html
    echo ""
  fi
done
