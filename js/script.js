// ============================================================================
// IMPORTAÇÕES DO FIREBASE (MODULAR)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  where,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDIDCJwHt5xf-2JRsYu8pxe9YI4obfvWqU",
  authDomain: "ai-plus-defce.firebaseapp.com",
  projectId: "ai-plus-defce",
  storageBucket: "ai-plus-defce.firebasestorage.app",
  messagingSenderId: "487321331111",
  appId: "1:487321331111:web:28f39eced2604c02110282",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
ativarSincronizacaoNuvem();

// ============================================================================
// FUNÇÕES DE SERVIÇO (NOTIFICAÇÕES E DB)
// ============================================================================

async function salvarTokenNoFirestore(userId, token) {
  try {
    // FORÇAMOS o uso do ID do Administrador para o Oráculo te achar
    const adminId = "CHRONOS_ADMIN";

    // Criamos a referência direta para a coleção de tokens do Admin
    const tokenRef = doc(db, `users/${adminId}/tokens`, token);

    await setDoc(tokenRef, {
      token: token,
      originalUserId: userId, // Guardamos o ID anônimo apenas por registro
      createdAt: new Date(),
      userAgent: navigator.userAgent,
      lastActive: new Date(),
    });

    console.log("✅ Token vinculado ao canal CHRONOS_ADMIN:", adminId);
  } catch (e) {
    console.error("❌ Erro ao salvar no Firestore:", e);
  }
}

// Função para ativar as notificações e capturar o Token
async function ativarNotificacoesPush() {
  try {
    // 1. Verificação de suporte
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Ambiente não suporta Push nativo.");
      return;
    }

    // 2. Permissão
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.error("Permissão negada.");
      return;
    }

    // 3. REGISTRO CORRIGIDO (RAIZ ABSOLUTA)
    // Removemos o '.' e deixamos apenas o '/' para indicar a raiz do domínio
    const registration = await navigator.serviceWorker.register(
      "./firebase-messaging-sw.js",
      {
        scope: "./",
      },
    );
    await registration.update();
    // 4. GARANTIA DE ATIVAÇÃO (O Android precisa disso)
    // Às vezes o SW registra mas não "ativa" a tempo do token ser gerado
    await navigator.serviceWorker.ready;

    // 5. Pedir o Token vinculado ao registro ativo
    const token = await getToken(messaging, {
      vapidKey:
        "BNVhXVKUWVQaX3N8r9s9MBMJZL7NgH4ClYuYFn-Tf9dvjTnjOgcl2bcxyxbaIFRInt3ADyJj0a_npzzupZtAi8o",
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("⚡ Token FCM obtido:", token);
      localStorage.setItem("fcm_token", token);

      // Salva no administrador (CHRONOS_ADMIN)
      const userId = auth.currentUser
        ? auth.currentUser.uid
        : localStorage.getItem("anon_device_id") || "anon_" + Date.now();
      await salvarTokenNoFirestore(userId, token);
    }
  } catch (err) {
    console.error("Erro na ativação do rádio:", err);
  }
}
/*async function ativarNotificacoesPush() {
  try {
    // 1. Permissão
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.error("Permissão de notificação negada.");
      return;
    }

    // 2. Registrar SW
    const registration = await navigator.serviceWorker.register(
      "./firebase-messaging-sw.js", // Garanta que este caminho está correto na raiz
      { scope: "./" },
    );
    console.log(
      "SW registrado. Estado:",
      registration.active ? "ativo" : "instalando...",
    );

    // 3. Esperar o SW ficar ACTIVE (Crítico para evitar erros de race condition)
    let activeRegistration = registration;
    if (!registration.active) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (registration.active) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    }

    // 4. Pedir o Token
    const token = await getToken(messaging, {
      vapidKey:
        "BNVhXVKUWVQaX3N8r9s9MBMJZL7NgH4ClYuYFn-Tf9dvjTnjOgcl2bcxyxbaIFRInt3ADyJj0a_npzzupZtAi8o",
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("⚡ Token FCM obtido:", token);
      localStorage.setItem("fcm_token", token);

      try {
        // --- AUTOMAÇÃO DA SALVAÇÃO ---
        if (auth.currentUser) {
          await salvarTokenNoFirestore(auth.currentUser.uid, token);
          console.log("✅ Token vinculado ao usuário logado.");
        } else {
          let anonId = localStorage.getItem("anon_device_id");
          if (!anonId) {
            anonId = "anon_" + Date.now();
            localStorage.setItem("anon_device_id", anonId);
          }
          await salvarTokenNoFirestore(anonId, token);
          console.log("👤 Token vinculado ao ID anônimo:", anonId);
        }
      } catch (dbError) {
        console.error("❌ Falha ao salvar no Firestore:", dbError);
      }
    }
    // Fechamento correto do bloco principal
  } catch (err) {
    console.error("Erro geral ao obter token FCM:", err);
  }
}*/
// Escutar mensagens com o app aberto (Foreground)
onMessage(messaging, (payload) => {
  console.log("Mensagem recebida (foreground):", payload);

  // Usa o ZeusNotificador para mostrar na tela
  if (window.ZeusNotificador) {
    window.ZeusNotificador.enviar(
      payload.notification.title,
      payload.notification.body,
      "🛡️",
    );
  } else {
    // Fallback
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
    });
  }
});

// Login Google (Exemplo)
async function login() {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Logado:", result.user.uid);
    // Ao logar, tenta salvar o token se já existir
    const token = localStorage.getItem("fcm_token");
    if (token) {
      await salvarTokenNoFirestore(result.user.uid, token);
    }
  } catch (err) {
    console.error("Erro login:", err);
  }
}

