@echo off
echo Iniciando API (FastAPI)...
start cmd /k "cd /d d:\Dev\Leads\leads-painel\api && .\venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

echo Iniciando Bot de WhatsApp (Node.js)...
start cmd /k "cd /d d:\Dev\Leads\leads-painel\whatsapp-bot && npm start"

echo Iniciando Frontend (React/Vite)...
start cmd /k "cd /d d:\Dev\Leads\leads-painel\frontend && npm run dev"

echo Todos os 3 serviços foram iniciados em novas janelas!
