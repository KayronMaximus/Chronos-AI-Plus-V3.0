import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import os
import json
from dotenv import load_dotenv
from google import genai
import time

# 1. Configurações Iniciais
load_dotenv()
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={'api_version': 'v1'} # Isso força o Google a achar o modelo
)

# Inicialização do Firebase
firebase_env = os.getenv("FIREBASE_CREDENTIALS")
try:
    if firebase_env:
        cred = credentials.Certificate(json.loads(firebase_env))
    else:
        cred = credentials.Certificate(r"C:\Users\Samsung\Projetos\ai-plus-defce-firebase-adminsdk-fbsvc-b58bfb19c9.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"❌ Erro Firebase: {e}"); exit()

# --- 2. Função de Notificação (Seu Bot do Telegram) ---
def enviar_telegram(mensagem):
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id: return
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": mensagem, "parse_mode": "Markdown"}
    try:
        requests.post(url, data=payload, timeout=10)
        print("📲 Notificação enviada ao Telegram!")
    except Exception as e:
        print(f"❌ Erro Telegram: {e}")

# --- 3. Vigília UEMA (Com IA - Precisa de Análise) ---
def buscar_cfo_uema():
    print("🔎 Analisando UEMA com IA (Modelo Lite)...")
    url = "https://sigconcursos.uema.br/"
    try:
        r = requests.get(url, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        texto = soup.get_text()[:1000]

        # MUDANÇA AQUI: Usando o nome exato que apareceu no seu log
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite", 
            contents=f"Diga se há editais de 2026 para CFO PM/Bombeiros neste texto. Texto: {texto}"
        )
        analise = response.text.strip()
        print(f"✅ UEMA: {analise}")
        
        if "Sem novidades" not in analise:
            enviar_telegram(f"🔔 *ALERTA UEMA:* {analise}")
    except Exception as e:
        print(f"⚠️ Erro UEMA: {e}")

# --- 4. Radar Flamengo (Sem IA - Rápido e Infalível) ---
def radar_flamengo():
    print("⚽ Buscando Flamengo (Modo Pro)...")
    url = "https://ge.globo.com/futebol/times/flamengo/"
    try:
        r = requests.get(url, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 1. Pega manchetes
        manchetes = soup.select('.feed-post-link')[:3]
        
        # 2. Tenta pegar informações de próximo jogo (se disponível no topo)
        proximo_jogo = soup.select_one('.lista-jogos__jogo')
        info_jogo = ""
        if proximo_jogo:
            info_jogo = "📅 *PRÓXIMO CONFRONTO:* " + proximo_jogo.get_text(separator=" ").strip() + "\n\n"

        aviso = f"🔴⚫ *RADAR DO MENGÃO* 🔴⚫\n\n{info_jogo}🗞️ *DESTAQUES:*\n"
        
        for m in manchetes:
            titulo = m.get_text().strip()
            link = m.get('href')
            aviso += f"• {titulo}\n[Ler mais]({link})\n\n"
        
        enviar_telegram(aviso)
        
    except Exception as e:
        print(f"⚠️ Erro no Radar Flamengo: {e}")

# --- 5. Finanças ---
def relatorio_financeiro():
    gastos_ref = db.collection("financas").stream()
    total = sum(gasto.to_dict().get("valor", 0) for gasto in gastos_ref)
    print(f"💰 Total gasto: R$ {total:.2f}")

# --- EXECUÇÃO DE DIAGNÓSTICO ---
if __name__ == "__main__":
    radar_flamengo()      # Notificação do Mengão
    print("⏳ Pausa de 10s...")
    time.sleep(10)
    buscar_cfo_uema()     # Notificação da UEMA com o modelo Lite
    relatorio_financeiro() # Relatório financeiro (sem IA)