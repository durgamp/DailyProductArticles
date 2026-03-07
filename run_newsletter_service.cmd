@echo off
setlocal

cd /d "C:\Users\durga\Coding\udemy-ai\newletter automation"

if not exist "logs" mkdir "logs"

"C:\Users\durga\Coding\udemy-ai\newletter automation\.venv\Scripts\python.exe" "C:\Users\durga\Coding\udemy-ai\newletter automation\main.py" >> "C:\Users\durga\Coding\udemy-ai\newletter automation\logs\service.log" 2>&1
