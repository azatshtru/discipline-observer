import { downloadWhere, upload, downloadDocument, deleteDocument, downloadFirst, paginatedDownload, setAuthInit, getAuthUser } from "../firebase.js"
import { parseMarkdown, renderEmphasis, parseDate, } from "../utils.js";

const firebaseDelegates = [];

const unsubscribeAuthState = setAuthInit((user) => { firebaseDelegates.forEach(async (f) => await f()); }, () => window.location.replace('/login'));

async function callFirebase(f){
    getAuthUser() ? await f() : firebaseDelegates.push(f);
}

const notesDataObjectModel = {
    notes: {},
    tags: {},
    commands: {},
}

const tagLineRegex = /^@(.*$)/gim;
const commandTagRegex = /^(\@\[.*?\]).*?$/gim;
const inlineLatexRegex = /\$(.*?)\$/gim;
const specialCharacterRegex = /[\$\&\[\]\%\^\*\(\)\#\\\/]/gim;
const displayLatexRegex = /^\$\$\n?(.*)\n?\$\$$/gim;
const codeBlockRegex = /^```(.*\n)*?(.*?)```$/gim;
const blockquoteRegex = /^(>.*)(\n>.*)*/gim;

const getTitle = (x) => {
    if (x.trim() == '') { return 'untitled' }
    x = x.replace(/^\s*\-?\s*\[x\]/, '');
    return x.match(/[\p{L}\p{N}\w\d].*/gimu)[0];
}


const state = {
    activeTags: [],
    tagSearchText: "",
    currentActiveNoteIndex: 0,
    noteViewMode: 'none',
    renderOnPublish: true,
    commandsLoaded: false,
    tagsLoaded: false,
    notesLoadedOnce: false,

    subscribers: [],

    subscribe(subscriber){
        this.subscribers.push(subscriber);
    },

    hydrateActiveTags(){
        this.activeTags = this.activeTags.filter(x => x in notesDataObjectModel.tags);
        if(Object.keys(notesDataObjectModel.tags).length < 10) { this.tagSearchText = ''; }
    },

    publish(){
        if(!this.renderOnPublish) { 
            this.renderOnPublish = true;
            return; 
        }
        this.hydrateActiveTags();
        this.subscribers.forEach(fn => fn(this));
    },

    filteredNotes() {
        this.hydrateActiveTags();
        if(this.activeTags.length === 0){ return Object.values(notesDataObjectModel.notes) }
        const intersected = this.activeTags.reduce((intersection, v) => notesDataObjectModel.tags[v].filter(x => intersection.includes(x)), notesDataObjectModel.tags[this.activeTags[0]])

        const temp = intersected.filter(x => !(x in notesDataObjectModel.notes));
        if(temp.length > 0) {
            downloadWhere(['notes'], ['index', 'in', temp], temp.length).then(x => {
                x.forEach(doc => notesDataObjectModel.notes[doc.id] = doc.data());
                this.publish();
            });
        }

        return intersected.filter(x => x in notesDataObjectModel.notes).map(x => notesDataObjectModel.notes[x]);
    },

    searchedTags() {
        this.hydrateActiveTags();
        if(this.tagSearchText.trim() == '' || Object.keys(notesDataObjectModel.tags).length < 10){ return Object.keys(notesDataObjectModel.tags); }
        return Object.keys(notesDataObjectModel.tags).filter(x => x.includes(this.tagSearchText));
    },
    
    addActiveTag(tag){
        this.activeTags.push(tag);
        this.publish();
    },

    removeActiveTag(tag){
        this.activeTags = this.activeTags.filter(x => x != tag);
        this.publish();
    },

    updateNotes(str) {
        notesDataObjectModel.notes[this.currentActiveNoteIndex].tags.forEach(x => {
            notesDataObjectModel.tags[x] = notesDataObjectModel.tags[x].filter(item => item !== this.currentActiveNoteIndex)
            if (notesDataObjectModel.tags[x].length == 0) { delete notesDataObjectModel.tags[x]; }
        });
        notesDataObjectModel.notes[this.currentActiveNoteIndex].content = str;
        notesDataObjectModel.notes[this.currentActiveNoteIndex].tags = [];
        const localTaglist = [...new Set(str.replace(commandTagRegex, '')?.match(tagLineRegex)?.map(x => x.split('@'))
            .flat().map(x => x.replace(inlineLatexRegex, '').replace(specialCharacterRegex, '').trim()).filter(x => x != ""))];
        localTaglist?.map(x => x.trim()).forEach(x => {
            notesDataObjectModel.notes[this.currentActiveNoteIndex].tags.push(x);
            if(x in notesDataObjectModel.tags){ notesDataObjectModel.tags[x].push(this.currentActiveNoteIndex) }
            else { notesDataObjectModel.tags[x] = [this.currentActiveNoteIndex] }
        });
        callFirebase(async () => upload(['base', 'tags'], notesDataObjectModel.tags));
        if(str.trim() != '') { upload(['notes', this.currentActiveNoteIndex], notesDataObjectModel.notes[this.currentActiveNoteIndex]); }
        this.publish();
    },

    addNewNote() {
        const t = Date.now().toString(36);
        notesDataObjectModel.notes[t] = {
            content: `# Untitled document\n\nEdit this with your ideas :)`,
            tags: [],
            index: t,
        }
        this.currentActiveNoteIndex = Object.keys(notesDataObjectModel.notes).slice(-1)[0];
        this.publish();
    },

    setCurrentActiveNoteIndex(index){
        this.currentActiveNoteIndex = index; 
        this.publish();
    },

    setViewMode(v){
        this.noteViewMode = v;
        this.publish();
    },

    setSearchText(searchStr){
        this.tagSearchText = searchStr;
        this.publish();
    },

    deleteNote(i){
        this.currentActiveNoteIndex = i;
        this.updateNotes('');
        deleteDocument(['notes', i]);
        delete notesDataObjectModel.notes[i];
        this.publish();
    },

    setCommandsLoaded() {
        this.commandsLoaded = true;
        this.publish();
    },

    setTagsLoaded() {
        this.tagsLoaded = true;
        this.publish();
    }
}

callFirebase(async () => downloadDocument(['base', 'tags']).then(x => {
    if(x.exists()) { notesDataObjectModel.tags = x.data() }
    state.setTagsLoaded();
}));
callFirebase(async () => downloadDocument(['base', 'commands']).then(x => {
    if(x.exists()) { notesDataObjectModel.commands = x.data() }
    state.setCommandsLoaded();
}));


let lastDownloadedNote;
let donePagination = false;
async function fillNotesDOM() {
    if (donePagination) { return }
    const docs = await paginatedDownload(lastDownloadedNote, 'index', 50, ['notes']);
    if (docs.docs.length < 50) { 
        state.notesLoadedOnce = true;
        donePagination = true; 
    }

    docs.forEach(x => notesDataObjectModel.notes[x.id] = x.data());
    lastDownloadedNote = docs.docs[docs.docs.length-1]; 
    state.publish();

    if (document.body.offsetHeight - window.innerHeight < 0.1) {
        await fillNotesDOM();
    }
}
window.addEventListener('scroll', async () => {
    if (window.scrollY / (document.body.offsetHeight - window.innerHeight) > 0.5) { 
        if(lastDownloadedNote) {
            await fillNotesDOM() 
        }
    }
});
function loadNotes(s) {
    if(!(s.commandsLoaded && s.tagsLoaded) || s.notesLoadedOnce) { return }
    callFirebase(async () => downloadFirst(['notes']).then((x) => {
        if(x.length > 0) {
            lastDownloadedNote = x[x.length-1];
            x.forEach(doc => notesDataObjectModel.notes[doc.id] = doc.data())
            fillNotesDOM();
            state.publish();
        }
    }));
}
state.subscribe(loadNotes);

const prenote = new URLSearchParams(window.location.search).get('prenote');
if(prenote && prenote.trim() != '') {
    callFirebase(() => downloadDocument(['notes', prenote.trim()]).then(x => {
        if(x.exists()){
            notesDataObjectModel.notes[x.id] = x.data();
            state.setCurrentActiveNoteIndex(x.id);
            state.setViewMode('view');
        }
    }));
}

const markdownRenderBox = document.querySelector('#markdown-render-box');
const markdownEditButton = document.querySelector('#markdown-edit-button');
const markdownSubmitButton = document.querySelector('#markdown-submit-button');
const markdownTextarea = document.querySelector('#markdown-textarea');
const tagsContainer = document.querySelector('#tags-container');
const notesContainer = document.querySelector('#notes-container');
const markdownRenderCloseButton = document.querySelector('#markdown-render-close-button');
const addNoteButton = document.querySelector('#add-note-button');
const noTagsMessage = document.querySelector('#no-tags-msg');
const tagSearchBox = document.querySelector('#tag-search');

function tagChip(content, callback){
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = content;
    chip.dataset.tagname = content;
    chip.dataset.selected = '0';

    chip.addEventListener('click', () => callback(chip.dataset));

    return chip;
}

let deleteTimerId;
let deletionAnimId;
function beginNoteDeletion (i) {
    state.setViewMode('none');

    const noteButton = document.querySelector(`[data-note-index="${i}"]`);
    noteButton.innerHTML = `<span class="inverted-span">${noteButton.innerHTML}</span>`;
    noteButton.classList.add('pressnhold');

    deletionAnimId = setTimeout(() => noteButton.style.backgroundPositionX = '0%', 100);
    deleteTimerId = setTimeout(() => state.deleteNote(i), 2700);
}

function cancelNoteDeletion (i) {
    clearTimeout(deleteTimerId);
    clearTimeout(deletionAnimId);
    const noteButton = document.querySelector(`[data-note-index="${i}"]`);
    noteButton.style.transition = `background-position-x .2s ease-out`;

    setTimeout(() => noteButton.style.backgroundPositionX = '100%');
}

function noteButton(content, index, callback){
    const noteButton = document.createElement('div');
    noteButton.classList.add('note-button', 'tonal-button');

    noteButton.innerHTML = `<span class="material-symbols-outlined">notes</span>`;
    const noteTitle = document.createTextNode(content);
    noteButton.appendChild(noteTitle);

    noteButton.dataset.noteIndex = index;
    noteButton.addEventListener('click', () => callback());
    
    ['mousedown', 'touchstart'].forEach(e => noteButton.addEventListener(e, (ev) => {
        if(ev.touches?.length > 1) { return }
        if(deleteTimerId) {clearTimeout(deleteTimerId)}
        if(state.noteViewMode != 'none') { return }
        deleteTimerId = setTimeout(() => beginNoteDeletion(noteButton.dataset.noteIndex), 500);
    }));
    ['mouseup', 'mouseleave', 'touchcancel', 'touchend'].forEach(e => noteButton.addEventListener(e, () => cancelNoteDeletion(noteButton.dataset.noteIndex)));

    return noteButton;
}

function footer(){
    const footer = document.createElement('div');
    footer.style.height = '1.6in';
    return footer;
}

function renderTags(s){
    document.querySelectorAll('[data-tagname]').forEach(x => x.remove());

    const completeTaglist = Object.keys(notesDataObjectModel.tags);
    if (completeTaglist.length === 0){ noTagsMessage.classList.remove("nodisplay"); } 
    else { noTagsMessage.classList.add("nodisplay"); }
    if (completeTaglist.length >= 10){ tagSearchBox.classList.remove("nodisplay"); } 
    else { tagSearchBox.classList.add("nodisplay"); }

    [...new Set([...s.searchedTags(), ...s.activeTags])]?.forEach(x => tagsContainer.appendChild(tagChip(x, chip => {
        if(state.noteViewMode != 'none') { return }
        if(chip.selected == '0'){ state.addActiveTag(chip.tagname) }
        else { state.removeActiveTag(chip.tagname) }
    })));

    s.activeTags.forEach(tag => document.querySelector(`[data-tagname="${tag}"]`).dataset.selected='1');
}
state.subscribe(renderTags);

function renderNotelist(s){
    notesContainer.innerHTML = '';
    s.filteredNotes()?.forEach(x => notesContainer.appendChild(noteButton(getTitle(x.content), x.index, () => {
        if(state.noteViewMode != 'none') { return }
        state.setCurrentActiveNoteIndex(x.index);
        state.setViewMode('view');
    })));
}
state.subscribe(renderNotelist);

let latexRenderTimeout;
function openNote(s){
    if(s.noteViewMode == 'view'){
        markdownRenderBox.parentElement.style.display = 'initial';
        markdownRenderBox.innerHTML = parseMarkdown(notesDataObjectModel.notes[s.currentActiveNoteIndex].content);

        clearTimeout(latexRenderTimeout);
        latexRenderTimeout = setTimeout(() => {
            markdownRenderBox.querySelectorAll('.display-equation').forEach((x, i) => setTimeout(() => katex.render(String.raw`${x.textContent}`, x, { throwOnError: false, displayMode: true, strict: (errorCode) => errorCode=="newLineInDisplayMode"?'ignore':'warn', }), i));
            markdownRenderBox.querySelectorAll('.inline-equation').forEach((x, i) => katex.render(String.raw`${x.textContent}`, x, { throwOnError: false, displayMode: false, newLineInDisplayMode: true, }, i));
        }, 0)

        markdownRenderBox.appendChild(footer());

    } else { markdownRenderBox.parentElement.style.display = 'none'; }
}
state.subscribe(openNote);

let lineFocusPosition = -1;
let markdownEditFocusTimeout;
function editNote(s){
    if(s.noteViewMode == 'edit'){
        markdownTextarea.value = notesDataObjectModel.notes[s.currentActiveNoteIndex].content;
        markdownTextarea.parentElement.style.display = 'initial';

        if(lineFocusPosition >= 0) {
            markdownTextarea.scrollTop = markdownTextarea.scrollHeight;
            markdownTextarea.selectionStart = markdownTextarea.selectionEnd = lineFocusPosition;
            markdownTextarea.focus();
            if(markdownEditFocusTimeout) { clearTimeout(markdownEditFocusTimeout); }
            markdownEditFocusTimeout = setTimeout(() => { 
                if(markdownTextarea.scrollTop < markdownTextarea.scrollHeight - markdownTextarea.clientHeight) {
                    markdownTextarea.scrollTop -= markdownTextarea.clientHeight/3;
                    markdownTextarea.selectionStart = markdownTextarea.selectionEnd = lineFocusPosition;
                    markdownTextarea.focus();
                }
                lineFocusPosition = -1;
                clearTimeout(markdownEditFocusTimeout);
            }, 0);
        }
        
    } else { markdownTextarea.parentElement.style.display = 'none'; }
}
state.subscribe(editNote);

function updateTagSearchBox(s){
    tagSearchBox.querySelector('input').value = s.tagSearchText;
}
state.subscribe(updateTagSearchBox);

function updateCheckboxes(s) {
    document.querySelectorAll('.checkbox-outline').forEach((x, i) => {
        x.dataset.checkindex = i.toString();
        x.onclick = () => {
            let content = notesDataObjectModel.notes[s.currentActiveNoteIndex].content;
            const checkboxes = content.matchAll(/^(\>*\s*\-?\s*\[)(\s?|x)\](.*$)/gim);
            for(let i = 0; i<x.dataset.checkindex; i++) {checkboxes.next()}
            const checkbox = checkboxes.next().value;
            const i = checkbox.index + checkbox[0].search(/\[/);
            const v = x.dataset.check=='x'?' ':'x';
            content = content.slice(0, i+1).concat(v).concat(content.slice(i+1+(content[i+1]==']'?0:1), content.length));
            state.updateNotes(content);
        }
    })
}
state.subscribe(updateCheckboxes);

function updateProgress (s) {
    document.querySelectorAll('.progress-container > button').forEach((x, i) => {
        x.dataset.progressIndex = i.toString();
        x.onclick = () => {
            let content = notesDataObjectModel.notes[s.currentActiveNoteIndex].content;
            const progresses = content.matchAll(/^(\>*\s*\-?\s*\[)(\d+\/\d+)\](.*$)/gim);
            for(let i = 0; i<x.dataset.progressIndex; i++) {progresses.next()}
            const progress = progresses.next().value;
            const i = progress.index + progress[0].search(/\[/);
            const j = progress.index + progress[0].search(/\]/);
            const v = parseInt(x.dataset.value) + 1;
            content = content.slice(0, i+1).concat(v).concat(`\/${x.dataset.max}`).concat(content.slice(j, content.length));
            x.dataset.value = parseInt(x.dataset.value) + 1;

            const progressValue = x.parentElement.firstChild.firstChild;
            progressValue.textContent = x.dataset.value;
            const progressBar = x.parentElement.querySelector('.progress-bar > div');
            progressBar.style.setProperty('--perc', `${x.dataset.value*100/x.dataset.max}%`);

            state.renderOnPublish = false;
            state.updateNotes(content);
        }
    })
}
state.subscribe(updateProgress);

function executeCommand(command) {
    if(!command) { return; }
    const c = command.dataset.command;
    const datetime = parseDate(c.trim());
    if(datetime) {
        command.firstChild.textContent = 'event';
    } else {
        command.firstChild.textContent = 'error';
    }
}

function updateCommands(s) {
    notesDataObjectModel.commands[s.currentActiveNoteIndex] = [];
    notesDataObjectModel.notes[s.currentActiveNoteIndex]?.content.match(commandTagRegex)?.forEach(x => {
        x.match(/\@\[.+?\]/gim).map(c => c.trim().slice(2, -1).trim()).forEach(command => notesDataObjectModel.commands[s.currentActiveNoteIndex].push(command));
    });
    if(notesDataObjectModel.commands[s.currentActiveNoteIndex].length === 0) { delete notesDataObjectModel.commands[s.currentActiveNoteIndex]; }
    if(s.noteViewMode == 'view'){ document.querySelectorAll('span[data-command]').forEach(executeCommand); }
    if(!s.commandsLoaded){ return; }
    callFirebase(async () => upload(['base', 'commands'], notesDataObjectModel.commands));
}
state.subscribe(updateCommands);

markdownTextarea.onkeydown = (e) => {
    if(e.key == 'Tab') {
        e.preventDefault();
        const start = markdownTextarea.selectionStart;
        const end = markdownTextarea.selectionEnd;

        markdownTextarea.value = markdownTextarea.value.substring(0, start) + '\t' + markdownTextarea.value.substring(end);
        markdownTextarea.selectionStart = markdownTextarea.selectionEnd = start + 1;
    }
}

function deparseNote(element) {
    const deparsed0 = [...element.children];
    let deparsed1 = [];
    for(const el of deparsed0) {
        if(['ul', 'ol'].includes(el.localName)) {
            deparsed1.push(...[...el.children].filter(x => x.localName !== 'hr'));
            continue;
        }
        if(el.firstElementChild?.localName=='table') {
            deparsed1.push(...el.firstChild.firstElementChild.children);
            continue;
        }
        if(el.firstElementChild?.className=='checkbox-outline') {
            deparsed1.push(el.lastElementChild);
            continue;
        }
        if(el.localName=='pre') {
            deparsed1.push(...[...el.firstElementChild.children].filter(x => x.textContent.trim().length !== 0));
            continue;
        }
        if(el.localName == 'span') { continue; }
        if(el.localName == 'br') { continue; }
        if(el.localName == 'blockquote') {
            deparsed1.push(...deparseNote(el));
            continue;
        }
        deparsed1.push(el);
    }
    return deparsed1;
}

function getLookoutElement(e) {
    let lookoutElement = e.target;
    if(lookoutElement==null) { return }
    while(lookoutElement && !['h1', 'h2', 'h3', 'p', 'tr', 'li'].includes(lookoutElement.localName)){
        if(lookoutElement.className=='display-equation') { break; }
        if(lookoutElement.className=='progress-container') { break; }
        if(lookoutElement.className=='commandbox') { break; }
        if(lookoutElement.parentElement && lookoutElement.parentElement.parentElement && lookoutElement.parentElement.parentElement.localName=='pre') { break; }
        lookoutElement = lookoutElement.parentElement;
    }
    return lookoutElement;
}

function getLookoutNote(str, recursionLevel=1) {
    let lookoutFormatted = str
        .replace(codeBlockRegex, (v) => `\`\`\`${v.slice(3, -3).replace(/^\n+/, v => ' '.repeat(v.length*recursionLevel)).replace(/\n+$/, v => ' '.repeat(v.length*recursionLevel))}\`\`\``)
        .replace(displayLatexRegex, (v) => `\$\$${v.slice(2, -2).replace(/^\n+/, v => ' '.repeat(v.length*recursionLevel)).replace(/\n+$/, v => ' '.repeat(v.length*recursionLevel))}\$\$`)
        .replace(blockquoteRegex, (v) => getLookoutNote(v.split('\n').map(x => x = x.slice(1, x.length)).join('\n'), recursionLevel+1).split('\n').map(x => x = '>'.concat(x)).join('\n'))

    return lookoutFormatted;
}

markdownRenderBox.addEventListener('click', (e) => {
    if(e.detail < 3) { return; }
    lineFocusPosition = -1;
    const lookoutElement = getLookoutElement(e);
    if(lookoutElement==null) { return }
    if(lookoutElement.className=='progress-container') { return; }
    lineFocusPosition = 0;
    let lineNumber = deparseNote(markdownRenderBox).indexOf(lookoutElement)+1;
    let position = 0;
    for(const line of getLookoutNote(notesDataObjectModel.notes[state.currentActiveNoteIndex].content).split('\n')){
        position += line.length + 1;
        if(line.trim().length == 0) { continue; }
        if(/^>+$/.test(line.trim())) { continue; }
        if(line.match(tagLineRegex) && !line.match(commandTagRegex)) { continue; }
        lineNumber -= 1;
        if(lineNumber == 0) { break; }
    }
    lineFocusPosition = position-1;
    state.setViewMode('edit')
})

markdownSubmitButton.addEventListener('click', () => {
    state.updateNotes(markdownTextarea.value);
    state.setViewMode('view');
});
addNoteButton.addEventListener('click', () => {
    state.addNewNote();
    state.setViewMode('view');
});
markdownRenderCloseButton.addEventListener('click', () => state.setViewMode('none'));
markdownEditButton.addEventListener('click', () => state.setViewMode('edit'));
tagSearchBox.querySelector('input').addEventListener('input', () => state.setSearchText(tagSearchBox.querySelector('input').value));