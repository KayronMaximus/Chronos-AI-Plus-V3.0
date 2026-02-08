import firebase_admin
from firebase_admin import credentials, firestore
import pypdf
import asyncio
import requests
import json
from telegram import Bot
import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

# Substitua as linhas antigas por estas:
API_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

if not API_KEY:
    print("❌ Erro: Variável GEMINI_API_KEY não encontrada no ambiente!")
    if not all([API_KEY, BOT_TOKEN, CHAT_ID]):
    print("❌ Erro: Uma ou mais chaves não foram encontradas no arquivo .env!")
    exit()
# --- CONFIGURAÇÕES ---
# 1. Firebase
cred = credentials.Certificate("chave.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

async def consagrar_saber(caminho_pdf, uid_usuario, categoria):
    print(f"📖 Lendo documento: {caminho_pdf}...")
    
    # EXTRAÇÃO DE TEXTO
    texto_pdf = ""
    try:
        with open(caminho_pdf, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages[:15]: 
                texto_pdf += page.extract_text()
    except Exception as e:
        print(f"❌ Erro ao ler PDF: {e}")
        return

    # UPLOAD PARA TELEGRAM
    print("📤 Enviando para o Cofre do Telegram...")
    from telegram.request import HTTPXRequest
    request_config = HTTPXRequest(connect_timeout=60, read_timeout=600)
    bot = Bot(token=TELEGRAM_BOT_TOKEN, request=request_config)
    
    try:
        with open(caminho_pdf, 'rb') as f:
            msg = await bot.send_document(chat_id=CHAT_ID, document=f)
        canal_id_formatado = str(CHAT_ID).replace("-100", "").replace("-", "")
        link_arquivo = f"https://t.me/c/{canal_id_formatado}/{msg.message_id}"
    except Exception as e:
        print(f"⚠️ Erro no Telegram: {e}")
        link_arquivo = "Link indisponível"

    # RESUMO COM IA (Gemini 2.5 Flash)
    print("🧠 Oráculo processando resumo com Gemini 2.5 Flash...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{
                "text": f"Você é o Oráculo do sistema Chronos. Resuma este conteúdo para um estudante de {categoria}. Use bullet points e foco total em aprendizado: {texto_pdf[:8000]}"
            }]
        }]
    }
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        res_data = response.json()
        resumo = res_data['candidates'][0]['content']['parts'][0]['text']
        print("✨ Oráculo consagrou o saber!")
    except Exception as e:
        print(f"❌ Erro na IA: {e}")
        resumo = "Resumo indisponível no momento."

    # SALVAR NO FIREBASE
    print("🔥 Gravando no Firestore...")
    doc_ref = db.collection("grimorio").add({
        "uid": uid_usuario,
        "titulo": caminho_pdf.split("/")[-1].replace(".pdf", ""),
        "resumo_ia": resumo,
        "link_arquivo": link_arquivo,
        "categoria": categoria,
        "data_criacao": firestore.SERVER_TIMESTAMP
    })
    # Adicione isso logo antes do "print(✅ SUCESSO...)"
    print(f"🔗 LINK PARA O GRIMÓRIO: {link_arquivo}")

    print(f"✅ PROCESSO CONCLUÍDO! ID: {doc_ref[1].id}")

# --- EXECUÇÃO ---
if __name__ == "__main__":
    pdf_teste = "APOSTILA PM.pdf" 
    meu_uid = "11oAPXSuCRgRUMplk9HUEyitmx22"
    asyncio.run(consagrar_saber(pdf_teste, meu_uid, "CFO"))