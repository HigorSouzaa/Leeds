# api/main.py - API FastAPI para o painel de leads

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from datetime import datetime
from typing import Optional
import os

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
