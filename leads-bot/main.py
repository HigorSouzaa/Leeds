# main.py - Ponto de entrada do bot de leads

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from bot.maps_scraper import buscar_leads
from config.settings import MAX_RESULTS


def run_bot(termo, cidade, qtd):
    if cidade:
        zonas = ["", "Centro", "Zona Sul", "Zona Norte", "Zona Leste", "Zona Oeste"]
        total_coletados = 0
        print(f"\n🗺️  Busca Inteligente ativada para '{cidade}'!")
        print("O bot fará varreduras por regiões para encontrar o máximo de locais possíveis.")
        
        for zona in zonas:
            if total_coletados >= qtd:
                print(f"\n🎯 Meta de {qtd} leads atingida!")
                break
                
            termo_busca = f"{termo} {zona}".strip()
            restante = qtd - total_coletados
            
            print(f"\n{'='*50}")
            print(f"📍 Mapeando região: {zona if zona else 'Geral (Cidade Inteira)'}")
            print(f"📊 Faltam: {restante} leads")
            print(f"{'='*50}")
            
            leads_da_zona = buscar_leads(termo=termo_busca, cidade=cidade, max_resultados=restante)
            total_coletados += len(leads_da_zona)
            
        print(f"\n{'='*50}")
        print(f"✅ Busca Multi-Regiões finalizada para {cidade}!")
        print(f"📦 Total de leads novos salvos: {total_coletados}")
        print(f"{'='*50}\n")
    else:
        buscar_leads(termo=termo, cidade=cidade, max_resultados=qtd)


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

    run_bot(termo, cidade, qtd)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        termo_arg = sys.argv[1]
        cidade_arg = sys.argv[2] if len(sys.argv) > 2 else ""
        try:
            qtd_arg = int(sys.argv[3]) if len(sys.argv) > 3 else MAX_RESULTS
        except ValueError:
            qtd_arg = MAX_RESULTS
        run_bot(termo_arg, cidade_arg, qtd_arg)
    else:
        menu()
