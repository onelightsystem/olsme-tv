import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // For Firebase Authentication
import { getFirestore } from 'firebase/firestore'; // For Firestore

const firebaseConfig = {
  apiKey: "AIzaSyDG-wbTAUOGL7gzqhxcexfamr83KXEdNGY",
  authDomain: "studio-4615914296-4bd91.firebaseapp.com",
  projectId: "studio-4615914296-4bd91",
  storageBucket: "studio-4615914296-4bd91.firebasestorage.app",
  messagingSenderId: "978616630819",
  appId: "1:978616630819:web:aa85677e46fba897dc3b96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Export for Auth
export const db = getFirestore(app); // Export for Firestore