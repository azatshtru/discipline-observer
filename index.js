import { logOut, setAuthInit } from "./firebase.js";

const state = {
    configDisplay: 'none',

    subscribers: [],
    subscribe(f){
        this.subscribers.push(f);
    },
    publish(){
        this.subscribers.forEach(x => x(this));
    },

    setConfigDisplay(display) {
        this.configDisplay = display;
        this.publish();
    }
}

const heading = document.querySelector('h1');
const logoutButton = document.querySelector('#logout');
const configButton = document.querySelector('#config-button');
const config = document.querySelector('#config');
const configCloseButton = document.querySelector('#config-close-button');

const unsubscribe = setAuthInit((user) => {}, () => window.location.replace('/login'));
logoutButton.onclick = () => logOut(() => {}, (e) => alert('failed to sign out'));

state.subscribe((s) => config.style.display = s.configDisplay);

configButton.onclick = () => state.setConfigDisplay('initial');
configCloseButton.onclick = () => state.setConfigDisplay('none');