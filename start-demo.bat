@echo off
REM ============================================================
REM  素生活饺子馆 Demo · 一键启动 (Windows 稳定版)
REM  - 异常时不会闪退，会停住并显示原因
REM  - 自动检测 Docker / Node / npm
REM  ============================================================
setlocal DisableDelayedExpansion
cd /d "%~dp0"
set "PROJECT_DIR=%cd%"

REM --- 窗口留存兜底：任何异常都会跳到 :END 并 pause ---
goto :MAIN

:ON_ERROR
echo.
echo ❌ 启动过程中发生错误（错误代码: %ERROR_CODE%），请把以上红字拍照发开发。
echo    日志目录: %PROJECT_DIR%\logs\
goto :END

:MAIN
REM ---------- 0. 基础环境准备 ----------
chcp 65001 >nul 2>&1
mkdir logs >nul 2>&1
set "LOG_MAIN=%PROJECT_DIR%\logs\launcher.log"
echo [%date% %time%] 启动开始 > "%LOG_MAIN%"

echo.
echo ╔══════════════════════════════════════════════╗
echo ║   🥟 素生活饺子馆 Demo · 启动器 v2           ║
echo ╚══════════════════════════════════════════════╝
echo 📁 项目目录: %PROJECT_DIR%
echo 📝 运行日志: %LOG_MAIN%
echo.

REM ---------- 1. 检测 Docker 与 Node ----------
set "HAS_DOCKER=0"
where docker >nul 2>nul
if %errorlevel%==0 set "HAS_DOCKER=1"

set "HAS_NODE=0"
where node >nul 2>nul
if %errorlevel%==0 set "HAS_NODE=1"

set "HAS_NPM=0"
where npm >nul 2>nul
if %errorlevel%==0 set "HAS_NPM=1"

echo [环境检测] Docker=%HAS_DOCKER%  Node=%HAS_NODE%  npm=%HAS_NPM%
echo [环境检测] Docker=%HAS_DOCKER% Node=%HAS_NODE% npm=%HAS_NPM% >> "%LOG_MAIN%"

if %HAS_DOCKER%==0 if %HAS_NODE%==0 (
    echo.
    echo ❌ 本机既没装 Docker Desktop，也没装 Node.js。
    echo    方案 A (推荐): 装 Docker Desktop  https://www.docker.com/products/docker-desktop/
    echo    方案 B:         装 Node.js 20+       https://nodejs.org/   （下载 LTS 版本，安装时一路 Next）
    set "ERROR_CODE=100"
    goto :ON_ERROR
)

if %HAS_DOCKER%==0 if %HAS_NPM%==0 (
    echo.
    echo ❌ 检测到 Node.js 但 npm 不可用，说明 Node.js 安装异常。
    echo    请重新安装 Node.js LTS（勾选 "Add to PATH"）。
    set "ERROR_CODE=101"
    goto :ON_ERROR
)

REM ---------- 2. 让用户选启动方式 ----------
set "USE_DOCKER=n"
if not %HAS_DOCKER%==1 goto :SKIP_DOCKER_ASK
echo.
echo 🐳 检测到 Docker Desktop（推荐，零依赖）
echo    回车 = 用 Docker 启动
echo    n    = 改用本地 Node.js 启动
set "ANS=y"
set /p "ANS=请选择 [回车 / n]: "
if /i not "%ANS%"=="n" set "USE_DOCKER=y"
:SKIP_DOCKER_ASK

REM ---------- 3A. Docker 启动 ----------
if /i "%USE_DOCKER%"=="y" goto :DOCKER_START
goto :NODE_START

:DOCKER_START
echo.
echo 🔨 构建 Docker 镜像（首次 3~5 分钟，之后秒级）...
echo    构建日志：实时显示
docker build -t dumpling-manager .
if errorlevel 1 (
    set "ERROR_CODE=200"
    echo ❌ Docker 构建失败，请看上方红字。
    goto :ON_ERROR
)

echo.
echo 🚀 启动 Docker 容器...
docker rm -f dumpling >nul 2>&1
if not exist "%PROJECT_DIR%\data" mkdir "%PROJECT_DIR%\data"
docker run -d --name dumpling ^
    -p 3000:3000 ^
    -v "%PROJECT_DIR%\data:/app/prisma/data" ^
    --restart unless-stopped ^
    dumpling-manager
if errorlevel 1 (
    set "ERROR_CODE=201"
    echo ❌ Docker 启动失败，请看上方红字。
    goto :ON_ERROR
)
timeout /t 5 /nobreak >nul
goto :HEALTH_CHECK

REM ---------- 3B. Node 启动 ----------
:NODE_START
if %HAS_NODE%==0 (
    set "ERROR_CODE=102"
    echo ❌ 本地没装 Node.js，无法用 Node 方式启动。
    goto :ON_ERROR
)

