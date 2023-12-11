import { signIn } from "../../firebase.js";
import { authenticationServerObject } from "../../setup.js";

const authContainer = document.querySelector('.auth-container');
const authcodeForm = document.forms['authcodeform'];
const authcodeCellContainer = document.querySelector('#authcode');
const loadingScreen = document.querySelector('.loading-screen');

const authcellList = [];
let authcellPointer = 0;

function authcell() {
    const cell = document.createElement('input');
    cell.type = 'text';
    cell.inputMode = 'numeric';
    cell.pattern = '[0-9]*';
    cell.className = 'cell';
    cell.placeholder = '#';
    cell.maxLength = '1';
    cell.contentEditable = false;

    cell.onblur = e => e.target.style.transform = 'scale(100%) rotate(0)';
    cell.onfocus = e => {
        authcellList[authcellPointer].style.transform = 'scale(108%) rotate(4deg)';
        authcellList[authcellPointer].focus();
    }
    cell.oninput = e => {
        if(e.inputType === 'insertText') {
            if(/^[0-9]$/.test(e.data)) {
                authcellPointer = authcellPointer >= authcellList.length - 1 ? authcellList.length - 1 : authcellPointer + 1;
            } else {
                cell.value = '';
            }
        }
        authcellList[authcellPointer].focus()
    }
    cell.onkeydown = e => {
        if(e.key === 'Backspace') {
            if(authcellList.at(-1).value.trim() !== '') {
                authcellList.at(-1).value = '';
                return;
            }
            authcellPointer -= 1;
            if(authcellPointer < 0) {
                authcellPointer = 0;
            }
            authcellList[authcellPointer].value = '';
        }
        authcellList[authcellPointer].focus()
    }

    return cell;
}

for(let i = 0; i < 6; i++){
    const cell = authcell();
    authcellList.push(cell);
    authcodeCellContainer.appendChild(cell);
}

function getAuthcodeFromCells () {
    let code = '';
    authcellList.forEach(c => code+=c.value);
    return code;
}

function toggleLoadingScreen() {
    loadingScreen.style.display = loadingScreen.style.display=='none'?'flex':'none';
    authContainer.style.display = authContainer.style.display=='none'?'flex':'none';
}

const urlParams = new URLSearchParams(window.location.search);
if(!urlParams.get('email')) {
    window.location.replace('/login');
}
const requestEmail = urlParams.get('email');

authcodeForm.onsubmit = e => {
    e.preventDefault();
    if(/^\d{6}$/gm.test(getAuthcodeFromCells())) {
        toggleLoadingScreen();
        fetch(authenticationServerObject.authcodeDomain, {
            method: 'POST',
            body: new URLSearchParams({
                email: requestEmail,
                authcode: getAuthcodeFromCells(),
            }),
        }).then(r => {
            return r.json();
        }).then(async(r) => {
            if('error' in r){
                throw new Error(r['error']);
            }
            signIn(r['token'], (user) => {
                window.location.replace('/');
            }, (code, message) => {
                toggleLoadingScreen();
                authcellList.forEach(x => x.value = '');
                authcellPointer = 0;
                alert('A problem occurred while signing you in.');
            })
        }).catch(error => {
            toggleLoadingScreen();
            console.log(error)
            authcellList.forEach(x => x.value = '');
            authcellPointer = 0;
            if(error.message == 'ERRI7T'){
                alert('the login code you entered was wrong.')
            }
            if(error.message == 'ERRE4E'){
                alert('the login code you entered has expired.')
            }
        });
    } else {
        alert('invalid code entered.');
    }
}

fetch(authenticationServerObject.sendmailDomain, {
    method: 'POST',
    body: new URLSearchParams({
        email: requestEmail,
    }),
}).then(r => {
    return r.json();
}).then(r => {
    if(r['code'] === 'LT5'){
        fetch(authenticationServerObject.sendmailDomain, {
            method: 'POST',
            body: new URLSearchParams({
                email: requestEmail,
                altdevice: '1',
            }),
        }).then(r => {
            return r.json();
        }).then(r => {
            if(r['code'] != 'OK2') {
                throw new Error();
            }
        }).catch(() => {
            alert('some problem occurred while sending you an email, please use your older login code.');
        })
    }
    if(r['code'] === 'EMLNUL'){
        alert('some problem occurred, please try again');
        window.location.replace('/login')
    }
});

loadingScreen.style.display = 'none';

setTimeout(() => {
    alert('your login session has expired, please login again.')
    window.location.replace('/login');
}, 5*60*1000);