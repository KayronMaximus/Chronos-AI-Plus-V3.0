import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("❌ Erro: GEMINI_API_KEY em falta no .env")
    exit()

# Use o arquivo JSON que você baixou do Firebase
caminho_da_chave = (r"C:\Users\Samsung\Projetos\ai-plus-defce-firebase-adminsdk-fbsvc-b58bfb19c9.json")
cred = credentials.Certificate(r"C:\Users\Samsung\Projetos\ai-plus-defce-firebase-adminsdk-fbsvc-b58bfb19c9.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def buscar_cfo_com_ia():
    print("🧠 Oráculo usando inteligência para analisar editais...")
    
    url = "https://sigconcursos.uema.br/" 
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        r = requests.get(url, headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Pegamos todo o texto relevante da página principal de concursos
        #texto_pagina = soup.get_text()
        # Em vez de pegar o texto real do site, force um texto de teste:
        texto_pagina = "URGENTE: Edital CFO PMMA 2026 publicado! Inscrições abertas de 01 a 20 de março."

        # --- INTEGRAÇÃO COM GEMINI ---
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Analise o seguinte texto extraído do site de concursos da UEMA:
        {texto_pagina[:5000]} 
        
        Pergunta: Existe alguma informação nova, edital aberto ou mudança de data 
        especificamente para o CFO (Curso de Formação de Oficiais) da PM ou Bombeiros para 2026?
        Responda de forma curta e direta para um sistema de alerta.
        """
        
        response = model.generate_content(prompt)
        analise_ia = response.text.strip()

        # Salva a análise inteligente no Firestore
        db.collection('inteligencia').document('cfo_status').set({
            'analise_ia': analise_ia,
            'status': 'processado_por_ia',
            'data_verificacao': firestore.SERVER_TIMESTAMP
        })
        
        print(f"🤖 Resumo da IA: {analise_ia}")
        
    except Exception as e:
        print(f"❌ Erro na análise da IA: {e}")

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