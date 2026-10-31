@echo off
setlocal

title Totem Sao Pedro

:: Caminho automatico do projeto
set "PASTA=%~dp0"
set "PAGINA=%PASTA%index.html"

:: Perfil exclusivo do totem
set "PERFIL=%LOCALAPPDATA%\SaoPedroTotem\ChromeProfile"

:: Localizar Chrome
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
    set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if not exist "%CHROME%" (
    set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

:: Validar arquivos
if not exist "%PAGINA%" (
    echo ERRO: index.html nao encontrado!
    pause
    exit /b
)

if not exist "%CHROME%" (
    echo ERRO: Google Chrome nao encontrado!
    pause
    exit /b
)

:: Iniciar Chrome em modo Kiosk
start "" "%CHROME%" ^
    --kiosk ^
    --start-fullscreen ^
    --no-first-run ^
    --disable-session-crashed-bubble ^
    --user-data-dir="%PERFIL%" ^
    "%PAGINA%"

exit