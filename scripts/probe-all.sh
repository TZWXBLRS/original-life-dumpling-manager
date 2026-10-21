#!/bin/bash
BASE="https://dumpling-shop.pages.dev"
CJ=/tmp/admin_cj.txt

echo "=== 后台各页面（已登录 ADMIN）==="
for P in dashboard orders sales inventory production settings users; do
  CODE=$(curl -s -b "$CJ" -o /tmp/p_$P.html -w "%{http_code}" "$BASE/admin/$P")
  SIZE=$(wc -c < /tmp/p_$P.html)
  echo "  /admin/$P → HTTP $CODE (${SIZE} bytes)"
done

echo ""
echo "=== 顾客端页面（ADMIN 身份）==="
for P in "" orders products cart checkout; do
  CODE=$(curl -s -b "$CJ" -o /tmp/c_$P.html -w "%{http_code}" "$BASE/$P")
  SIZE=$(wc -c < /tmp/c_$P.html)
  echo "  /$P → HTTP $CODE (${SIZE} bytes)"
done

echo ""
echo "=== 订单列表筛选组合 ==="
for Q in "?status=ALL" "?status=PAID" "?status=PREPARING" "?startDate=2026-10-15&endDate=2026-10-15" "?q=13800138888"; do
  CODE=$(curl -s -b "$CJ" -o /tmp/f.html -w "%{http_code}" "$BASE/admin/orders$Q")
  echo "  /admin/orders$Q → HTTP $CODE ($(wc -c < /tmp/f.html) bytes)"
done

echo ""
echo "=== API 接口 ==="
for A in "/api/auth/session" "/api/admin/products" "/api/admin/configs" "/api/admin/users"; do
  CODE=$(curl -s -b "$CJ" -o /tmp/a.json -w "%{http_code}" "$BASE$A")
  echo "  $A → HTTP $CODE"
done
