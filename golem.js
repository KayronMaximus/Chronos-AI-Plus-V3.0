const admin = require("firebase-admin");

// Configuração via GitHub Secrets
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function despertar() {
  console.log("🤖 Golem despertou! Analisando cronograma e sensores...");

  // 1. Lógica de Horário (Brasília UTC-3)
  const agora = new Date();
  const horaBR = agora.getUTCHours() - 3;

  let tituloNotif = "🛡️ Chamado de Chronos";
  let corpoNotif = "Acesse o sistema para verificar suas missões!";

  // Manhã: Foco em Exercícios (Solo Leveling)
  if (horaBR >= 5 && horaBR <= 11) {
    tituloNotif = "🏋️ Solo Leveling: Missão Diária";
    corpoNotif = "Hora do treino! Registre seus exercícios para subir de nível.";
  } 
  // Noite: Foco em Finanças
  else if (horaBR >= 18 || horaBR <= 1) {
    tituloNotif = "💰 Relatório de Recursos";
    corpoNotif = "Não esqueça de atualizar suas finanças antes de encerrar o dia.";
  }

  // 2. Busca de Tokens com Visão de Raio-X
  const tokensSnapshot = await db.collectionGroup("tokens").get();
  
  if (tokensSnapshot.empty) {
    console.log("❌ Nenhum token encontrado no banco.");
    return;
  }

  // Remove duplicatas
  const tokensList = [...new Set(tokensSnapshot.docs
    .map(doc => doc.data().token)
    .filter(token => token))];

  console.log(`✅ ${tokensList.length} dispositivos prontos para o chamado.`);

  // 3. Envio Individual (Modo Sniper)
  let sucessos = 0;
  for (const tokenAlvo of tokensList) {
    const mensagem = {
      notification: { title: tituloNotif, body: corpoNotif },
      token: tokenAlvo
    };

    try {
      await admin.messaging().send(mensagem);
      console.log(`📨 Enviado para: ${tokenAlvo.substring(0, 10)}...`);
      sucessos++;
    } catch (erro) {
      console.error(`⚠️ Falha no token ${tokenAlvo.substring(0, 10)}...`);
    }
  }
  console.log(`🏁 Finalizado: ${sucessos} mensagens enviadas.`);
}

despertar();