echo.
echo 📦 第 1/4 步：安装依赖...
if not exist node_modules (
    echo    没装过 node_modules，开始 npm install（首次 3~8 分钟）...
    call npm install
    if errorlevel 1 (
        set "ERROR_CODE=300"
        echo ❌ npm install 失败。
        goto :ON_ERROR
    )
) else (
    echo    node_modules 已存在，跳过安装
)

echo.
echo 🔧 第 2/4 步：构建生产版本 (npm run build)...
set "DATABASE_URL=file:./prisma/data/dumpling.db"
call npm run build
if errorlevel 1 (
    set "ERROR_CODE=301"
    echo ❌ npm run build 失败，请看上面的报错。
    goto :ON_ERROR
)

echo.
echo 🌱 第 3/4 步：初始化数据库...
call npx prisma db push --skip-generate
call npm run db:seed >nul 2>&1

echo.
echo 🚀 第 4/4 步：启动 Next.js 服务 (后台运行)...
REM 先杀旧的
tasklist /v /fi "WINDOWTITLE eq dumpling-next*" 2>nul | find "cmd.exe" >nul && (
    echo    清理旧的启动窗口...
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq dumpling-next*" /fo list ^| find "PID:"') do taskkill /f /t /pid %%a >nul 2>&1
)
REM 用 cmd /k 启动：如果启动报错子窗口会保留，方便看到红字
echo    子日志: %PROJECT_DIR%\logs\app.log
start "dumpling-next" cmd /k "cd /d %PROJECT_DIR% && set DATABASE_URL=file:./prisma/data/dumpling.db && set AUTH_TRUST_HOST=true && npm run start >> logs\app.log 2>&1 || echo [启动失败 错误码:%ERRORLEVEL%] && pause"

timeout /t 6 /nobreak >nul
goto :HEALTH_CHECK

REM ---------- 4. 健康检查（用独立 ps1，避免 for/f 嵌套闪退） ----------
:HEALTH_CHECK
echo.
echo 🔍 检查本地服务健康状态 (http://localhost:3000)...
set "HEALTH_PS1=%TEMP%\_dumpling_health.ps1"
(
echo $code = 0
echo for ^($i=0; $i -lt 12; $i++^) {
echo   try {
echo     $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/products" -TimeoutSec 3
echo     if ^($r.StatusCode -eq 200^) { Write-Host "✅ OK" ; exit 0 }
echo   } catch { }
echo   Write-Host "   等待... ($($i+1)/12, last=$($r.StatusCode))"
echo   Start-Sleep 2
echo }
echo exit 1
) > "%HEALTH_PS1%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%HEALTH_PS1%"
set "HC_ERR=%ERRORLEVEL%"
del /f /q "%HEALTH_PS1%" >nul 2>&1

if not "%HC_ERR%"=="0" (
    echo.
    echo ⚠️  本地服务没有正常响应，可能的原因：
    echo    1) 构建还没完成——等 1 分钟再手动打开 http://localhost:3000 看看
    echo    2) 启动报错：如果用了 Node 方式，看标题为 "dumpling-next" 的子窗口红字
    echo    3) 启动报错：如果用了 Docker，执行  docker logs dumpling  查看日志
    echo    4) 端口 3000 被占用：执行  netstat -ano ^| findstr :3000  查看
    echo.
    echo    继续执行后面的公网隧道选择，但建议先确认本地可用。
)

REM ---------- 5. 公网隧道 ----------
:TUNNEL_MENU
echo.
echo 🛰️  公网分享（给同事试用）
echo   1 = Cloudflare Quick Tunnel  （推荐，稳定免费）
echo   2 = localtunnel              （npm，秒开）
echo   3 = 先不挂，只用本地/局域网
echo.
set "TUN_OPT=1"
set /p "TUN_OPT=请选择 [1/2/3，默认 1]: "
if "%TUN_OPT%"=="" set "TUN_OPT=1"

REM 先清理旧隧道进程
taskkill /f /im cloudflared.exe >nul 2>&1
tasklist /v /fi "WINDOWTITLE eq dumpling-cf*" 2>nul | find "cmd.exe" >nul && (
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq dumpling-cf*" /fo list ^| find "PID:"') do taskkill /f /t /pid %%a >nul 2>&1
)
tasklist /v /fi "WINDOWTITLE eq dumpling-lt*" 2>nul | find "cmd.exe" >nul && (
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq dumpling-lt*" /fo list ^| find "PID:"') do taskkill /f /t /pid %%a >nul 2>&1
)

set "PUBLIC_URL="

if "%TUN_OPT%"=="1" goto :TUN_CF
if "%TUN_OPT%"=="2" goto :TUN_LT
goto :TUN_NONE

