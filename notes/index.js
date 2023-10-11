const notesDataObjectModel = {
    notes: [],
    tags: {},
    deletedIndices: [],
}

const h1Regex = /^#(.*$)/gim;
const paraRegex = /(^[\w\d].*)/gim;
const lineBreakRegex = /^\n$/gim;
const tagRegex = /^@(.*$)/gim;

const getTitle = (x) => {
    if (x.trim() == '') { return 'untitled' }
    return x.match(/[\w\d].*/gim)[0];
}

function parseMarkdown(mardownText){
    const htmlText = mardownText
        .replace(h1Regex, '<h1>$1</h1>')
        .replace(paraRegex, '<p>$1</p>')
        .replace(lineBreakRegex, '<br />')
        .replace(tagRegex, '<span class="chip inverted-color display-inline-block">$1</span>');
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
        if(this.activeTags.length === 0){ return notesDataObjectModel.notes.filter(x => !notesDataObjectModel.deletedIndices.includes(x.index)); }
        return this.activeTags.reduce((intersection, v) => notesDataObjectModel.tags[v].filter(x => intersection.includes(x)), notesDataObjectModel.tags[this.activeTags[0]])
            .map(x => notesDataObjectModel.notes[x]).filter(x => !notesDataObjectModel.deletedIndices.includes(x.index));
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
        str.match(tagRegex)?.map(x => x.slice(1).trim()).forEach(x => {
            notesDataObjectModel.notes[this.currentActiveNoteIndex].tags.push(x);
            if(x in notesDataObjectModel.tags){ notesDataObjectModel.tags[x].push(this.currentActiveNoteIndex) }
            else { notesDataObjectModel.tags[x] = [this.currentActiveNoteIndex] }
        });
        this.publish();
    },

    addNewNote() {
        if(notesDataObjectModel.deletedIndices.length === 0){
            this.currentActiveNoteIndex = notesDataObjectModel.notes.length;
            notesDataObjectModel.notes.push(
                {
                    content: `# Untitled document\n\nEdit this with your ideas :)`,
                    tags: [],
                    index: notesDataObjectModel.notes.length,
                }
            );
        } else {
            this.currentActiveNoteIndex = notesDataObjectModel.deletedIndices[0];
            notesDataObjectModel.deletedIndices.shift();
        }
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
        notesDataObjectModel.deletedIndices.push(i);
        this.currentActiveNoteIndex = i;
        this.updateNotes(`# Untitled document\n\nEdit this with your ideas :)`);
    }
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
function beginNoteDeletion (i) {
    state.setViewMode('none');

    const noteButton = document.querySelector(`[data-note-index="${i}"]`);
    noteButton.innerHTML = `<span class="inverted-span">${noteButton.innerHTML}</span>`;
    noteButton.classList.add('pressnhold');
    
    setTimeout(() => noteButton.style.backgroundPositionX = '0%', 100);
    deleteTimerId = setTimeout(() => state.deleteNote(parseInt(i)), 2700);
}

function cancelNoteDeletion (i) {
    clearTimeout(deleteTimerId);
    const noteButton = document.querySelector(`[data-note-index="${i}"]`);
    noteButton.style.transition = `background-position-x .2s ease-out`;

    setTimeout(() => noteButton.style.backgroundPositionX = '100%', 1);
    setTimeout(() => state.publish(), 200);
}

function noteButton(content, index, callback){
    const noteButton = document.createElement('div');
    noteButton.classList.add('note-button', 'tonal-button');

    noteButton.innerHTML = `<span class="material-symbols-outlined">notes</span>`;
    const noteTitle = document.createTextNode(content);
    noteButton.appendChild(noteTitle);

    noteButton.dataset.noteIndex = index;
    noteButton.addEventListener('click', () => callback());
    
    ['mousedown', 'touchstart'].forEach(e => noteButton.addEventListener(e, () => {
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