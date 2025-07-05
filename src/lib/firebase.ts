
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

if (isFirebaseConfigured) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (typeof window !== 'undefined') {
    try {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Várias abas abertas, a persistência só pode ser ativada em uma aba por vez.');
        } else if (err.code == 'unimplemented') {
          console.warn('O navegador atual não suporta todos os recursos necessários para ativar a persistência.');
        }
      });
    } catch (error) {
        console.error("Erro ao habilitar a persistência do Firestore", error);
    }
  }
} else {
    console.warn(
        "A configuração do Firebase está incompleta. " + 
        "Por favor, crie um arquivo .env.local e adicione as credenciais do seu projeto Firebase. " +
        "Você pode usar o arquivo .env.local.example como modelo."
    );
}

export { app, auth, db, storage, isFirebaseConfigured };
