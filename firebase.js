import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js'
import { getFirestore, query, limit, getDoc, getDocs, setDoc, collection, doc } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'

const firebaseConfig = {
    apiKey: "AIzaSyDpTRESudXQYfc3bsYHaLj3FSOcN9iW7Dg",
    authDomain: "dash-12112.firebaseapp.com",
    projectId: "dash-12112",
    storageBucket: "dash-12112.appspot.com",
    messagingSenderId: "203082346324",
    appId: "1:203082346324:web:4f4b8bb1ac6afed447a2c1",
    measurementId: "G-46XL0XVQMX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function download(path, n=1){
    const ref = collection(db, 'users', 'Adwait', ...path);
    const q = query(ref, limit(n));
    const querySnapshot = await getDocs(q);
    return querySnapshot;
}

export async function downloadDocument(path) {
    const snap = await getDoc(doc(db, 'users', 'Adwait', ...path));
    return snap;
}

export async function upload(path=[], data){
    const ref = doc(db, 'users', 'Adwait', ...path);
    await setDoc(ref, data);
}