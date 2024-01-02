import { downloadWhere, upload, downloadDocument, deleteDocument, downloadFirst, paginatedDownload, setAuthInit, getAuthUser } from "../firebase.js"

const firebaseDelegates = [];

const unsubscribeAuthState = setAuthInit((user) => { firebaseDelegates.forEach(async (f) => await f()); }, () => window.location.replace('/login'));

async function callFirebase(f){
    getAuthUser() ? await f() : firebaseDelegates.push(f);
}

const notesDataObjectModel = {
    notes: {},
    tags: {},
}

const h1Regex = /^#(.*$)/gim;
const paraRegex = /(^[\w\d].*)/gim;
const lineBreakRegex = /^\n$/gim;
const tagLineRegex = /^@(.*$)/gim;
const tagRegex = /@.*?(?=@|$)/gim;

const getTitle = (x) => {
    if (x.trim() == '') { return 'untitled' }
    return x.match(/[\w\d].*/gim)[0];
}

function parseMarkdown(mardownText){
    const htmlText = mardownText
        .replace(h1Regex, '<h1>$1</h1>')
        .replace(paraRegex, '<p>$1</p>')
        .replace(lineBreakRegex, '<br>')
        .replace(tagLineRegex, (v) => v.replace(tagRegex, ' <span class="chip inverted-color display-inline-block">$&</span> ')+'<br>');
    return htmlText.trim();
}

const state = {
    activeTags: [],
    tagSearchText: "",
    currentActiveNoteIndex: 0,
    noteViewMode: 'none',

    subscribers: [],

    subscribe(subscriber){
        this.subscribers.push(subscriber);
    },

    hydrateActiveTags(){
        this.activeTags = this.activeTags.filter(x => x in notesDataObjectModel.tags);
        if(Object.keys(notesDataObjectModel.tags).length < 10) { this.tagSearchText = ''; }
    },

    publish(){
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
        const localTaglist = [...new Set(str.match(tagLineRegex)?.map(x => x.split('@'))
            .flat().map(x => x.trim()).filter(x => x != ""))];
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
    }
}

callFirebase(async () => downloadDocument(['base', 'tags']).then(x => {
    if(x.exists()) { notesDataObjectModel.tags = x.data() }
    state.publish();
}));

let lastDownloadedNote;
let donePagination = false;
async function fillNotesDOM() {
    if (donePagination) { return }
    const docs = await paginatedDownload(lastDownloadedNote, 'index', 50, ['notes']);
    if (docs.docs.length < 50) { donePagination = true }

    docs.forEach(x => notesDataObjectModel.notes[x.id] = x.data());
    lastDownloadedNote = docs.docs[docs.docs.length-1]; 
    state.publish();

    if (document.body.offsetHeight - window.innerHeight < 0.1) {
        await fillNotesDOM();
    }
}
window.addEventListener('scroll', () => {
    if (window.scrollY / (document.body.offsetHeight - window.innerHeight) > 0.5) { fillNotesDOM() }
});
callFirebase(async () => downloadFirst(['notes']).then((x) => {
    if(x.length > 0) {
        x.forEach(doc => notesDataObjectModel.notes[doc.id] = doc.data())
        lastDownloadedNote = x[x.length-1];
        fillNotesDOM();
    }
}));

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
    footer.style.height = '1in';
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

function openNote(s){
    if(s.noteViewMode == 'view'){
        markdownRenderBox.parentElement.style.display = 'initial';
        markdownRenderBox.innerHTML = parseMarkdown(notesDataObjectModel.notes[s.currentActiveNoteIndex].content);
        markdownRenderBox.appendChild(footer());
    } else { markdownRenderBox.parentElement.style.display = 'none'; }
}
state.subscribe(openNote);

function editNote(s){
    if(s.noteViewMode == 'edit'){
        markdownTextarea.value = notesDataObjectModel.notes[s.currentActiveNoteIndex].content;
        markdownTextarea.parentElement.style.display = 'initial';
    } else { markdownTextarea.parentElement.style.display = 'none'; }
}
state.subscribe(editNote);

function updateTagSearchBox(s){
    tagSearchBox.querySelector('input').value = s.tagSearchText;
}
state.subscribe(updateTagSearchBox);

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