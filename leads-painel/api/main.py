# api/main.py - API FastAPI para o painel de leads

from fastapi import FastAPI, Query, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from datetime import datetime
from typing import Optional
import os
import shutil

# ─── Pasta para documentos enviados ──────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── Configuração ────────────────────────────────────────────────
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://higorhenry102:Senac2004@api.1hr0gpv.mongodb.net/?appName=API"
)
DATABASE_NAME = "leads_db"
COLLECTION_NAME = "leads"

# ─── App ─────────────────────────────────────────────────────────
app = FastAPI(title="Leads API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Banco ───────────────────────────────────────────────────────
client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]
col = db[COLLECTION_NAME]
col_clientes = db["clientes"]


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    if isinstance(doc.get("criado_em"), datetime):
        doc["criado_em"] = doc["criado_em"].isoformat()
    return doc


# ─── Rotas ───────────────────────────────────────────────────────

@app.get("/leads")
def listar_leads(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=10000),
    categoria: Optional[str] = None,
    cidade: Optional[str] = None,
    status: Optional[str] = None,
    busca: Optional[str] = None,
    tem_telefone: Optional[bool] = None,
    tem_site: Optional[bool] = None,
):
    filtro = {}

    if categoria:
        filtro["categoria"] = {"$regex": categoria, "$options": "i"}
    if cidade:
        filtro["cidade"] = {"$regex": cidade, "$options": "i"}
    if status:
        filtro["status"] = status
    if busca:
        filtro["$or"] = [
            {"nome": {"$regex": busca, "$options": "i"}},
            {"telefone": {"$regex": busca, "$options": "i"}},
        ]
    if tem_telefone is True:
        filtro["telefone"] = {"$nin": ["", None]}
    if tem_telefone is False:
        filtro["$or"] = [{"telefone": ""}, {"telefone": None}]
    if tem_site is True:
        filtro["site"] = {"$nin": ["", None]}
    if tem_site is False:
        filtro["$or"] = filtro.get("$or", []) + [{"site": ""}, {"site": None}]

    total = col.count_documents(filtro)
    skip = (pagina - 1) * por_pagina

    docs = (
        col.find(filtro)
        .sort("criado_em", DESCENDING)
        .skip(skip)
        .limit(por_pagina)
    )

    return {
        "leads": [serialize(d) for d in docs],
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "total_paginas": max(1, -(-total // por_pagina)),
    }


@app.get("/leads/stats")
def stats():
    total = col.count_documents({})
    com_telefone = col.count_documents({"telefone": {"$nin": ["", None]}})
    com_site = col.count_documents({"site": {"$nin": ["", None]}})

    por_status = list(col.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))

    por_categoria = list(col.aggregate([
        {"$group": {"_id": "$categoria", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]))

    por_cidade = list(col.aggregate([
        {"$match": {"cidade": {"$nin": ["", None]}}},
        {"$group": {"_id": "$cidade", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]))

    return {
        "total": total,
        "com_telefone": com_telefone,
        "com_site": com_site,
        "por_status": {item["_id"]: item["count"] for item in por_status},
        "por_categoria": [{"nome": i["_id"], "total": i["count"]} for i in por_categoria],
        "por_cidade": [{"nome": i["_id"], "total": i["count"]} for i in por_cidade],
    }


@app.patch("/leads/{lead_id}/status")
def atualizar_status(lead_id: str, body: dict):
    novo_status = body.get("status")
    status_validos = ["novo", "contatado", "qualificado", "descartado"]
    if novo_status not in status_validos:
        raise HTTPException(400, f"Status inválido. Use: {status_validos}")

    result = col.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"status": novo_status, "atualizado_em": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Lead não encontrado")
    return {"ok": True, "status": novo_status}


@app.delete("/leads/{lead_id}")
def deletar_lead(lead_id: str):
    result = col.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Lead não encontrado")
    return {"ok": True}


@app.get("/leads/categorias")
def listar_categorias():
    cats = col.distinct("categoria")
    return [c for c in cats if c]


@app.get("/leads/cidades")
def listar_cidades():
    cidades = col.distinct("cidade")
    return [c for c in cidades if c]


@app.post("/leads")
def criar_lead(body: dict):
    if not body.get("nome"):
        raise HTTPException(400, "O campo 'nome' é obrigatório")

    novo_lead = {
        "nome": body.get("nome"),
        "telefone": body.get("telefone", ""),
        "site": body.get("site", ""),
        "categoria": body.get("categoria", "Manual"),
        "cidade": body.get("cidade", ""),
        "status": body.get("status", "novo"),
        "criado_em": datetime.utcnow(),
        "atualizado_em": datetime.utcnow()
    }
    
    result = col.insert_one(novo_lead)
    novo_lead["_id"] = result.inserted_id
    return serialize(novo_lead)


@app.put("/leads/{lead_id}")
def editar_lead(lead_id: str, body: dict):
    if not body.get("nome"):
        raise HTTPException(400, "O campo 'nome' é obrigatório")

    update_data = {
        "nome": body.get("nome"),
        "telefone": body.get("telefone", ""),
        "site": body.get("site", ""),
        "categoria": body.get("categoria", ""),
        "cidade": body.get("cidade", ""),
        "atualizado_em": datetime.utcnow()
    }
    
    result = col.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Lead não encontrado")
    
    return {"ok": True}


# ─── Scraper (Leads Bot) ─────────────────────────────────────────
import subprocess
import threading
import sys

scraper_process = None
scraper_logs = []

def reader_thread(process):
    for line in iter(process.stdout.readline, b''):
        decoded = line.decode('utf-8', errors='replace').rstrip()
        scraper_logs.append(decoded)
    process.stdout.close()

@app.post("/scraper/start")
def start_scraper(body: dict):
    global scraper_process, scraper_logs
    if scraper_process and scraper_process.poll() is None:
        return {"ok": False, "erro": "Bot já está rodando!"}

    termo = body.get("termo", "").strip()
    cidade = body.get("cidade", "").strip()
    qtd = str(body.get("qtd", 100))

    if not termo:
        raise HTTPException(400, "O campo 'termo' é obrigatório")

    scraper_logs = [f"🚀 Iniciando bot: Busca por '{termo}', Cidade: '{cidade}', Meta: {qtd} leads..."]

    try:
        # Pega a pasta d:\Dev\Leads (3 níveis acima de api/main.py)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        bot_dir = os.path.join(base_dir, "leads-bot")
        bot_script = os.path.join(bot_dir, "main.py")
        
        # Usa o Python do venv do bot, se existir
        bot_python = os.path.join(bot_dir, "venv", "Scripts", "python.exe")
        if not os.path.exists(bot_python):
            bot_python = "python"
        
        args = [bot_python, bot_script, termo, cidade, qtd]
        
        scraper_process = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=bot_dir
        )
        
        t = threading.Thread(target=reader_thread, args=(scraper_process,), daemon=True)
        t.start()
        
        return {"ok": True, "msg": "Bot iniciado com sucesso."}
    except Exception as e:
        scraper_logs.append(f"❌ Erro ao iniciar: {e}")
        return {"ok": False, "erro": str(e)}

@app.get("/scraper/logs")
def get_scraper_logs():
    running = scraper_process is not None and scraper_process.poll() is None
    return {"logs": scraper_logs, "running": running}

@app.post("/scraper/stop")
def stop_scraper():
    global scraper_process
    if scraper_process and scraper_process.poll() is None:
        scraper_process.terminate()
        scraper_logs.append("🛑 Bot forçado a parar pelo usuário.")
        return {"ok": True, "msg": "Bot parado."}
    return {"ok": False, "msg": "Bot não estava rodando."}


# ─── Clientes ────────────────────────────────────────────────────

def serialize_cliente(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for campo in ["criado_em", "atualizado_em", "data_assinatura"]:
        if isinstance(doc.get(campo), datetime):
            doc[campo] = doc[campo].isoformat()
    return doc


@app.get("/clientes")
def listar_clientes(
    busca: Optional[str] = None,
    status: Optional[str] = None,
):
    filtro = {}
    if busca:
        filtro["$or"] = [
            {"nome": {"$regex": busca, "$options": "i"}},
            {"empresa": {"$regex": busca, "$options": "i"}},
            {"telefone": {"$regex": busca, "$options": "i"}},
        ]
    if status:
        filtro["status_cliente"] = status

    docs = list(col_clientes.find(filtro).sort("criado_em", DESCENDING))
    return [serialize_cliente(d) for d in docs]


@app.post("/clientes")
def criar_cliente(body: dict):
    if not body.get("nome"):
        raise HTTPException(400, "O campo 'nome' é obrigatório")

    novo = {
        # Dados básicos
        "nome":            body.get("nome", ""),
        "empresa":         body.get("empresa", ""),
        "telefone":        body.get("telefone", ""),
        "email":           body.get("email", ""),
        "cidade":          body.get("cidade", ""),
        # Venda
        "data_assinatura": datetime.fromisoformat(body["data_assinatura"]) if body.get("data_assinatura") else None,
        "valor_contrato":  body.get("valor_contrato", ""),
        "tipo_servico":    body.get("tipo_servico", ""),
        "data_renovacao":  datetime.fromisoformat(body["data_renovacao"]) if body.get("data_renovacao") else None,
        # Servidor / VPS
        "ip_servidor":     body.get("ip_servidor", ""),
        "link_painel":     body.get("link_painel", ""),
        "plano":           body.get("plano", ""),
        "senha_inicial":   body.get("senha_inicial", ""),
        "obs_tecnicas":    body.get("obs_tecnicas", ""),
        # Controle
        "status_cliente":  body.get("status_cliente", "ativo"),  # ativo | inativo | implantacao
        "lead_id":         body.get("lead_id", ""),  # referência ao lead de origem
        "documento_nome":  "",  # preenchido no upload
        "notas":           [],
        "criado_em":       datetime.utcnow(),
        "atualizado_em":   datetime.utcnow(),
    }

    result = col_clientes.insert_one(novo)
    novo["_id"] = result.inserted_id

    # Se veio de um lead, marca o lead como cliente
    if body.get("lead_id"):
        try:
            col.update_one(
                {"_id": ObjectId(body["lead_id"])},
                {"$set": {"status": "qualificado", "atualizado_em": datetime.utcnow()}}
            )
        except Exception:
            pass

    return serialize_cliente(novo)


@app.get("/clientes/{cliente_id}")
def obter_cliente(cliente_id: str):
    doc = col_clientes.find_one({"_id": ObjectId(cliente_id)})
    if not doc:
        raise HTTPException(404, "Cliente não encontrado")
    return serialize_cliente(doc)


@app.put("/clientes/{cliente_id}")
def editar_cliente(cliente_id: str, body: dict):
    update = {
        "nome":            body.get("nome", ""),
        "empresa":         body.get("empresa", ""),
        "telefone":        body.get("telefone", ""),
        "email":           body.get("email", ""),
        "cidade":          body.get("cidade", ""),
        "valor_contrato":  body.get("valor_contrato", ""),
        "tipo_servico":    body.get("tipo_servico", ""),
        "ip_servidor":     body.get("ip_servidor", ""),
        "link_painel":     body.get("link_painel", ""),
        "plano":           body.get("plano", ""),
        "senha_inicial":   body.get("senha_inicial", ""),
        "obs_tecnicas":    body.get("obs_tecnicas", ""),
        "status_cliente":  body.get("status_cliente", "ativo"),
        "atualizado_em":   datetime.utcnow(),
    }
    if body.get("data_assinatura"):
        update["data_assinatura"] = datetime.fromisoformat(body["data_assinatura"])
    if body.get("data_renovacao"):
        update["data_renovacao"] = datetime.fromisoformat(body["data_renovacao"])

    result = col_clientes.update_one({"_id": ObjectId(cliente_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Cliente não encontrado")
    return {"ok": True}


@app.post("/clientes/{cliente_id}/nota")
def adicionar_nota(cliente_id: str, body: dict):
    nota = {
        "texto": body.get("texto", ""),
        "data":  datetime.utcnow().isoformat(),
    }
    col_clientes.update_one(
        {"_id": ObjectId(cliente_id)},
        {"$push": {"notas": nota}, "$set": {"atualizado_em": datetime.utcnow()}}
    )
    return {"ok": True}


@app.delete("/clientes/{cliente_id}")
def deletar_cliente(cliente_id: str):
    # Remove documento do disco se existir
    doc = col_clientes.find_one({"_id": ObjectId(cliente_id)})
    if doc and doc.get("documento_nome"):
        caminho = os.path.join(UPLOAD_DIR, doc["documento_nome"])
        if os.path.exists(caminho):
            os.remove(caminho)

    result = col_clientes.delete_one({"_id": ObjectId(cliente_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Cliente não encontrado")
    return {"ok": True}


@app.post("/clientes/{cliente_id}/documento")
async def upload_documento(cliente_id: str, arquivo: UploadFile = File(...)):
    # Valida tipo
    tipos_ok = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if arquivo.content_type not in tipos_ok:
        raise HTTPException(400, "Tipo de arquivo não permitido. Use PDF, PNG ou JPG.")

    ext = arquivo.filename.rsplit(".", 1)[-1]
    nome_arquivo = f"contrato_{cliente_id}.{ext}"
    caminho = os.path.join(UPLOAD_DIR, nome_arquivo)

    with open(caminho, "wb") as f:
        shutil.copyfileobj(arquivo.file, f)

    col_clientes.update_one(
        {"_id": ObjectId(cliente_id)},
        {"$set": {"documento_nome": nome_arquivo, "atualizado_em": datetime.utcnow()}}
    )
    return {"ok": True, "arquivo": nome_arquivo}


@app.get("/clientes/{cliente_id}/documento")
def download_documento(cliente_id: str):
    doc = col_clientes.find_one({"_id": ObjectId(cliente_id)})
    if not doc or not doc.get("documento_nome"):
        raise HTTPException(404, "Nenhum documento enviado para este cliente")

    caminho = os.path.join(UPLOAD_DIR, doc["documento_nome"])
    if not os.path.exists(caminho):
        raise HTTPException(404, "Arquivo não encontrado no servidor")

    return FileResponse(caminho, filename=doc["documento_nome"])


