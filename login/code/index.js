const authcodeForm = document.forms['authcodeform'];
const authcodeCellContainer = document.querySelector('#authcode');

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
    authcellList.push(cell)
    authcodeCellContainer.appendChild(cell);
}

authcodeForm.onsubmit = e => {

}