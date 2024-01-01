import { getAuthUser, logOut, setAuthInit, updateUser } from "./firebase.js";

const state = {
    configDisplay: 'none',
    isLoggedIn: false,
    displayName: '',

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
    },

    setLoggedIn(loggedIn){
        this.isLoggedIn = loggedIn;
        this.displayName = getAuthUser().displayName;
        this.publish();
    },

    setDisplayName(name){
        if(name && name.trim() != ''){
            updateUser({ displayName: name }, () => {
                this.displayName = getAuthUser().displayName;
                this.publish();
            }, (e) => alert('error updating name'));
        }
    }
}

const heading = document.querySelector('h1');
const logoutButton = document.querySelector('#logout');
const configButton = document.querySelector('#config-button');
const config = document.querySelector('#config');
const configCloseButton = document.querySelector('#config-close-button');
const nameField = document.querySelector('#name-field > input');
const nameFieldSubmit = document.querySelector('#name-field > button');
const downloadNotezipButton = document.querySelector('#download-notezip');
const downloadConfigButton = document.querySelector('#download-config');

const unsubscribe = setAuthInit((user) => {state.setLoggedIn(true)}, () => window.location.replace('/login'));
logoutButton.onclick = () => logOut(() => {}, (e) => alert('failed to sign out'));

state.subscribe((s) => {
    if(s.isLoggedIn){config.style.display = s.configDisplay;}
});

state.subscribe((s) => {
    heading.textContent = s.displayName.trim() == '' ? 'Your Dash' : `${s.displayName}'s Dash`;
})

configButton.onclick = () => state.setConfigDisplay('initial');
configCloseButton.onclick = () => state.setConfigDisplay('none');
downloadNotezipButton.onclick = () => alert('feature available soon.')
downloadConfigButton.onclick = () => alert('feature available soon.')

nameFieldSubmit.onclick = () => {
    state.setDisplayName(nameField.value);
    nameField.value = '';
}

state.publish();