import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsiC8RaCd-6bwuThixa1ZxFkK4JhHgfjk",
  authDomain: "cuidafast-hub-af250.firebaseapp.com",
  projectId: "cuidafast-hub-af250",
  storageBucket: "cuidafast-hub-af250.appspot.com",
  messagingSenderId: "263800638065",
  appId: "1:263800638065:web:9b655c9d3e3acea160e9d0",
  measurementId: "G-701M8B5CZC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const messaging = getMessaging(app);
const db = getFirestore(app);
const vapidKey = "BAMeCbsVy0Wy1fqHjxiyHcviJhGUQC4S6VhLKC9FMgB8wJlYWYzW2EaEzqR8wY1SalKrwc0-D3aRotYl2VmHqwA"; // sua VAPID key

export async function initFCM() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return console.warn("Permissão negada");

  try {
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      // Obter dados do usuário logado
      const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
      
      if (userData.id) {
        // Salvar token no backend (MySQL)
        const response = await fetch('http://localhost:3000/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userData.id, 
            token 
          })
        });
        
        const result = await response.json();
        
        if (result.ok) {
          console.log("✅ Token salvo no MySQL:", token);
        } else {
          console.error("❌ Erro ao salvar token:", result.message);
        }
      } else {
        console.warn("⚠️ Usuário não logado, token não salvo");
      }
    }
  } catch (err) {
    console.error("❌ Erro ao gerar token:", err);
  }
}

onMessage(messaging, (payload) => {
  alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
});

// Exportar auth para uso em outros módulos (ex: login.js)
export { auth, db, messaging };
