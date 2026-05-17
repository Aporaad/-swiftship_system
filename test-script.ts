import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  try {
    const creds = await signInWithEmailAndPassword(auth, "alsrhyarslan5@gmail.com", "123456");
    console.log("Signed in.");
  } catch(err) {
    console.error("Sign in error:", err);
  }
}
run();
