import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js'
import { getFirestore, query, where, limit, orderBy, startAfter, getDoc, getDocs, setDoc, deleteDoc, collection, doc } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app-check.js";

import { firebaseConfigObject } from "./setup.js";

const firebaseConfig = firebaseConfigObject;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
//self.FIREBASE_APPCHECK_DEBUG_TOKEN = false
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LdIlvkpAAAAAHlQKM95TIrEwh4zqHR0z2U3YFdh'),
    isTokenAutoRefreshEnabled: true
});


export async function callApiWithAppCheck() {
    let appCheckTokenResponse;
    try {
        appCheckTokenResponse = await getToken(appCheck, /* forceRefresh= */ false);
    } catch (err) {
        // Handle any errors if the token was not retrieved.
        return;
    }

    return appCheckTokenResponse;
}

export function setAuthInit(inCallback, outCallback) {
    if(auth.currentUser == null){
        return onAuthStateChanged(auth, (user) => user ? inCallback(user) : outCallback());
    } else {
        inCallback(user);
    }
}

export function getAuthUser(){
    return auth.currentUser;
}

export function updateUser(update, success, failure) {
    updateProfile(getAuthUser(), update).then(() => success()).catch((error) => failure(error));
}

export function signIn(token, callback, errorCallback) {
    signInWithCustomToken(auth, token)
    .then(userCredential => {
        const user = userCredential.user;
        callback(user);
    })
    .catch(error => {
        errorCallback(error.code, error.message);
    });
}

export function logOut(callback, errorCallback){
    signOut(auth).then(() => callback()).catch((e) => errorCallback(e));
}

export async function downloadWhere(path, qList=[], n=1){
    const ref = collection(db, 'users', auth.currentUser.uid, ...path);
    const q = query(ref, where(...qList), limit(n));
    const querySnapshot = await getDocs(q);
    return querySnapshot;
}

export async function downloadDocument(path) {
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid, ...path));
    return snap;
}

export async function downloadFirst(path, lim=1) {
    const snap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, ...path), limit(lim)));
    return snap.docs;
}

export async function paginatedDownload(start, order, lim, path){
    const ref = collection(db, 'users', auth.currentUser.uid, ...path);
    const q = query(ref, orderBy(order), startAfter(start), limit(lim));
    const querySnapshot = await getDocs(q);    
    return querySnapshot;
}

export async function upload(path=[], data){
    console.log(data)
    const ref = doc(db, 'users', auth.currentUser.uid, ...path);
    await setDoc(ref, data);
}

export async function deleteDocument(path=[]){
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, ...path));
}