// ============================================================================
// 1. ESTADO GLOBAL & CONSTANTES
// ============================================================================
let tarefas = JSON.parse(localStorage.getItem("chronos_tarefas")) || [];
let transacoes = JSON.parse(localStorage.getItem("chronos_financas")) || [];
let historicoIA = JSON.parse(localStorage.getItem("chronos_ia")) || [];
let streak = JSON.parse(localStorage.getItem("chronos_streak")) || 0;
let chartTarefas, chartFinancas, chartHome, chartPizza;

// Configurações do Google Calendar
const CLIENT_ID =
  "487321331111-uom6ic8em166f8rauv3arq59js9fn5lu.apps.googleusercontent.com";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/calendar.events";
let tokenClient;

// Variáveis de Controle de Agendamento
let tarefaParaAgendarId = null;
let tarefaParaAgendarTitulo = null;

// ============================================================================
// 2. FUNÇÕES AUXILIARES (CORE)
// ============================================================================

function sincronizarNomeSplash() {
  const nomeSalvo = localStorage.getItem("chronos_user_name") || "CHRONOS";
  const tituloSplash = document.getElementById("titulo-ia-splash");
  if (tituloSplash) {
    tituloSplash.innerHTML = `${nomeSalvo.toUpperCase()} <span class="blink">AI</span>`;
  }
}

function getNomeUsuario() {
  return localStorage.getItem("chronos_user_name") || "Chronos";
}

// Inicialização do App
document.addEventListener("DOMContentLoaded", () => {
  sincronizarNomeSplash();
  carregarData();
  renderizarTarefas();
  renderizarFinancas();
  atualizarDashboard();
  iniciarRelogio();

  // INICIA O SISTEMA RPG
  carregarSistema();

  mostrarSecao("home");

  // INICIALIZAÇÕES DO ZEUS
  if (window.ZeusNotificador) window.ZeusNotificador.solicitarPermissao();
  configurarZeusVigilia();
  ativarNotificacoesPush();

  // INICIA O MONITORAMENTO DE MISSÕES (LEMBRETES)
  setInterval(verificarCronogramaDeMissoes, 60000); // Checa a cada 1 minuto

  // Service Worker Fallback
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(() => console.log("SW Ready (Main)"));
  }

  // Splash Screen Timer
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("hide-splash");
    }
  }, 3000);
});

function carregarData() {
  const dataHome = document.getElementById("data-atual-home");
  const hoje = new Date();
  const opcoes = { weekday: "long", day: "numeric", month: "long" };
  if (dataHome) dataHome.innerText = hoje.toLocaleDateString("pt-BR", opcoes);
}

// ============================================================================
// 3. SISTEMA DE NAVEGAÇÃO
// ============================================================================
function mostrarSecao(nomeSecao) {
  const idView = "view-" + nomeSecao;
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const telaAlvo = document.getElementById(idView);
  if (telaAlvo) {
    telaAlvo.classList.remove("hidden");
    setTimeout(() => {
      if (nomeSecao === "agenda") atualizarGraficoTarefas();
      if (nomeSecao === "carteira") {
        renderizarFinancas();
        atualizarGraficoFinancas();
        atualizarGraficoPizza();
      }
      if (nomeSecao === "home") atualizarDashboard();
    }, 100);
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
      const acaoBotao = btn.getAttribute("onclick");
      if (acaoBotao && acaoBotao.includes(`'${nomeSecao}'`)) {
        btn.classList.add("active");
      }
      if (nomeSecao === "estudos") {
        atualizarModuloEstudos(); // <--- FORÇA O CÁLCULO AO ABRIR
      }
    });
  }
}

function irParaAgenda() {
  mostrarSecao("agenda");
}

// ============================================================================
// 4. MÓDULO DE TAREFAS & LEMBRETES (NOVO)
// ============================================================================
function abrirModal() {
  document.getElementById("input-titulo").value = "";
  // Se houver campo de data no seu HTML, limpe-o aqui também
  // document.getElementById("input-prazo-tarefa").value = "";
  document.getElementById("modal-tarefa").classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("modal-tarefa").classList.add("hidden");
}

function salvarTarefa() {
  const titulo = document.getElementById("input-titulo").value;
  const categoria = document.getElementById("input-categoria").value;

  // Tenta pegar o prazo se o input existir no HTML (futuro)
  const inputPrazo = document.getElementById("input-prazo-tarefa");
  const prazo = inputPrazo ? inputPrazo.value : null;

  if (!titulo) return alert("Dê um nome à missão!");

  tarefas.push({
    id: Date.now(),
    titulo,
    categoria,
    prazo: prazo, // Data ISO "YYYY-MM-DDTHH:mm"
    feita: false,
    notificada: false, // Controle para não repetir alerta
  });

  localStorage.setItem("chronos_tarefas", JSON.stringify(tarefas));
  fecharModal();
  renderizarTarefas();
  atualizarDashboard();
}

function alternarStatusTarefa(id) {
  tarefas = tarefas.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        feita: !t.feita,
        // Se desmarcar, permite notificar de novo se o prazo mudar
        notificada: !t.feita ? t.notificada : false,
      };
    }
    return t;
  });

  tarefas.forEach((t) => {
    if (t.id === id && t.feita && !t.dataConclusao) {
      t.dataConclusao = new Date().toLocaleDateString("pt-BR");
    }
  });

  localStorage.setItem("chronos_tarefas", JSON.stringify(tarefas));
  renderizarTarefas();
  atualizarDashboard();
  verificarStreak();
  atualizarGraficoTarefas();
}

function deletarTarefa(id) {
  tarefas = tarefas.filter((t) => t.id !== id);
  localStorage.setItem("chronos_tarefas", JSON.stringify(tarefas));
  renderizarTarefas();
  atualizarDashboard();
}

