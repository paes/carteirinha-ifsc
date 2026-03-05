@echo off
chcp 65001 >nul
setlocal

REM Script de versionamento simples e funcional
REM Uso: version-simple.bat [tipo]

set TIPO=%1
if "%TIPO%"=="" set TIPO=patch

REM Ler versão atual
set VERSION_FILE=version.json
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

REM Data/hora atual (formato simples)
for /f "tokens=1-3 delims=/ " %%a in ('echo %date%') do (
    set D=%%a
    set M=%%b
    set Y=%%c
)
for /f "tokens=1-2 delims=: " %%a in ('echo %time%') do (
    set H=%%a
    set MIN=%%b
)

REM Atualizar versão
echo %NEW_VERSION% > %VERSION_FILE%

REM Atualizar HTML (usando PowerShell para evitar problemas de codificação)
powershell -Command "(Get-Content index.html) -replace 'v[0-9]+\.[0-9]+\.[0-9]+', 'v%NEW_VERSION%' | Set-Content index.html"
powershell -Command "(Get-Content index.html) -replace 'Atualizado em: <span id=\"last-updated\">[^<]*</span>', 'Atualizado em: <span id=\"last-updated\">%D%/%M%/%Y% %H%:%MIN%</span>' | Set-Content index.html"

REM Git commit e push
git add .
git commit -m "v%NEW_VERSION%: Atualizacao automatica"
git push origin main

echo Versao atualizada: v%NEW_VERSION%
echo Data/Hora: %D%/%M%/%Y% %H%:%MIN%
echo Deploy concluido!
