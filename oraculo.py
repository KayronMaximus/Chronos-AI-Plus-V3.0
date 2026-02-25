import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import os
import json
from dotenv import load_dotenv
from google import genai
import time

# 1. Carregar variáveis de ambiente
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("❌ Erro: GEMINI_API_KEY não encontrada.")
    exit()

# 2. Configuração do Cliente Gemini (Apenas UMA vez)
client = genai.Client(api_key=API_KEY)

# 3. Inicialização do Firebase
firebase_env = os.getenv("FIREBASE_CREDENTIALS")

try:
    if firebase_env:
        print("☁️ Oráculo operando via GitHub Actions...")
        cred_dict = json.loads(firebase_env)
        cred = credentials.Certificate(cred_dict)
    else:
        print("💻 Oráculo operando via PC Local...")
        caminho_local = r"C:\Users\Samsung\Projetos\ai-plus-defce-firebase-adminsdk-fbsvc-b58bfb19c9.json"
        cred = credentials.Certificate(caminho_local)
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"❌ Falha crítica no Firebase: {e}")
    exit()

# --- FUNÇÕES DE APOIO ---

def enviar_telegram(mensagem):
    """Envia uma notificação em tempo real via Telegram."""
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        print("⚠️ Erro: TELEGRAM_TOKEN ou CHAT_ID não configurados.")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": mensagem, "parse_mode": "Markdown"}
    
    try:
        requests.post(url, data=payload, timeout=10)
        print("📲 Notificação enviada ao Telegram!")
    except Exception as e:
        print(f"❌ Erro ao conectar com o Telegram: {e}")

# --- FUNÇÕES PRINCIPAIS ---

def buscar_cfo_com_ia():
    print("🔎 Oráculo analisando o terreno (UEMA)...")
    url = "https://sigconcursos.uema.br/"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'}
    
    try:
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        texto_pagina = soup.get_text()

        prompt_ia = f"Analise este texto da UEMA e diga se há editais abertos ou notícias de 2026 para o CFO. Se não houver, diga apenas 'Sem novidades oficiais'. Texto: {texto_pagina[:1500]}"
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt_ia)
        analise = response.text.strip()

        # Salva no Firestore
        db.collection('inteligencia').document('cfo_status').set({
            'ultima_noticia': analise,
            'status': 'monitorando',
            'data_verificacao': firestore.SERVER_TIMESTAMP
        })
        
        print(f"✅ UEMA: {analise}")
        
        # Opcional: Avisar no Telegram se houver novidade real
        if "Sem novidades" not in analise:
             enviar_telegram(f"🔔 *NOVIDADE UEMA:* {analise}")

    except Exception as e:
        print(f"⚠️ Erro na vigília UEMA: {e}")

def monitorar_flamengo():
    print("⚽ Oráculo de olho no CRF (Flamengo)...")
    url_fla = "https://ge.globo.com/futebol/times/flamengo/"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'}
    
    try:
        r = requests.get(url_fla, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        texto_noticias = soup.get_text()
        
        prompt_fla = (
            "Com base no texto, identifique o PRÓXIMO JOGO do Flamengo. "
            "Informe: Adversário, Data, Horário e Campeonato. "
            f"Texto: {texto_noticias[:1500]}"
        )
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt_fla)
        info_jogo = response.text.strip()
        
        enviar_telegram(f"🔴⚫ *RADAR DO MENGÃO* 🔴⚫\n\n{info_jogo}")
        print("✅ Flamengo: Informação enviada.")

    except Exception as e:
        print(f"⚠️ Erro na vigília Flamengo: {e}")

def gerar_relatorio_financeiro():
    print("📊 Calculando os tesouros do Reino...")
    try:
        gastos_ref = db.collection("financas").stream()
        total = sum(gasto.to_dict().get("valor", 0) for gasto in gastos_ref)
        
        print(f"💰 Total gasto: R$ {total:.2f}")
        if total > 100:
            print("⚠️ Alerta: Gastos elevados!")
    except Exception as e:
        print(f"❌ Erro nas finanças: {e}")

# --- EXECUÇÃO FINAL ---

if __name__ == "__main__":
    buscar_cfo_com_ia()
    print("⏳ Aguardando 15s para não estourar a cota...")
    time.sleep(15) 
    monitorar_flamengo()
    gerar_relatorio_financeiro()