function renderizarTarefas() {
  const lista = document.getElementById("lista-tarefas");
  if (!lista) return;
  lista.innerHTML = "";
  tarefas.forEach((t) => {
    const item = document.createElement("div");
    item.className = "card tarefa-item";

    // Formata o prazo se existir
    let prazoHtml = "";
    if (t.prazo) {
      const d = new Date(t.prazo);
      prazoHtml = `<span style="font-size:0.7em; color:#ffcc00; margin-left:10px;">⏰ ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>`;
    }

    item.innerHTML = `
            <div class="tarefa-container-clique" onclick="alternarStatusTarefa(${t.id})">
                <div class="check-area">${t.feita ? "✅" : "⬜"}</div>
                <div class="tarefa-info ${t.feita ? "tarefa-feita" : ""}">
                    <strong>${t.titulo} ${prazoHtml}</strong>
                    <small style="color: #888;">${t.categoria}</small>
                </div>
            </div>
            <div class="delete-area" style="display: flex; gap: 15px;"> 
                <button class="btn-sync" id="btn-agenda-${t.id}" onclick="abrirModalAgendamento(${t.id}, '${t.titulo}')" style="background:none; border:none; color:#4285F4; cursor:pointer; font-size: 1.4rem;">📅</button>
                <button onclick="deletarTarefa(${t.id})" style="background:none; border:none; color:#ff5555; cursor:pointer; font-size: 1.4rem;">🗑️</button>
            </div>`;
    lista.appendChild(item);
  });
  atualizarGraficoTarefas();
  if (typeof atualizarModuloEstudos === "function") {
    atualizarModuloEstudos();
  }
}

// --- LÓGICA DE LEMBRETES AUTOMÁTICOS ---
function verificarCronogramaDeMissoes() {
  const agora = new Date();
  const cincoMinutosDepois = new Date(agora.getTime() + 5 * 60000);

  tarefas.forEach((t) => {
    // Só verifica se tem prazo, não tá feita e não foi notificada
    if (t.prazo && !t.feita && !t.notificada) {
      const dataPrazo = new Date(t.prazo);

      // Verifica se está no intervalo (entre agora e daqui a 5 min)
      if (dataPrazo > agora && dataPrazo <= cincoMinutosDepois) {
        enviarLembreteDeMissao(t);

        // Marca como notificada e salva
        t.notificada = true;
        localStorage.setItem("chronos_tarefas", JSON.stringify(tarefas));
      }
    }
  });
}

function enviarLembreteDeMissao(tarefa) {
  const msgBody = `Chronos, a missão "${tarefa.titulo}" vence em breve!`;

  // 1. Notificação Visual (Zeus)
  if (window.ZeusNotificador) {
    window.ZeusNotificador.enviar("🛡️ Atenção à Missão", msgBody, "⏳");
  }

  // 2. Notificação Push Nativa
  if (Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification("🛡️ Alerta de Chronos", {
        body: msgBody,
        icon: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
        vibrate: [200, 100, 200],
      });
    });
  }
}

// ============================================================================
// 5. MÓDULO DE AGENDA (GOOGLE CALENDAR)
// ============================================================================
function iniciarConexaoGoogle() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        localStorage.setItem("google_token", tokenResponse.access_token);
        alert(`Conectado com sucesso à Agenda, ${getNomeUsuario()}!`);
      }
    },
  });
  tokenClient.requestAccessToken({ prompt: "consent" });
}

function abrirModalAgendamento(id, titulo) {
  tarefaParaAgendarId = id;
  tarefaParaAgendarTitulo = titulo;
  document.getElementById("titulo-agendamento").innerText = `"${titulo}"`;
  document.getElementById("input-data-hora").value = "";
  document.getElementById("modal-agendamento").classList.remove("hidden");
}

function fecharModalAgendamento() {
  document.getElementById("modal-agendamento").classList.add("hidden");
  tarefaParaAgendarId = null;
}

function confirmarAgendamento() {
  const inputData = document.getElementById("input-data-hora");
  const dataHora = inputData.value;

  if (!dataHora) {
    return alert(`${getNomeUsuario()}, defina uma data e hora!`);
  }

  // --- NOVO: SALVA O PRAZO NO SISTEMA LOCAL (PARA O ZEUS MONITORAR) ---
  const index = tarefas.findIndex((t) => t.id === tarefaParaAgendarId);
  if (index !== -1) {
    tarefas[index].prazo = dataHora; // Salva a data ISO
    tarefas[index].notificada = false; // Reseta para garantir o alerta
    localStorage.setItem("chronos_tarefas", JSON.stringify(tarefas));
    renderizarTarefas(); // Atualiza a tela para mostrar o reloginho
    console.log(`🛡️ Prazo definido para: ${tarefas[index].titulo}`);
  }
  // ---------------------------------------------------------------------

  const botaoOriginal = document.getElementById(
    `btn-agenda-${tarefaParaAgendarId}`,
  );

  // Mantém o envio para o Google Calendar
  enviarTarefaParaAgenda(tarefaParaAgendarTitulo, botaoOriginal, dataHora);

  fecharModalAgendamento();
}

