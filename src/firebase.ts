import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "gen-lang-client-0461075771",
  "appId": "1:204527595731:web:9ba2e14218c8e50f05e426",
  "apiKey": "AIzaSyAG1ADotpyGSplv8dmdLiGFhdqakQdwBGs",
  "authDomain": "gen-lang-client-0461075771.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-180a50de-8983-4ccf-9be5-c9406eadd383",
  "storageBucket": "gen-lang-client-0461075771.firebasestorage.app",
  "messagingSenderId": "204527595731",
  "measurementId": ""
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.error("Firebase init error:", e);
}

export { app, db };
