import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js'
import { getFirestore, query, where, limit, orderBy, startAfter, getDoc, getDocs, setDoc, deleteDoc, collection, doc } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'

import { firebaseConfigObject } from "./setup.js";

const firebaseConfig = firebaseConfigObject;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function downloadWhere(path, qList=[], n=1){
    const ref = collection(db, 'users', 'Adwait', ...path);
    const q = query(ref, where(...qList), limit(n));
    const querySnapshot = await getDocs(q);
    return querySnapshot;
}

export async function downloadDocument(path) {
    const snap = await getDoc(doc(db, 'users', 'Adwait', ...path));
    return snap;
}

export async function downloadFirst(path, lim=1) {
    const snap = await getDocs(query(collection(db, 'users', 'Adwait', ...path), limit(lim)));
    return snap.docs;
}

export async function paginatedDownload(start, order, lim, path){
    const ref = collection(db, 'users', 'Adwait', ...path);
    const q = query(ref, orderBy(order), startAfter(start), limit(lim));
    const querySnapshot = await getDocs(q);    
    return querySnapshot;
}

export async function upload(path=[], data){
    const ref = doc(db, 'users', 'Adwait', ...path);
    await setDoc(ref, data);
}

export async function deleteDocument(path=[]){
    await deleteDoc(doc(db, 'users', 'Adwait', ...path));
}