async function enviarTarefaParaAgenda(
  titulo,
  botaoElemento,
  dataHoraEscolhida,
) {
  const token = localStorage.getItem("google_token");
  if (!token) {
    alert(`Conecte sua conta Google primeiro!`);
    return mostrarSecao("config");
  }
  let inicioEvento, fimEvento;
  if (dataHoraEscolhida) {
    inicioEvento = `${dataHoraEscolhida}:00-03:00`;
    const dataFim = new Date(
      new Date(dataHoraEscolhida).getTime() + 60 * 60 * 1000,
    );
    const fimISO =
      dataFim.getFullYear() +
      "-" +
      String(dataFim.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dataFim.getDate()).padStart(2, "0") +
      "T" +
      String(dataFim.getHours()).padStart(2, "0") +
      ":" +
      String(dataFim.getMinutes()).padStart(2, "0") +
      ":00";
    fimEvento = `${fimISO}-03:00`;
  } else {
    inicioEvento = new Date().toISOString();
    fimEvento = new Date(Date.now() + 3600000).toISOString();
  }
  const evento = {
    summary: `🛡️ Missão: ${titulo}`,
    description: `Agendado via Assistente de ${getNomeUsuario()}`,
    start: { dateTime: inicioEvento, timeZone: "America/Sao_Paulo" },
    end: { dateTime: fimEvento, timeZone: "America/Sao_Paulo" },
  };
  try {
    if (botaoElemento) botaoElemento.innerText = "⏳";
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evento),
      },
    );
    if (response.ok) {
      alert(`Missão confirmada!`);
      if (botaoElemento) {
        botaoElemento.innerText = "✅";
        botaoElemento.onclick = null;
      }
    } else {
      if (response.status === 401) {
        alert("Sessão expirada.");
        mostrarSecao("config");
      } else {
        alert("Erro ao agendar.");
      }
      if (botaoElemento) botaoElemento.innerText = "📅";
    }
  } catch (e) {
    if (botaoElemento) botaoElemento.innerText = "⚠️";
  }
}

// ============================================================================
// 6. MÓDULO FINANCEIRO
// ============================================================================
function abrirModalFinanceiro() {
  document.getElementById("input-desc-transacao").value = "";
  document.getElementById("input-valor-transacao").value = "";
  document.getElementById("modal-transacao").classList.remove("hidden");
}

function fecharModalFinanceiro() {
  document.getElementById("modal-transacao").classList.add("hidden");
}
async function salvarTransacao() {
  // 1. Pega os valores do HTML
  const desc = document.getElementById("input-desc-transacao").value;
  const valor = parseFloat(
    document.getElementById("input-valor-transacao").value,
  );

  // IMPORTANTE: Verifique se o ID do select no seu HTML é realmente este
  const elementoTipo = document.getElementById("input-tipo-transacao");
  const tipo = elementoTipo ? elementoTipo.value : "saida"; // Se não achar, assume saida

  const categoria = document.getElementById("input-categoria-transacao").value;

  if (!desc || isNaN(valor)) return alert("Preencha corretamente!");
  const user = auth.currentUser;
  if (!user) return alert("Você precisa estar logado!");

  try {
    // 2. ENVIA APENAS PARA A NUVEM ☁️
    // (Não fazemos push no array local, deixamos o onSnapshot cuidar disso)
    await addDoc(collection(db, "financas"), {
      uid: user.uid,
      item: desc,
      valor: valor,
      tipo: tipo,
      categoria: categoria,
      data: serverTimestamp(),
    });

    // 3. Fecha o modal e espera a mágica do onSnapshot
    fecharModalFinanceiro();
  } catch (e) {
    console.error("Erro ao salvar:", e);
    alert("Erro ao conectar com o Reino.");
  }
}
function renderizarFinancas() {
  const saldoCarteira = document.getElementById("saldo-carteira");
  const lista = document.getElementById("lista-transacoes");

  let saldo = 0;
  if (lista) lista.innerHTML = "";

  // Percorre a lista de transações que veio do Firebase
  transacoes
    .slice()
    .reverse()
    .forEach((t) => {
      // 1. CALCULA O SALDO
      if (t.tipo === "entrada") {
        saldo += Number(t.valor);
      } else {
        saldo -= Number(t.valor);
      }

      // 2. CORREÇÃO DO NOME (O Pulo do Gato) 🐱
      // Se não achar 'desc' (antigo), usa 'item' (novo do Firebase)
      const nomeExibido = t.item || t.desc || "Transação sem nome";

      // Formata a data para não ficar aquele texto gigante em inglês
      const dataFormatada =
        t.data instanceof Date
          ? t.data.toLocaleDateString("pt-BR")
          : t.data || "...";

      const item = document.createElement("div");
      item.className = "card tarefa-item";
      item.style.marginBottom = "10px";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";

      item.innerHTML = `
        <div>
            <span style="font-weight: bold;">${nomeExibido}</span><br>
            <small style="color: #888; font-size: 0.7rem;">${dataFormatada}</small>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
            <strong style="color:${t.tipo === "entrada" ? "#2ecc71" : "#ff5555"}">
                ${t.tipo === "entrada" ? "+" : "-"} R$ ${Number(t.valor).toFixed(2)}
            </strong>
            <button onclick="deletarTransacao('${t.id}')" style="background:none; border:none; color:#ff5555; cursor:pointer; font-size: 1.1rem;">🗑️</button>
        </div>`;

      if (lista) lista.appendChild(item);
    });

  // Atualiza o texto do saldo total lá no topo
  if (saldoCarteira) {
    saldoCarteira.innerText = saldo.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    saldoCarteira.style.color = saldo >= 0 ? "#2ecc71" : "#ff5555";
  }
}
// Sincronização em Tempo Real (Não quebra o layout, apenas preenche os dados)
// 1. Ouvinte em tempo real do Firebase

