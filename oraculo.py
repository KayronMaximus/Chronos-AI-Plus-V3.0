import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import os
import json
from dotenv import load_dotenv
from google import genai  # Importação da biblioteca nova

# 1. Carregar variáveis de ambiente
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("❌ Erro: GEMINI_API_KEY não encontrada.")
    exit()

# 2. Configuração do Novo Cliente Gemini (O padrão correto agora)
client = genai.Client(api_key=API_KEY)

# 3. Inicialização Inteligente do Firebase
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
    
    # Evita erro se o app já estiver inicializado
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"❌ Falha crítica no Firebase: {e}")
    exit()

# Configuração do Novo Cliente Gemini
# O client deve ser criado usando a API_KEY que você pegou do ambiente
client = genai.Client(api_key=API_KEY)

def buscar_cfo_com_ia():
    print("🔎 Oráculo analisando o terreno (UEMA)...")
    url = "https://sigconcursos.uema.br/"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'}
    
    try:
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        texto_pagina = soup.get_text()

        # Prompt para o Gemini processar
        prompt_ia = f"Analise este texto da UEMA e diga se há editais abertos ou notícias de 2026 para o CFO (Oficiais PM/Bombeiros). Se não houver, diga apenas 'Sem novidades oficiais'. Texto: {texto_pagina[:4000]}"
        
        # --- BLOCO CORINGA DEFINITIVO (google-genai) ---
        # Não precisa mais de try/except para o modelo, esta biblioteca é mais estável
        response = client.models.generate_content(
            model="models/gemini-1.5-flash", 
            contents=prompt_ia
        )
        analise = response.text.strip()
        # -----------------------------------------------

        # Salva no Firestore
        db.collection('inteligencia').document('cfo_status').set({
            'ultima_noticia': analise,
            'status': 'monitorando',
            'data_verificacao': firestore.SERVER_TIMESTAMP
        })
        
        db.collection('oraculo_updates').add({
            'conteudo': analise,
            'data': firestore.SERVER_TIMESTAMP,
            'tipo': 'radar_estudos'
        })
        
        print(f"✅ Sucesso: {analise}")

    except Exception as e:
        print(f"⚠️ Erro durante a vigília: {e}")

if __name__ == "__main__":
    buscar_cfo_com_ia()
# No oraculo.py
def gerar_relatorio_financeiro():
    print("📊 Calculando os tesouros do Reino...")
    gastos_ref = db.collection("financas").stream()
    total = 0
    
    for gasto in gastos_ref:
        dados = gasto.to_dict()
        total += dados.get("valor", 0)
    
    print(f"💰 Total gasto até agora: R$ {total:.2f}")
    if total > 100: # Exemplo de limite
        print("⚠️ Alerta: Os gastos estão elevados para este ciclo!")

# Chame a função no final do script
gerar_relatorio_financeiro()