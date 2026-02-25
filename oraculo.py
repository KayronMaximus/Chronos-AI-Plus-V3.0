import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import os
import json
from dotenv import load_dotenv
from google import genai  # Versão atualizada

# 1. Carregar variáveis de ambiente (Local)
load_dotenv()

# 2. Configuração do Gemini (Versão 2.0 Flash)
API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None

if not API_KEY:
    print("❌ Erro: GEMINI_API_KEY não encontrada.")
    exit()

# 3. Inicialização Inteligente do Firebase
# Tenta ler do GitHub Secrets primeiro, se não houver, usa o caminho local
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
    
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"❌ Falha crítica no Firebase: {e}")
    exit()

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
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt_ia
        )
        analise = response.text.strip()

        # Salva no Firestore na coleção de inteligência
        db.collection('inteligencia').document('cfo_status').set({
            'ultima_noticia': analise,
            'status': 'monitorando',
            'data_verificacao': firestore.SERVER_TIMESTAMP
        })
        
        # Cria um log histórico no 'oraculo_updates' (igual ao seu print)
        db.collection('oraculo_updates').add({
            'conteudo': analise,
            'data': firestore.SERVER_TIMESTAMP,
            'tipo': 'radar_estudos'
        })
        
        print(f"✅ Sucesso: {analise}")

    except Exception as e:
        print(f"⚠️ Erro durante a vigília: {e}")

# Execução
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