// Substitua a função antiga por esta:
// Substitua sua função deletarTransacao por esta:
async function deletarTransacao(id) {
  // Confirmação de segurança
  if (!confirm("Tem certeza que deseja apagar este registro do Reino?")) return;

  try {
    console.log("Tentando apagar ID:", id); // Para debug

    // COMANDO SUPREMO DO FIREBASE
    // 'db' é o seu banco, 'financas' a coleção, 'id' o documento específico
    await deleteDoc(doc(db, "financas", id));

    console.log("Apagado com sucesso!");
    // Não precisa fazer nada visual. O onSnapshot vai ver que sumiu e atualizará a tela.
  } catch (e) {
    console.error("Erro ao deletar:", e);
    alert("Erro ao apagar: " + e.message);
  }
}

// ============================================================================
// 7. DASHBOARD E GRÁFICOS
// ============================================================================
function atualizarDashboard() {
  // ... (Mantenha a parte da saudação e saldo que já estava lá) ...
  const hora = new Date().getHours();
  const saudacao =
    hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  document.getElementById("saudacao-texto").innerText =
    `${saudacao}, ${getNomeUsuario()}`;

  // CÁLCULO DO SALDO (Mantenha igual)
  let ent = 0,
    sai = 0;
  transacoes.forEach((t) =>
    t.tipo === "entrada" ? (ent += t.valor) : (sai += t.valor),
  );
  const resumoSaldo = document.getElementById("resumo-saldo-home");
  if (resumoSaldo)
    resumoSaldo.innerText = (ent - sai).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // --- A CORREÇÃO ESTÁ AQUI EMBAIXO ---

  // 1. RESTAURA AS TAREFAS NO "FOCO DE HOJE"
  const pendentes = tarefas.filter((t) => !t.feita);
  const badgeTarefas = document.getElementById("contagem-tarefas");
  if (badgeTarefas) badgeTarefas.innerText = pendentes.length;

  const listaTarefasHome = document.getElementById("lista-resumo-home");
  if (listaTarefasHome) {
    listaTarefasHome.innerHTML = pendentes.length
      ? ""
      : "<p style='color:#888; font-size: 0.8rem;'>Nenhuma missão ativa.</p>";

    // Desenha as tarefas (isso tinha sido apagado)
    pendentes.slice(0, 3).forEach((t) => {
      listaTarefasHome.innerHTML += `
                <div style='margin: 5px 0; padding: 8px; background: rgba(0, 212, 255, 0.1); border-left: 3px solid #00d4ff; border-radius: 4px; font-size: 0.9rem;'>
                    🔹 ${t.titulo}
                </div>`;
    });
  }

  // 2. CHAMA O HISTÓRICO PARA O NOVO LUGAR
  if (typeof renderizarHistorico === "function") {
    renderizarHistorico();
  }

  // ... (Mantenha o resto dos gráficos) ...
}

function verificarStreak() {
  const todasFeitas = tarefas.length > 0 && tarefas.every((t) => t.feita);
  if (todasFeitas) {
    const hoje = new Date().toLocaleDateString("pt-BR");
    const ultimaData = localStorage.getItem("chronos_last_streak_date");
    if (ultimaData !== hoje) {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      if (ultimaData === ontem.toLocaleDateString("pt-BR")) streak++;
      else streak = 1;
      localStorage.setItem("chronos_streak", JSON.stringify(streak));
      localStorage.setItem("chronos_last_streak_date", hoje);
      atualizarDashboard();
    }
  }
}

// ============================================================================
// 8. CONFIGURAÇÕES & IA
// ============================================================================
function salvarNovoNome() {
  const input = document.getElementById("config-nome-input");
  const novoNome = input.value.trim();
  if (novoNome) {
    localStorage.setItem("chronos_user_name", novoNome);
    atualizarDashboard();
    alert("Nome atualizado!");
    input.value = "";
  }
}

function salvarApiKey() {
  const key = document.getElementById("config-api-key").value.trim();
  if (key) {
    localStorage.setItem("gemini_api_key", key);
    alert("Chave configurada!");
    document.getElementById("config-api-key").value = "";
  }
}

async function analisarFinancas() {
  const textoIA = document.getElementById("texto-ia");
  document.getElementById("resposta-ia").classList.remove("hidden");
  textoIA.innerText = "Consultando Oráculo...";
  const dados = transacoes
    .map((t) => `${t.tipo}: R$${t.valor} (${t.desc})`)
    .join(", ");
  const memoria = historicoIA
    .slice(-2)
    .map((h) => h.texto)
    .join(" | ");
  const prompt = `Aja como Zeus mentor de ${getNomeUsuario()}. Histórico: ${memoria}. Dados: ${dados}. Dê 3 dicas curtas.`;
  const API_KEY = localStorage.getItem("gemini_api_key");
  if (!API_KEY) {
    alert("Configure sua API Key!");
    return mostrarSecao("config");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await response.json();
    const conselho = data.candidates[0].content.parts[0].text;
    textoIA.innerHTML = conselho.replace(/\n/g, "<br>");
    historicoIA.push({
      data: new Date().toLocaleDateString(),
      texto: conselho,
    });
    localStorage.setItem("chronos_ia", JSON.stringify(historicoIA));
  } catch (e) {
    textoIA.innerText = "Erro no oráculo.";
  }
}

// ============================================================================
// 9. RELÓGIO & NOTIFICAÇÕES (ZEUS)
// ============================================================================
function iniciarRelogio() {
  const relogioElemento = document.getElementById("relogio-home");
  function atualizarHora() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    if (relogioElemento) relogioElemento.innerText = horaFormatada;
  }
  atualizarHora();
  setInterval(atualizarHora, 1000);
}

// OBJETO GLOBAL DO ZEUS NOTIFICADOR
window.ZeusNotificador = {
  solicitarPermissao: async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") console.log("Acesso ao Olimpo concedido!");
  },

  // Notificação instantânea via Service Worker
  enviar: (titulo, msg, icone = "⚡") => {
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(`${icone} ${titulo}`, {
          body: msg,
          icon: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
          vibrate: [200, 100, 200],
          tag: "zeus-notificacao",
        });
      });
    } else {
      // Fallback se SW não estiver pronto
      alert(`${icone} ${titulo}\n${msg}`);
    }
  },
};

