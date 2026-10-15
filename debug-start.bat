@echo on
REM ============================================================
REM  素生活饺子馆 · 诊断启动脚本（排错专用）
REM  功能：不启动后台进程，只打印每一步诊断信息，窗口永不自动关闭
REM  用法：在 cmd 中进入项目目录后执行 debug-start.bat
REM ============================================================
cd /d "%~dp0"
set "PD=%cd%"
echo.
echo ========== 🍜 诊断信息开始 ==========
echo 项目目录: %PD%
echo 当前用户: %USERNAME%
echo 系统: %OS%  处理器: %PROCESSOR_ARCHITECTURE%
echo.

echo --- 1. 基础命令检测 ---
where docker
where node
where npm
where npx
where powershell
where ssh
echo.

echo --- 2. 版本信息 ---
if exist node ( for /f "delims=" %%a in ('node -v 2^>^&1') do echo node 版本: %%a )
if exist npm  ( for /f "delims=" %%a in ('npm  -v 2^>^&1') do echo npm  版本: %%a )
if exist docker ( for /f "delims=" %%a in ('docker --version 2^>^&1') do echo docker 版本: %%a )
echo.

echo --- 3. 目录与关键文件检查 ---
for %%f in (package.json next.config.js Dockerfile docker-compose.yml prisma\schema.prisma prisma\seed.ts 同事试用指南.html) do (
    if exist "%PD%\%%f" (
        echo ✅ %%f  存在
    ) else (
        echo ❌ %%f  缺失!!!  请确认解压是否完整
    )
)
echo.

echo --- 4. 端口 3000 占用情况 ---
netstat -ano | findstr :3000
if errorlevel 1 echo ✅ 3000 端口当前空闲
echo.

echo --- 5. 相关进程快照 ---
tasklist /fi "imagename eq node.exe"
tasklist /fi "imagename eq docker.exe"
tasklist /fi "imagename eq "com.docker.service""
echo.

echo --- 6. 本地服务探测 (如果已启动) ---
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3000/products -TimeoutSec 3; Write-Host ('✅ localhost:3000 可达, HTTP ' + $r.StatusCode) } catch { Write-Host ('❌ localhost:3000 不可达: ' + $_.Exception.Message) }"
echo.

echo --- 7. 已有日志摘要 ---
if exist "%PD%\logs" (
    for %%l in (launcher.log app.log tunnel.log) do (
        if exist "%PD%\logs\%%l" (
            echo.
            echo 📄 --- logs\%%l (末 20 行) ---
            powershell -NoProfile -Command "Get-Content '%PD%\logs\%%l' -Tail 20"
        ) else (
            echo 📄 logs\%%l  (暂无)
        )
    )
) else (
    echo 📄 logs 目录不存在（说明启动脚本还没跑到 mkdir logs 就崩了）
)
echo.
echo ========== 🍜 诊断信息结束 ==========
echo.
echo 💡 把以上所有输出截图/复制发开发即可定位问题。
echo 💡 然后手动试运行:
echo    1) 没装 Node: 去 https://nodejs.org/ 下载 LTS 装完重开 cmd
echo    2) 有 Node:   手动执行  cd /d %PD%  && npm install
echo    3) 装完依赖:   手动执行  npm run build  && npm run start
echo.
pause
