importScripts(
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js",
);
console.log("[SW] Iniciando firebase-messaging-sw.js – versão 12.8.0");
console.log(
  "[firebase-messaging-sw.js] Service Worker carregado e inicializado",
);
const firebaseConfig = {
  apiKey: "AIzaSyDin71f0GEpU7FO2VO5pZ9niYQlXQwkLj0",
  authDomain: "ai-plus-defce.firebaseapp.com",
  projectId: "ai-plus-defce",
  storageBucket: "ai-plus-defce.firebasestorage.app",
  messagingSenderId: "487321331111",
  appId: "1:487321331111:web:28f39eced2604c02110282"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Lógica de Segundo Plano (mensagens push em background)
// firebase-messaging-sw.js

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Sinal recebido em segundo plano: ", payload);

  // Garante que pegamos o texto mesmo se vier formatado diferente
  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    "🔱 Alerta do Oráculo";
  const notificationBody =
    payload.notification?.body ||
    payload.data?.body ||
    "Nova atualização detectada.";

  const options = {
    body: payload.notification ? body || notificationBody : notificationBody,
    icon: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
    badge: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
    vibrate: [200, 100, 200],
    tag: "alerta-edital", // Evita empilhar 50 notificações iguais
    renotify: true,
    data: {
      url:
        payload.data?.link ||
        payload.fcmOptions?.link ||
        "https://kayronmaximus.github.io/ai-plus-defce/",
    },
  };

  // O 'return' é CRUCIAL para o Android não matar o processo antes de mostrar a notificação
  return self.registration.showNotification(notificationTitle, options);
});

// Adicione isso para que, ao clicar na notificação, o site abra:
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

// Lógica da Vigília (periodicSync para verificações periódicas)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "verificar-missoes") {
    event.waitUntil(
      self.registration.showNotification("🛡️ Vigília de Zeus", {
        body: "Chronos, verifique suas missões pendentes!",
        icon: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
      }),
    );
  }
});
