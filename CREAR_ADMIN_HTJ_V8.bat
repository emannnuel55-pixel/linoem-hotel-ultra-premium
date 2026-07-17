@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title HTJ Hotel Admin V8 - GitHub y Railway

set "REPO_URL=https://github.com/emannnuel55-pixel/linoem-hotel-ultra-premium.git"
set "BRANCH=main"
set "SOURCE=%~dp0"
set "GITHUB_HOME=%USERPROFILE%\Documents\GitHub"
set "WORK=%GITHUB_HOME%\linoem-hotel-ultra-premium"

echo ================================================================
echo   CREADOR DE ADMIN HTJ V8 ^| GITHUB + RAILWAY
echo ================================================================
echo.
echo Carpeta de archivos nuevos:
echo %SOURCE%
echo.

if not exist "%SOURCE%VERSION_HTJ_PREMIUM_V3.txt" goto :wrong_source
if not exist "%SOURCE%clientes\public\logo-htj.png" goto :wrong_source
if not exist "%SOURCE%empleados\public\logo-htj.png" goto :wrong_source
if not exist "%SOURCE%api-clientes\src\server.mjs" goto :wrong_source
if not exist "%SOURCE%api-empleados\src\server.mjs" goto :wrong_source

where git >nul 2>&1
if errorlevel 1 goto :no_git
where robocopy >nul 2>&1
if errorlevel 1 goto :no_robocopy

if not exist "%GITHUB_HOME%" mkdir "%GITHUB_HOME%"

if exist "%WORK%\.git\" goto :update_repo
echo [1/6] Clonando el repositorio...
git clone "%REPO_URL%" "%WORK%"
if errorlevel 1 goto :clone_error
goto :repo_ready

:update_repo
echo [1/6] Repositorio local detectado. Actualizando...
pushd "%WORK%" || goto :work_error
git status --porcelain > "%TEMP%\htj_git_status.txt"
for %%A in ("%TEMP%\htj_git_status.txt") do if not %%~zA==0 (
  echo [ERROR] La copia local contiene cambios pendientes:
  git status --short
  popd
  goto :finish_error
)
git pull --ff-only origin %BRANCH%
if errorlevel 1 (
  popd
  goto :pull_error
)
popd

:repo_ready
if not exist "%WORK%\.git\" goto :work_error

echo [2/6] Copiando la entrega HTJ Premium V3...
robocopy "%SOURCE%." "%WORK%" /E /R:2 /W:1 /XD .git node_modules /XF .DS_Store NO_COPIAR_XCOPY.txt /NFL /NDL /NJH /NJS /NP
set "COPY_RESULT=%ERRORLEVEL%"
if %COPY_RESULT% GEQ 8 goto :copy_error

pushd "%WORK%" || goto :work_error
if not exist ".git\" (
  popd
  goto :work_error
)

echo [3/6] Validando los cambios...
git add -A
if errorlevel 1 (
  popd
  goto :git_error
)
git diff --cached --quiet
if not errorlevel 1 (
  echo [OK] GitHub ya contiene exactamente esta version.
  popd
  goto :finish_ok
)

git config user.name >nul 2>&1
if errorlevel 1 (
  set /p "GIT_NAME=Escribe tu nombre para Git y presiona ENTER: "
  if "!GIT_NAME!"=="" (
    popd
    goto :identity_error
  )
  git config user.name "!GIT_NAME!"
)

git config user.email >nul 2>&1
if errorlevel 1 (
  set /p "GIT_EMAIL=Escribe tu correo de GitHub y presiona ENTER: "
  if "!GIT_EMAIL!"=="" (
    popd
    goto :identity_error
  )
  git config user.email "!GIT_EMAIL!"
)

echo [4/6] Creando la actualizacion...
git commit -m "HTJ V6: cuenta admin configurable con permisos completos"
if errorlevel 1 (
  popd
  goto :git_error
)

echo [5/6] Confirmando la rama principal...
git pull --rebase origin %BRANCH%
if errorlevel 1 (
  popd
  goto :conflict_error
)

echo [6/6] Subiendo a GitHub...
git push origin %BRANCH%
if not errorlevel 1 (
  popd
  goto :finish_ok
)

echo GitHub necesita autorizar esta computadora. Abriendo el acceso...
git credential-manager github login
if errorlevel 1 (
  popd
  goto :login_error
)
git push origin %BRANCH%
if errorlevel 1 (
  popd
  goto :login_error
)
popd
goto :finish_ok

:wrong_source
echo [ERROR] El BAT no esta dentro de la carpeta HTJ Premium correcta.
echo Colocalo junto a VERSION_HTJ_PREMIUM_V3.txt, clientes, empleados,
echo api-clientes y api-empleados. No lo ejecutes desde Descargas directamente.
goto :finish_error

:no_git
echo [ERROR] Git no esta instalado o Windows no lo encuentra.
goto :finish_error

:no_robocopy
echo [ERROR] Windows no encuentra ROBOCOPY.
goto :finish_error

:clone_error
echo [ERROR] No fue posible clonar el repositorio.
goto :finish_error

:pull_error
echo [ERROR] No fue posible actualizar la copia local desde GitHub.
goto :finish_error

:copy_error
echo [ERROR] ROBOCOPY no pudo copiar los archivos. Codigo: %COPY_RESULT%
goto :finish_error

:work_error
echo [ERROR] La carpeta Git valida no fue encontrada:
echo %WORK%
echo No se ejecuto ningun comando dentro de System32.
goto :finish_error

:git_error
echo [ERROR] Git no pudo preparar o guardar los cambios.
goto :finish_error

:identity_error
echo [ERROR] Falta configurar el nombre o correo de Git.
goto :finish_error

:conflict_error
echo [ERROR] Git encontro un conflicto. No se forzo ni se borro nada.
echo Carpeta para revisar: %WORK%
goto :finish_error

:login_error
echo [ERROR] GitHub no autorizo la subida.
echo Los cambios permanecen guardados en: %WORK%
goto :finish_error

:finish_ok
echo.
echo ================================================================
echo [OK] ACTUALIZACION COMPLETADA
echo ================================================================
echo GitHub recibio la version correcta y Railway iniciara el despliegue.
echo Carpeta conectada: %WORK%
echo.
pause
exit /b 0

:finish_error
echo.
echo La operacion se detuvo sin borrar tus archivos.
echo Toma una foto desde la primera linea de ERROR si necesitas ayuda.
echo.
pause
exit /b 1
