import {
  initializeApp,
  getApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaoeSZD5GJ49nESbRcevHAQ_7IfA-pA-U",
  authDomain: "ai-plus-defce.firebaseapp.com",
  projectId: "ai-plus-defce",
  storageBucket: "ai-plus-defce.firebasestorage.app",
  messagingSenderId: "487321331111",
  appId: "1:487321331111:web:28f39eced2604c02110282",
};

// Inicialização segura e única
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

/*async function salvarGasto() {
  const item = document.getElementById("itemGasto").value;
  const valorInput = document.getElementById("valorGasto").value;
  const valor = parseFloat(valorInput);
  const categoria = document.getElementById("categoriaGasto").value;

  if (!item || isNaN(valor)) {
    alert("⚠️ Por favor, preencha o item e o valor corretamente.");
    return;
  }

  try {
    // Usa a sintaxe modular correta da v12
    const user = auth.currentUser; 
        if (!user) {
            alert("Você precisa estar logado!");
            return;
        }
    await addDoc(collection(db, "financas"), {
      uid: user.uid, // Associa o gasto ao usuário logado
      item: item,
      valor: valor,
      categoria: categoria,
      data: serverTimestamp(),
      usuarioId: "Chronos",
    });

    alert("✅ Gasto registrado no Reino!");

    // Limpa os campos
    document.getElementById("itemGasto").value = "";
    document.getElementById("valorGasto").value = "";
  } catch (e) {
    console.error("Erro ao salvar:", e);
    alert("Erro ao salvar. Verifique o console.");
  }
}*/

// Ponte essencial para o 'onclick' do HTML funcionar
window.salvarGasto = salvarGasto;