// Configura a Vigília (Segundo Plano)
async function configurarZeusVigilia() {
  const registration = await navigator.serviceWorker.ready;
  if ("periodicSync" in registration) {
    try {
      await registration.periodicSync.register("verificar-missoes", {
        minInterval: 24 * 60 * 60 * 1000, // Verifica uma vez por dia
      });
      console.log("ZeusVigilia: Ativa");
    } catch (e) {
      console.log("Vigília requer PWA instalado.");
    }
  }
}

// ============================================================================
// 10. SISTEMA RPG (SOLO LEVELING LOGIC)
// ============================================================================

const EXERCICIOS_CONFIG = {
  pushup: { nome: "Flexões", meta: 20, botoes: [1, 5, 10], xp: 2 },
  situp: { nome: "Abdominais", meta: 20, botoes: [1, 5, 10], xp: 2 },
  squat: { nome: "Agachamentos", meta: 20, botoes: [1, 5, 10], xp: 2 },
  run: { nome: "Corrida (Km)", meta: 3, botoes: [0.5, 1], xp: 50 },
};

let estadoQuest = {
  pushup: 0,
  situp: 0,
  squat: 0,
  run: 0,
  data: "",
  level: 1,
  currentXp: 0,
  nextLevelXp: 100,
};

function carregarSistema() {
  const salvo = JSON.parse(localStorage.getItem("chronos_quest_rpg"));
  const hoje = new Date().toDateString();

  if (salvo) {
    if (salvo.data !== hoje) {
      estadoQuest = {
        ...salvo,
        pushup: 0,
        situp: 0,
        squat: 0,
        run: 0,
        data: hoje,
      };
    } else {
      estadoQuest = salvo;
    }
  } else {
    estadoQuest.data = hoje;
  }
  salvarEstado();
  renderizarJanelaSistema();
  atualizarCardHome();
  atualizarHUDLevel();
}

function salvarEstado() {
  localStorage.setItem("chronos_quest_rpg", JSON.stringify(estadoQuest));
}

function renderizarJanelaSistema() {
  atualizarHUDLevel();
  const container = document.getElementById("lista-exercicios");
  if (!container) return;
  container.innerHTML = "";
  const icones = { pushup: "💪", situp: "🍫", squat: "🏋️", run: "🏃" };

  for (let chave in EXERCICIOS_CONFIG) {
    const config = EXERCICIOS_CONFIG[chave];
    const atual = estadoQuest[chave];
    const pct = Math.min((atual / config.meta) * 100, 100);
    const corTexto = atual >= config.meta ? "#00ff88" : "#00d4ff";
    const corBarra = atual >= config.meta ? "#00ff88" : "#00d4ff";

    let htmlBotoes = "";
    config.botoes.forEach((valor) => {
      htmlBotoes += `<button class="btn-add" onclick="realizarAcao('${chave}', ${valor})">+${valor}</button>`;
    });

    const htmlItem = `
            <div class="ex-item">
                <div class="ex-header">
                    <span class="ex-name">${icones[chave]} ${config.nome}</span>
                    <span class="ex-count" style="color:${corTexto}">${atual} <span style="font-size:0.8em; color:#555;">/ ${config.meta}</span></span>
                </div>
                <div class="mini-track"><div class="mini-fill" style="width: ${pct}%; background: ${corBarra}; box-shadow: 0 0 10px ${corBarra};"></div></div>
                <div class="ex-controls">${htmlBotoes}</div>
            </div>`;
    container.innerHTML += htmlItem;
  }
}

function realizarAcao(tipo, qtd) {
  if (estadoQuest[tipo] < EXERCICIOS_CONFIG[tipo].meta) {
    estadoQuest[tipo] += qtd;
    const xpGanho = qtd * EXERCICIOS_CONFIG[tipo].xp;
    ganharXp(xpGanho);
    if (navigator.vibrate) navigator.vibrate(30);
    salvarEstado();
    renderizarJanelaSistema();
    atualizarCardHome();
  }
}

function ganharXp(quantidade) {
  estadoQuest.currentXp += quantidade;
  while (estadoQuest.currentXp >= estadoQuest.nextLevelXp) {
    subirDeNivel();
  }
  atualizarHUDLevel();
}

function subirDeNivel() {
  estadoQuest.currentXp -= estadoQuest.nextLevelXp;
  estadoQuest.level++;
  estadoQuest.nextLevelXp = Math.floor(estadoQuest.nextLevelXp * 1.2);
  const modal = document.querySelector(".system-window");
  if (modal) {
    modal.classList.add("level-up-anim");
    setTimeout(() => modal.classList.remove("level-up-anim"), 1000);
  }
  alert(`⚡ LEVEL UP! VOCÊ ALCANÇOU O NÍVEL ${estadoQuest.level} ⚡`);

  // Notificação visual e Push
  if (window.ZeusNotificador) {
    window.ZeusNotificador.enviar(
      "LEVEL UP!",
      `Parabéns Chronos, alcançaste o nível ${estadoQuest.level}!`,
    );
  }
}

function atualizarHUDLevel() {
  const displayLvl = document.getElementById("display-lvl");
  const displayXp = document.getElementById("display-xp");
  const barXp = document.getElementById("bar-xp");
  const homeLvl = document.getElementById("home-lvl");

  if (displayLvl) {
    displayLvl.innerText = estadoQuest.level;
    if (homeLvl) homeLvl.innerText = "LVL " + estadoQuest.level;
    displayXp.innerText = `${Math.floor(estadoQuest.currentXp)} / ${estadoQuest.nextLevelXp}`;
    const pctXp = (estadoQuest.currentXp / estadoQuest.nextLevelXp) * 100;
    barXp.style.width = `${pctXp}%`;
  }
}

