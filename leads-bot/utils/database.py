# utils/database.py

from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import MONGODB_URI, DATABASE_NAME, COLLECTION_NAME


class LeadsDatabase:
    def __init__(self):
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[DATABASE_NAME]
        self.collection = self.db[COLLECTION_NAME]
        self._create_indexes()

    def _create_indexes(self):
        """Cria índices para evitar duplicatas e acelerar buscas."""
        self.collection.create_index(
            [("nome", ASCENDING), ("telefone", ASCENDING)],
            unique=True,
            sparse=True
        )
        self.collection.create_index("categoria")
        self.collection.create_index("cidade")
        self.collection.create_index("criado_em")

    def salvar_lead(self, lead: dict) -> bool:
        """
        Salva um lead no banco. Retorna True se salvou, False se já existia.
        """
        lead["criado_em"] = datetime.utcnow()
        lead["status"] = lead.get("status", "novo")
        try:
            self.collection.insert_one(lead)
            return True
        except DuplicateKeyError:
            return False

    def buscar_leads(self, filtros: dict = None, limite: int = 100) -> list:
        """Retorna lista de leads com filtros opcionais."""
        query = filtros or {}
        cursor = self.collection.find(query).limit(limite).sort("criado_em", -1)
        leads = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            leads.append(doc)
        return leads

    def contar_leads(self, filtros: dict = None) -> int:
        return self.collection.count_documents(filtros or {})

    def lead_existe(self, nome: str, telefone: str) -> bool:
        return self.collection.find_one({"nome": nome, "telefone": telefone}) is not None

    def fechar(self):
        self.client.close()
