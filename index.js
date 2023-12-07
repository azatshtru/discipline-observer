import { logOut, setAuthInit } from "./firebase.js";

const heading = document.querySelector('h1');

const unsubscribe = setAuthInit((user) => {}, () => window.location.replace('/login'));

heading.onclick = () => logOut(() => {}, (e) => alert('failed to sign out'));