function atualizarCardHome() {
  let totalMetas = 0,
    totalFeito = 0;
  for (let chave in EXERCICIOS_CONFIG) {
    totalMetas += EXERCICIOS_CONFIG[chave].meta;
    totalFeito += Math.min(estadoQuest[chave], EXERCICIOS_CONFIG[chave].meta);
  }
  const progressoGeral = (totalFeito / totalMetas) * 100;
  const barraHome = document.getElementById("barra-progresso-home");
  const badge = document.getElementById("status-quest-mini");
  const msgReward = document.getElementById("msg-recompensa");

  if (barraHome) barraHome.style.width = `${progressoGeral}%`;
  if (progressoGeral >= 100) {
    if (badge) {
      badge.innerText = "COMPLETA";
      badge.classList.add("status-complete");
    }
    if (msgReward) msgReward.classList.remove("hidden");
  } else {
    if (badge) {
      badge.innerText = "PENDENTE";
      badge.classList.remove("status-complete");
    }
    if (msgReward) msgReward.classList.add("hidden");
  }
}

function abrirSistema() {
  document.getElementById("modal-sistema").classList.remove("hidden");
  carregarSistema();
}
function fecharSistema() {
  document.getElementById("modal-sistema").classList.add("hidden");
}

// ============================================================================
// 11. SISTEMA DE GRÁFICOS
// ============================================================================

function atualizarGraficoTarefas() {
  const ctx = document.getElementById("grafico-tarefas");
  const textoProgresso = document.getElementById("texto-progresso");

  if (!ctx) return;

  const feitas = tarefas.filter((t) => t.feita).length;
  const total = tarefas.length;
  const porcentagem = total > 0 ? Math.round((feitas / total) * 100) : 0;
  if (textoProgresso) {
    textoProgresso.innerText = porcentagem + "%";
  }
  if (chartTarefas) chartTarefas.destroy();
  chartTarefas = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [feitas, total > 0 ? total - feitas : 1],
          backgroundColor: ["#00d4ff", "#1a1a1a"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: "75%",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

function atualizarGraficoFinancas() {
  const ctx = document.getElementById("grafico-financas");
  if (!ctx) return;

  let ent = 0,
    sai = 0;
  transacoes.forEach((t) =>
    t.tipo === "entrada" ? (ent += t.valor) : (sai += t.valor),
  );

  if (chartFinancas) chartFinancas.destroy();
  chartFinancas = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ganhos", "Gastos"],
      datasets: [
        {
          data: [ent, sai],
          backgroundColor: ["#2ecc71", "#ff5555"],
          borderRadius: 5,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#888" } },
        y: { grid: { display: false }, ticks: { color: "#fff" } },
      },
    },
  });
}

function atualizarGraficoPizza() {
  const ctx = document.getElementById("grafico-pizza-financas");
  if (!ctx) return;

  const categorias = {};
  transacoes
    .filter((t) => t.tipo === "saida")
    .forEach((t) => {
      const cat = t.categoria || "Geral";
      categorias[cat] = (categorias[cat] || 0) + t.valor;
    });

  if (chartPizza) chartPizza.destroy();
  if (Object.keys(categorias).length === 0) return;

  chartPizza = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categorias),
      datasets: [
        {
          data: Object.values(categorias),
          backgroundColor: [
            "#00d4ff",
            "#9b59b6",
            "#ff5555",
            "#2ecc71",
            "#f1c40f",
          ],
          borderWidth: 2,
          borderColor: "#0d1117",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#ccc", font: { size: 10 } },
        },
      },
    },
  });
}
// Função de Sincronização Segura
// Importante: Certifique-se de que 'onSnapshot', 'collection', 'query' e 'orderBy'
// foram importados do firebase/firestore no topo do seu arquivo.

// Sincronização compatível com Firebase 10.8.0
// Importante: Verifique se no topo do seu script você importou:
// import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Substitua a função 'ativarSincronizacaoNuvem' inteira por esta:

