import firebase_admin
from firebase_admin import credentials, firestore
import requests
from bs4 import BeautifulSoup

# Use o arquivo JSON que você baixou do Firebase
caminho_da_chave = (r"C:\Users\Samsung\Projetos\ai-plus-defce-firebase-adminsdk-fbsvc-b58bfb19c9.json")
cred = credentials.Certificate(r"C:\Users\Samsung\Projetos\ai-plus-defce-firebase-adminsdk-fbsvc-b58bfb19c9.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def buscar_cfo():
    print("🔎 Oráculo buscando atualizações sobre o CFO Maranhão...")
    # URL de busca focada em editais/notícias de concursos
    url = "https://www.google.com/search?q=concurso+cfo+bombeiros+maranhao+2026"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        r = requests.get(url, headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')
        # Pega o primeiro link relevante
        noticia = soup.find('h3').get_text() if soup.find('h3') else "Nenhuma novidade hoje."
        
        # Salva na coleção de inteligência
        db.collection('inteligencia').document('cfo_status').set({
            'ultima_noticia': noticia,
            'status': 'monitorando',
            'alerta': True
        })
        print(f"✅ Oráculo atualizado: {noticia}")
    except Exception as e:
        print(f"❌ Falha na visão do Oráculo: {e}")

buscar_cfo()
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