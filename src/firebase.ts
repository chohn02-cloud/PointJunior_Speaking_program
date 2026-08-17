import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYOJZNuB72oFPskOunQa0V98eaXFuyfiw",
  authDomain: "point-junior-speaking.firebaseapp.com",
  projectId: "point-junior-speaking",
  storageBucket: "point-junior-speaking.firebasestorage.app",
  messagingSenderId: "155258649103",
  appId: "1:155258649103:web:3eb93c3a79c078acd7817a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);

export { ref, uploadBytesResumable, getDownloadURL, collection, addDoc, serverTimestamp };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errString = "";
  try {
    if (error instanceof Error) {
      errString = error.message;
    } else {
      errString = String(error);
    }
  } catch (e) {
    errString = "Unknown error (non-serializable)";
  }

  const errInfo: FirestoreErrorInfo = {
    error: errString,
    authInfo: {},
    operationType,
    path
  };

  try {
    const serialized = JSON.stringify(errInfo);
    console.error('Firestore Error: ', serialized);
    throw new Error(serialized);
  } catch (e) {
    console.error('Firestore Error (circular fallback): ', errString);
    throw new Error(errString);
  }
}