async function ativarSincronizacaoNuvem() {
  // Ouve se o usuário logou ou deslogou
  // Requer import { onAuthStateChanged } do firebase-auth
  onAuthStateChanged(auth, (user) => {
    // CENÁRIO 1: USUÁRIO LOGADO
    if (user) {
      console.log("🔒 Sincronizando dados seguros de:", user.uid);

      // AQUI ESTÁ A BLINDAGEM:
      // Requer import { where } do firebase-firestore
      const q = query(
        collection(db, "financas"),
        where("uid", "==", user.uid), // <--- SÓ TRAZ O QUE É MEU
        orderBy("data", "desc"),
      );

      onSnapshot(
        q,
        (snapshot) => {
          transacoes.length = 0; // Limpa a memória local
          let saldoAcumulado = 0;

          snapshot.forEach((doc) => {
            const d = doc.data();
            transacoes.push({
              id: doc.id, // Fundamental para deletar
              item: d.item || d.desc,
              valor: Number(d.valor),
              categoria: d.categoria || "Geral",
              tipo: d.tipo || "saida",
              data: d.data?.toDate() || new Date(),
            });

            // Calcula Saldo
            if (d.tipo === "entrada") saldoAcumulado += Number(d.valor);
            else saldoAcumulado -= Number(d.valor);
          });

          // --- ATUALIZAÇÃO DA TELA (Igual ao seu código original) ---

          // 1. Saldo Texto
          const saldoElemento = document.getElementById("saldo-carteira");
          if (saldoElemento) {
            saldoElemento.innerText = `R$ ${saldoAcumulado.toFixed(2)}`;
          }

          // 2. Gráficos e Listas
          if (typeof atualizarGraficoPizza === "function")
            atualizarGraficoPizza();
          if (typeof renderizarFinancas === "function") renderizarFinancas();
          if (typeof atualizarDashboard === "function") atualizarDashboard();
          if (typeof renderizarHistorico === "function") renderizarHistorico();
        },
        (error) => {
          // CAPTURA DE ERRO DE ÍNDICE
          console.error("Erro na leitura protegida:", error);
          if (error.code === "failed-precondition") {
            alert(
              "⚠️ ATENÇÃO CHRONOS: Abra o Console (F12) e clique no link do Firebase para criar o índice de segurança!",
            );
          }
        },
      );
    } else {
      // CENÁRIO 2: DESLOGADO
      console.log("Usuário saiu. Limpando dados.");
      transacoes = [];
      if (typeof renderizarFinancas === "function") renderizarFinancas();
      if (typeof atualizarDashboard === "function") atualizarDashboard();

      const saldoElemento = document.getElementById("saldo-carteira");
      if (saldoElemento) saldoElemento.innerText = "R$ 0,00";
    }
  });
}
function renderizarHistorico() {
  const container = document.getElementById("lista-financas-home");
  if (!container) return;

  container.innerHTML = "";

  // CORREÇÃO: Removemos o .reverse()
  // Como o Firebase já manda ordenado (DESC), basta pegar os 4 primeiros (.slice(0,4))
  transacoes.slice(0, 3).forEach((t) => {
    const item = document.createElement("div");
    item.className = "card transacao-item";

    item.style.marginBottom = "10px";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.padding = "15px";

    const isEntrada = t.tipo === "entrada";
    const cor = isEntrada ? "#2ecc71" : "#ff4d4d";
    const sinal = isEntrada ? "+" : "-";
    const nome = t.item || t.desc || "Sem nome";

    item.innerHTML = `
            <div class="info">
                <strong style="color: #fff; font-size: 1rem;">${nome}</strong><br>
                <span style="font-size: 0.8em; color: #bbb;">${t.categoria}</span>
            </div>
            <div class="valor" style="color: ${cor}; font-weight: bold; font-size: 1.1rem;">
                ${sinal} R$ ${parseFloat(t.valor).toFixed(2)}
            </div>
        `;
    container.appendChild(item);
  });
}
function atualizarModuloEstudos() {
  // 1. Countdown CFO (Garante que os números apareçam)
  const dataProva = new Date("2026-08-20T09:00:00");
  const agora = new Date();
  const diff = dataProva - agora;

  if (diff > 0) {
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    document.getElementById("countdown-cfo").innerText = `${dias}d ${horas}h`;
  }

  // 2. Cálculo de Progresso Real
  // Filtramos apenas missões da categoria 'Estudo'
  const missoes = tarefas.filter(
    (t) => t.categoria === "Estudo" || t.categoria === "Educação",
  );

  const calcular = (termos) => {
    const filtradas = missoes.filter((t) =>
      termos.some((termo) => t.titulo.toLowerCase().includes(termo)),
    );
    const concluidas = filtradas.filter((t) => t.feita).length;
    return filtradas.length > 0
      ? Math.round((concluidas / filtradas.length) * 100)
      : 0;
  };

  // Mapeamento de Palavras-Chave
  const configuracao = [
    { id: "direito", termos: ["direito", "lei", "constitucional", "penal"] },
    { id: "ti", termos: ["sql", "python", "informática", "ti"] },
    { id: "port", termos: ["português", "gramática", "redação"] },
    { id: "mat", termos: ["matemática", "rlm", "lógica"] },
    { id: "ma", termos: ["maranhão", "história", "geografia"] },
  ];

  configuracao.forEach((m) => {
    const pct = calcular(m.termos);
    const bar = document.getElementById(`prog-${m.id}-bar`);
    const txt = document.getElementById(`prog-${m.id}-txt`);
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.innerText = pct + "%";
  });
}

// Chame isso dentro da sua função mostrarSecao('estudos')
// EXPORTAÇÕES PARA O HTML
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.salvarTarefa = salvarTarefa;
window.alternarStatusTarefa = alternarStatusTarefa;
window.deletarTarefa = deletarTarefa;
window.mostrarSecao = mostrarSecao;
window.irParaAgenda = irParaAgenda;
window.abrirModalAgendamento = abrirModalAgendamento;
window.fecharModalAgendamento = fecharModalAgendamento;
window.confirmarAgendamento = confirmarAgendamento;
window.iniciarConexaoGoogle = iniciarConexaoGoogle;
window.abrirModalFinanceiro = abrirModalFinanceiro;
window.fecharModalFinanceiro = fecharModalFinanceiro;
window.salvarTransacao = salvarTransacao;
window.deletarTransacao = deletarTransacao;
window.salvarNovoNome = salvarNovoNome;
window.salvarApiKey = salvarApiKey;
window.analisarFinancas = analisarFinancas;
window.abrirSistema = abrirSistema;
window.fecharSistema = fecharSistema;
window.realizarAcao = realizarAcao;
window.login = login;
window.estadoQuest = estadoQuest;
window.salvarEstado = salvarEstado;
window.renderizarJanelaSistema = renderizarJanelaSistema;
window.tarefas = tarefas; // Necessário para o Teste 3
window.renderizarTarefas = renderizarTarefas; // Necessário para o Teste 3
window.salvarTokenNoFirestore = salvarTokenNoFirestore;
window.db = db; // Exportando o banco para garantir
