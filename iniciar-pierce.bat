@echo off
rem Abre o PiErCe (app desktop) com um duplo clique. Requer Node, Rust e `npm install` ja feitos.
title PiErCe
cd /d "%~dp0"
call npm run desktop:dev
pause
