import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
      apiKey: "AIzaSyCewWc2z0yal8SCWxNLbvUlu4fZ1QWcdZ8",
      authDomain: "daily-checklist-4fb64.firebaseapp.com",
      projectId: "daily-checklist-4fb64",
      storageBucket: "daily-checklist-4fb64.firebasestorage.app",
      messagingSenderId: "118116366015",
      appId: "1:118116366015:web:9610172e6bda806b29380a"
    };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);