:TUN_CF
echo.
echo 🌩️  启动 Cloudflare Quick Tunnel...
set "CF_BIN=%TEMP%\cloudflared.exe"
if not exist "%CF_BIN%" (
    echo    首次使用，正在下载 cloudflared.exe 到 %CF_BIN%（约 40MB）...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%CF_BIN%' -UseBasicParsing; Write-Host '✅ 下载完成' } catch { Write-Host '❌ 下载失败：' $_.Exception.Message; exit 1 }"
    if errorlevel 1 (
        echo ❌ cloudflared 下载失败，改选 2 localtunnel 试试，或者手动下载放到 %CF_BIN%
        set "TUN_OPT=2"
        goto :TUN_LT
    )
)

echo    分配公网域名需要 5~30 秒...
echo    隧道日志: %PROJECT_DIR%\logs\tunnel.log
del /f /q "%PROJECT_DIR%\logs\tunnel.log" >nul 2>&1
start "dumpling-cf" /min cmd /c ""%CF_BIN%" tunnel --url http://localhost:3000 --no-autoupdate >> "%PROJECT_DIR%\logs\tunnel.log" 2>&1"

set "CF_PS1=%TEMP%\_dumpling_cfurl.ps1"
(
echo for ^($i=0; $i -lt 20; $i++^) {
echo   if ^(Test-Path '%PROJECT_DIR%\logs\tunnel.log'^) {
echo     $c = Get-Content '%PROJECT_DIR%\logs\tunnel.log' -Raw -ErrorAction SilentlyContinue
echo     if ^($c -match 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com'^) { Write-Output $Matches[0]; exit 0 }
echo   }
echo   Start-Sleep 2
echo }
echo exit 1
) > "%CF_PS1%"

for /f "delims=" %%u in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%CF_PS1%" 2^>nul') do set "PUBLIC_URL=%%u"
del /f /q "%CF_PS1%" >nul 2>&1
goto :TUN_DONE

:TUN_LT
echo.
echo 🌐 启动 localtunnel...
echo    分配域名需要 5~30 秒...
echo    隧道日志: %PROJECT_DIR%\logs\tunnel.log
del /f /q "%PROJECT_DIR%\logs\tunnel.log" >nul 2>&1
start "dumpling-lt" /min cmd /c "cd /d %PROJECT_DIR% && npx --yes localtunnel --port 3000 >> logs\tunnel.log 2>&1"

set "LT_PS1=%TEMP%\_dumpling_lturl.ps1"
(
echo for ^($i=0; $i -lt 20; $i++^) {
echo   if ^(Test-Path '%PROJECT_DIR%\logs\tunnel.log'^) {
echo     $c = Get-Content '%PROJECT_DIR%\logs\tunnel.log' -Raw -ErrorAction SilentlyContinue
echo     if ^($c -match 'https://[a-zA-Z0-9.-]+\.loca\.lt'^) { Write-Output $Matches[0]; exit 0 }
echo   }
echo   Start-Sleep 2
echo }
echo exit 1
) > "%LT_PS1%"

for /f "delims=" %%u in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%LT_PS1%" 2^>nul') do set "PUBLIC_URL=%%u"
del /f /q "%LT_PS1%" >nul 2>&1
goto :TUN_DONE

:TUN_NONE
set "PUBLIC_URL=http://localhost:3000"

:TUN_DONE

REM ---------- 6. 打印最终信息 ----------
:SUMMARY
echo.
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   🥟 素生活饺子馆 Demo · 分享信息                     ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo   🖥️  本地访问:   http://localhost:3000
if not "%PUBLIC_URL%"=="" if not "%PUBLIC_URL%"=="http://localhost:3000" (
    echo   🌍 公网地址:   %PUBLIC_URL%
    echo      ⚠️  免费隧道域名随机，有效期 = 本黑窗不关
)
if "%PUBLIC_URL%"=="" (
    echo   ⚠️  隧道还在分配域名中，你也可以稍后手动看日志找 URL:
    echo      %PROJECT_DIR%\logs\tunnel.log
)
echo.
echo   👑 管理员账号:  15313659956  /  sushenghuo107
echo   🍳 后厨账号:    18301576627  /  sushenghuo105
echo   🙋 顾客账号:    点「立即注册」自己创建（任意手机号）
echo.
echo   📄 试用指南(可直接发群):
echo      %PROJECT_DIR%\同事试用指南.html
echo.
echo   🧪 进程排查:
echo      Node/Docker:  看下面附的【进程怎么看】
echo      日志路径:     %PROJECT_DIR%\logs\
echo.
echo   ⛔ 关闭 Demo:   双击 stop-demo.bat
echo ══════════════════════════════════════════════════════════

:END
echo [%date% %time%] 脚本结束 >> "%LOG_MAIN%"
echo.
echo 按任意键可关闭此窗口（服务仍在后台运行）...
pause >nul
endlocal
exit /b 0
