@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title HTJ Hotel - Actualizador corregido

set "REPO_URL=https://github.com/emannnuel55-pixel/linoem-hotel-ultra-premium.git"
set "BRANCH=main"
set "SOURCE=%~dp0"
set "GITHUB_HOME=%USERPROFILE%\Documents\GitHub"
set "WORK=%GITHUB_HOME%\linoem-hotel-ultra-premium"

echo ================================================================
echo   ACTUALIZADOR CORREGIDO GITHUB + RAILWAY ^| HTJ HOTEL
echo ================================================================
echo.
echo Carpeta de archivos nuevos:
echo %SOURCE%
echo.

if not exist "%SOURCE%api-clientes\src\server.mjs" (
  echo [ERROR] Este BAT no esta dentro de la carpeta correcta del proyecto.
  echo.
  echo Mueve ACTUALIZADOR_HTJ_CORREGIDO.bat dentro de:
  echo linoem-hotel-ultra-premium-main
  echo.
  echo Debe quedar al lado de las carpetas api-clientes, api-empleados,
  echo clientes y empleados. Despues ejecutalo nuevamente.
  goto :error
)

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta instalado o Windows no lo encuentra.
  echo Instala Git para Windows y ejecuta nuevamente este archivo.
  goto :error
)

if not exist "%GITHUB_HOME%" mkdir "%GITHUB_HOME%"

if not exist "%WORK%\.git\" (
  echo [1/6] Clonando el repositorio en una carpeta estable...
  git clone "%REPO_URL%" "%WORK%"
  if errorlevel 1 (
    echo [ERROR] No fue posible clonar el repositorio.
    goto :error
  )
) else (
  echo [1/6] Repositorio local detectado. Actualizando...
  pushd "%WORK%"
  git status --porcelain > "%TEMP%\htj_git_status.txt"
  for %%A in ("%TEMP%\htj_git_status.txt") do if not %%~zA==0 (
    echo [ERROR] La copia de GitHub ya contiene cambios sin guardar:
    git status --short
    echo Abre esta carpeta y revisala antes de continuar:
    echo %WORK%
    popd
    goto :error
  )
  git pull --ff-only origin %BRANCH%
  if errorlevel 1 (
    popd
    echo [ERROR] No fue posible actualizar la copia local.
    goto :error
  )
  popd
)

echo [2/6] Copiando los archivos mejorados...
xcopy "%SOURCE%*" "%WORK%\" /E /I /Y /H /R
if errorlevel 2 (
  echo [ERROR] Windows no pudo copiar los archivos con XCOPY.
  goto :error
)

pushd "%WORK%"
echo [3/6] Validando los cambios...
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo [OK] El repositorio ya contiene exactamente estos cambios.
  popd
  goto :success
)

git config user.name >nul 2>&1
if errorlevel 1 (
  echo Git necesita el nombre que aparecera como autor del cambio.
  set /p "GIT_NAME=Escribe tu nombre y presiona ENTER: "
  if "!GIT_NAME!"=="" (
    echo [ERROR] No se capturo un nombre.
    popd
    goto :error
  )
  git config user.name "!GIT_NAME!"
)

git config user.email >nul 2>&1
if errorlevel 1 (
  echo Git necesita el correo asociado a tu cuenta de GitHub.
  set /p "GIT_EMAIL=Escribe tu correo de GitHub y presiona ENTER: "
  if "!GIT_EMAIL!"=="" (
    echo [ERROR] No se capturo un correo.
    popd
    goto :error
  )
  git config user.email "!GIT_EMAIL!"
)

echo [4/6] Creando el punto de actualizacion...
git commit -m "HTJ: portal premium, promociones y sincronizacion automatica"
if errorlevel 1 (
  echo [ERROR] No fue posible crear el commit.
  popd
  goto :error
)

echo [5/6] Confirmando que la rama principal este actualizada...
git pull --rebase origin %BRANCH%
if errorlevel 1 (
  echo [ERROR] Git encontro un conflicto. No se forzo ni se borro nada.
  echo Carpeta para revisar: %WORK%
  popd
  goto :error
)

echo [6/6] Subiendo a GitHub...
git push origin %BRANCH%
if errorlevel 1 (
  echo.
  echo GitHub necesita autorizar esta computadora.
  echo Se intentara abrir el inicio de sesion en tu navegador...
  git credential-manager github login
  if errorlevel 1 (
    echo [ERROR] No se pudo iniciar Git Credential Manager.
    echo Abre https://github.com/login en tu navegador e inicia sesion.
    echo Despues vuelve a ejecutar este BAT.
    popd
    goto :error
  )
  echo Intentando subir nuevamente...
  git push origin %BRANCH%
  if errorlevel 1 (
    echo [ERROR] GitHub aun no autorizo la subida.
    echo No se perdieron los cambios. Estan guardados en:
    echo %WORK%
    popd
    goto :error
  )
)

popd

:success
echo.
echo ================================================================
echo [OK] ACTUALIZACION COMPLETADA
echo ================================================================
echo GitHub: %REPO_URL%
echo Carpeta conectada: %WORK%
echo Railway comenzara el despliegue automatico si esta conectado a main.
echo.
pause
exit /b 0

:error
echo.
echo La operacion se detuvo sin borrar tus archivos.
echo Si necesitas ayuda, toma una foto desde la primera linea de ERROR.
echo.
pause
exit /b 1
