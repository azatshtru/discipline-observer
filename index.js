import { logOut, setAuthInit } from "./firebase.js";

const heading = document.querySelector('h1');
const logoutButton = document.querySelector('#logout');

const unsubscribe = setAuthInit((user) => {}, () => window.location.replace('/login'));

logoutButton.onclick = () => logOut(() => {}, (e) => alert('failed to sign out'));