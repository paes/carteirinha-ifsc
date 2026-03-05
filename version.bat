@echo off
setlocal enabledelayedexpansion

REM Script de versionamento automático para Windows
REM Uso: version.bat [tipo]
REM tipo: patch (1.0.1), minor (1.1.0), major (2.0.0)

set TIPO=%1
if "%TIPO%"=="" set TIPO=patch

REM Arquivo de versão
set VERSION_FILE=version.json
set HTML_FILE=index.html

REM Ler versão atual
if exist %VERSION_FILE% (
    set /p VERSION=<%VERSION_FILE%
) else (
    set VERSION=1.0.0
)

REM Separar versão
for /f "tokens=1,2,3 delims=." %%a in ("%VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

REM Incrementar versão
if "%TIPO%"=="patch" (
    set /a PATCH+=1
) else if "%TIPO%"=="minor" (
    set /a MINOR+=1
    set PATCH=0
) else if "%TIPO%"=="major" (
    set /a MAJOR+=1
    set MINOR=0
    set PATCH=0
) else (
    echo Uso: %0 [patch^|minor^|major]
    exit /b 1
)

REM Nova versão
set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%

REM Obter data/hora atual do deploy (formato DD/MM/YYYY HH:MM:SS)
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DAY=%%a
for /f "tokens=1-2 delims=:" %%a in ('time /t') do set TIME=%%a:%%b
for /f "tokens=2 delims= " %%a in ('date /t') do set MONTH=%%a
for /f "tokens=3 delims= " %%a in ('date /t') do set YEAR=%%b

REM Formatar data/hora brasileira
set DEPLOY_DATETIME=%DAY%/%MONTH%/%YEAR% %TIME%

REM Atualizar arquivo de versão
echo %NEW_VERSION% > %VERSION_FILE%

REM Atualizar HTML com data/hora fixa do deploy
powershell -Command "(Get-Content %HTML_FILE%) -replace 'v[0-9]+\.[0-9]+\.[0-9]+', 'v%NEW_VERSION%' | Set-Content %HTML_FILE%"
powershell -Command "(Get-Content %HTML_FILE%) -replace 'Atualizado em: <span id=\"last-updated\">[^<]*</span>', 'Atualizado em: <span id=\"last-updated\">%DEPLOY_DATETIME%</span>' | Set-Content %HTML_FILE%"

REM Git commit e push
git add .
git commit -m "v%NEW_VERSION%: Atualização automática de versão"
git push origin main

echo ✅ Versão atualizada: v%NEW_VERSION%
echo 📅 Data/Hora do deploy: %DEPLOY_DATETIME%
echo 📝 Commit criado e push enviado
