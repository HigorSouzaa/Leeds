# bot/maps_scraper.py

import random
import sys
import os
import unicodedata
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import MIN_DELAY, MAX_DELAY, MAX_RESULTS
from utils.human_behavior import (
    delay, human_type, human_scroll, jitter_click, move_mouse_randomly
)
from utils.database import LeadsDatabase


# User agents reais de navegadores comuns
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
]


def criar_browser(playwright):
    """Cria browser com configurações anti-detecção."""
    user_agent = random.choice(USER_AGENTS)

    browser = playwright.chromium.launch(
        headless=False,  # False = mais difícil de detectar
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--disable-infobars",
            "--window-size=1366,768",
        ]
    )

    context = browser.new_context(
        user_agent=user_agent,
        viewport={"width": 1366, "height": 768},
        locale="pt-BR",
        timezone_id="America/Sao_Paulo",
        permissions=["geolocation"],
        java_script_enabled=True,
    )

    # Remove sinais de automação
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
        window.chrome = { runtime: {} };
    """)

    return browser, context


def extrair_telefone(page) -> str:
    """Tenta extrair telefone do painel lateral."""
    seletores = [
        'button[data-item-id*="phone"]',
        'button[aria-label*="Ligue"]',
        'button[aria-label*="phone"]',
        '[data-tooltip*="Copiar número de telefone"]',
    ]
    for seletor in seletores:
        try:
            el = page.query_selector(seletor)
            if el:
                texto = el.get_attribute("aria-label") or el.inner_text()
                # Limpa e retorna só os números/formato
                import re
                nums = re.findall(r'[\d\s\(\)\-\+]+', texto)
                if nums:
                    return nums[0].strip()
        except Exception:
            continue
    return ""


def extrair_site(page) -> str:
    """Tenta extrair link do site do estabelecimento."""
    seletores = [
        'a[data-item-id*="authority"]',
        'a[aria-label*="Site"]',
        'a[aria-label*="site"]',
        'a[href*="http"]:not([href*="google"])',
    ]
    
    redes_sociais = ["instagram.com", "facebook.com", "linktr.ee", "wa.me", "whatsapp.com", "youtube.com", "tiktok.com"]
    
    for seletor in seletores:
        try:
            el = page.query_selector(seletor)
            if el:
                href = el.get_attribute("href")
                if href and "google" not in href:
                    # Ignorar redes sociais
                    is_social = any(rede in href.lower() for rede in redes_sociais)
                    if not is_social:
                        return href
        except Exception:
            continue
    return ""


def extrair_nome(page) -> str:
    """Extrai o nome do estabelecimento."""
    try:
        el = page.query_selector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')
        if el:
            return el.inner_text().strip()
    except Exception:
        pass
    return ""


def extrair_endereco(page) -> str:
    """Tenta extrair o endereço do estabelecimento."""
    seletores = [
        'button[data-item-id="address"]',
        'button[aria-label*="Endereço"]',
        'button[aria-label*="address"]',
    ]
    for seletor in seletores:
        try:
            el = page.query_selector(seletor)
            if el:
                texto = el.get_attribute("aria-label") or el.inner_text()
                if texto:
                    texto = texto.replace("Endereço: ", "").replace("Endereço ", "").strip()
                    # Remove quebras de linha
                    return " ".join(texto.splitlines())
        except Exception:
            continue
    return ""


def normalize_text(text: str) -> str:
    """Normaliza o texto removendo acentos e passando para minúsculas."""
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn').lower()


def extrair_cidade_do_endereco(endereco: str) -> str:
    """Extrai o nome da cidade a partir do endereço formatado do Google Maps."""
    import re
    if not endereco:
        return ""
    # Ex: "Av. Brasil, 100 - Centro, Campinas - SP, 13000-000"
    match = re.search(r'([a-zA-ZÀ-ÿ\s]+)\s*-\s*[A-Z]{2}(?:,|\s*$|\s*\d)', endereco)
    if match:
        cidade = match.group(1).strip()
        if ',' in cidade:
            cidade = cidade.split(',')[-1].strip()
        return cidade
    return ""


def buscar_leads(termo: str, cidade: str = "", max_resultados: int = MAX_RESULTS):
    """
    Função principal: busca leads no Google Maps.
    
    Args:
        termo: O que buscar (ex: "chácara", "salão de beleza")
        cidade: Cidade opcional (ex: "São Paulo")
        max_resultados: Quantos leads coletar
    
    Returns:
        Lista de leads encontrados
    """
    db = LeadsDatabase()
    leads_coletados = []
    query = f"{termo} {cidade}".strip()

    print(f"\n🔍 Iniciando busca: '{query}'")
    print(f"📊 Meta: {max_resultados} leads\n")

    with sync_playwright() as playwright:
        browser, context = criar_browser(playwright)
        page = context.new_page()

        try:
            # 1. Abre o Google Maps pesquisando diretamente na URL
            print("🌐 Abrindo Google Maps na região...")
            # Isso força o Maps a centralizar na busca
            url_busca = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
            page.goto(url_busca, wait_until="networkidle")
            delay(2, 4)

            # 2. Aceita cookies se aparecer
            try:
                btn_aceitar = page.query_selector('button:has-text("Aceitar"), button:has-text("Concordo"), button:has-text("Aceito")')
                if btn_aceitar:
                    jitter_click(page, btn_aceitar)
                    delay(1, 2)
            except Exception:
                pass

            # 4. Aguarda resultados e mapeia os links
            print("⏳ Aguardando resultados e mapeando links (isso evita que o bot se perca)...")
            page.wait_for_selector('div[role="feed"]', timeout=15000)
            delay(2, 3)

            links_coletados = []
            tentativas_sem_novo = 0
            
            while len(links_coletados) < max_resultados and tentativas_sem_novo < 5:
                cards = page.query_selector_all('a.hfpxzc')
                novos = 0
                for card in cards:
                    try:
                        href = card.get_attribute("href")
                        if href and href not in links_coletados:
                            links_coletados.append(href)
                            novos += 1
                            if len(links_coletados) >= max_resultados:
                                break
                    except Exception:
                        pass
                
                print(f"📊 Links mapeados até agora: {len(links_coletados)}")
                
                if novos == 0:
                    tentativas_sem_novo += 1
                else:
                    tentativas_sem_novo = 0

                if len(links_coletados) < max_resultados:
                    feed = page.query_selector('div[role="feed"]')
                    if feed:
                        try:
                            if cards:
                                cards[-1].scroll_into_view_if_needed()
                            feed.evaluate("el => el.scrollBy(0, 800)")
                        except:
                            pass
                    human_scroll(page, times=random.randint(2, 4))
                    delay(2, 4)

            print(f"\n✅ Total de locais encontrados na busca: {len(links_coletados)}")
            
            # 5. Visita cada link mapeado para extrair dados com segurança
            for index, url in enumerate(links_coletados):
                print(f"\n➡️ Extraindo {index+1}/{len(links_coletados)}...")
                try:
                    page.goto(url, wait_until="domcontentloaded")
                    delay(MIN_DELAY, MAX_DELAY)
                    
                    try:
                        page.wait_for_selector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]', timeout=10000)
                    except PlaywrightTimeout:
                        # Pode ser que não tenha nome h1 se a url carregou mal
                        pass
                    
                    nome = extrair_nome(page)
                    telefone = extrair_telefone(page)
                    site = extrair_site(page)
                    endereco = extrair_endereco(page)
                    
                    if not nome:
                        print("⚠️  Nome não encontrado, pulando...")
                        continue
                        
                    # Descobre a cidade pelo endereço se o usuário não digitou, ou usa a do usuário
                    cidade_extraida = extrair_cidade_do_endereco(endereco)
                    cidade_final = cidade if cidade else cidade_extraida
                        
                    # Filtro de cidade (se o usuário informou uma cidade)
                    if cidade:
                        cidade_norm = normalize_text(cidade)
                        endereco_norm = normalize_text(endereco)
                        nome_norm = normalize_text(nome)
                        if cidade_norm not in endereco_norm and cidade_norm not in nome_norm:
                            print(f"⏭️  Pulando (cidade diferente): {nome} | {endereco}")
                            continue

                    lead = {
                        "nome": nome,
                        "telefone": telefone,
                        "site": site,
                        "endereco": endereco,
                        "categoria": termo,
                        "cidade": cidade_final,
                        "query": query,
                    }

                    # Salva no banco
                    salvo = db.salvar_lead(lead)
                    status = "✅ Salvo" if salvo else "⏭️  Duplicado"

                    print(f"{status} | {nome} | {telefone or 'sem tel'} | {endereco or 'sem end'}")

                    if salvo:
                        leads_coletados.append(lead)

                except PlaywrightTimeout:
                    print("⚠️  Timeout ao carregar local, pulando...")
                    continue
                except Exception as e:
                    print(f"⚠️  Erro ao processar local: {e}")
                    continue

        except Exception as e:
            print(f"\n❌ Erro geral: {e}")
        finally:
            browser.close()
            db.fechar()

    total = len(leads_coletados)
    print(f"\n{'='*50}")
    print(f"✅ Busca finalizada!")
    print(f"📦 Leads salvos: {total}")
    print(f"{'='*50}\n")

    return leads_coletados
