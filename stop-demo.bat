@echo off
REM ============================================================
REM 素生活饺子馆 Demo · 一键停止 (Windows 版)
REM 停 Node 服务、停隧道进程、停 Docker 容器
REM ============================================================
chcp 65001 >nul
cd /d "%~dp0"

echo 🛑 停止素生活饺子馆 Demo...
echo.

REM 1. 停止 Next.js 相关 Node 进程
tasklist /fi "WINDOWTITLE eq dumpling-next*" 2>nul | find /i "cmd.exe" >nul
if %errorlevel%==0 (
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq dumpling-next*" /fo list 2^>nul ^| find "PID:"') do (
        taskkill /f /t /pid %%a >nul 2>&1
    )
    echo ✅ 停止 Node 服务窗口
)
REM 兜底：命令行包含 next start 的
for /f "tokens=2 delims=," %%a in ('tasklist /v /fo csv /nh 2^>nul ^| findstr /i "next start"') do (
    set "PID_TMP=%%~a"
    if defined PID_TMP taskkill /f /t /pid !PID_TMP! >nul 2>&1
)

REM 2. 停隧道进程
tasklist /fi "WINDOWTITLE eq dumpling-cf*" 2>nul | find /i "cmd.exe" >nul
if %errorlevel%==0 (
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq dumpling-cf*" /fo list 2^>nul ^| find "PID:"') do (
        taskkill /f /t /pid %%a >nul 2>&1
    )
)
taskkill /f /im cloudflared.exe >nul 2>&1 && echo ✅ 停止 cloudflared

tasklist /fi "WINDOWTITLE eq dumpling-lt*" 2>nul | find /i "cmd.exe" >nul
if %errorlevel%==0 (
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq dumpling-lt*" /fo list 2^>nul ^| find "PID:"') do (
        taskkill /f /t /pid %%a >nul 2>&1
    )
)

REM 3. Docker 容器
where docker >nul 2>nul
if %errorlevel%==0 (
    docker rm -f dumpling >nul 2>&1 && echo ✅ 停止并删除 Docker 容器
)

echo.
echo ✅ Demo 已全部停止。
pause
