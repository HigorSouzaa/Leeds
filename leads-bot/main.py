# main.py - Ponto de entrada do bot de leads

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from bot.maps_scraper import buscar_leads
from config.settings import MAX_RESULTS


def menu():
    print("\n" + "="*50)
    print("🤖  BOT DE LEADS - GOOGLE MAPS")
    print("="*50)
    print("Digite os dados da busca:\n")

    termo = input("🔍 O que buscar? (ex: chácara, salão de beleza): ").strip()
    if not termo:
        print("❌ Termo não pode ser vazio.")
        return

    cidade = input("📍 Cidade/Estado (opcional, ex: São Paulo SP): ").strip()

    try:
        qtd = input(f"📊 Quantos leads? (padrão: {MAX_RESULTS}): ").strip()
        qtd = int(qtd) if qtd else MAX_RESULTS
    except ValueError:
        qtd = MAX_RESULTS

    print(f"\n⚙️  Configuração:")
    print(f"   Busca  : {termo}")
    print(f"   Cidade : {cidade or 'não informada'}")
    print(f"   Meta   : {qtd} leads")

    confirma = input("\n▶️  Iniciar? (s/n): ").strip().lower()
    if confirma != "s":
        print("Cancelado.")
        return

    buscar_leads(termo=termo, cidade=cidade, max_resultados=qtd)


if __name__ == "__main__":
    menu()
