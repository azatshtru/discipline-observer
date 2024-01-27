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

const h0Regex = /^#!(.*$)/gim;
const h1Regex = /^#(.*$)/gim;
const h2Regex = /^##(.*$)/gim;
const h3Regex = /^###(.*$)/gim;
const paraRegex = /(^[\p{L}\p{N}\w\d=_~*\[\$].*)/gimu;
const lineBreakRegex = /^\s*?\n(?=\s)/gim;
const tagLineRegex = /^@(.*$)/gim;
const tagRegex = /@.*?(?=@|$)/gim;
const checkboxRegex = /^(\s*\-?\s*\[)(\s?|x)\](.*$)/gim;
const tableRegex = /^\|(.*\n\|)*.*/gim;
const ulistRegex = /^\-(.*\n(^[^\S\n\r]*\n)?\-)*.*/gim;
const olistRegex = /^\d+(\.|\))(.*\n(^[^\S\n\r]*\n)?\d+(\.|\)))*.*/gim;
const displayLatexRegex = /^\$\$\n?(.*)\n?\$\$$/gim;
const horizontalRuleRegex = /(^\-|^\_)\1{2,}/gim;
const codeBlockRegex = /^```((.*\n)*?)```/gim;
const blockquoteRegex = /^(>.*)(\n>.*)*/gim;

const inlineLatexRegex = /\$(.*?)\$/gim;
const boldEmphasisRegex = /(\*{1,2})(.*?)\1/gim;
const italicEmphasisRegex = /\_(.*?)\_/gim;
const underlineEmphasisRegex = /\_\_(.*?)\_\_/gim;
const strikethroughEmphasisRegex = /\~(.*?)\~/gim;
const highlightEmphasisRegex = /\=\=(.*?)\=\=/gim;
const inlineCodeRegex = /`(.*?)`/gim;
const hyperlinkRegex = /\[(.*?)\]\((.*?)\)/gim;

const emphasisSusceptibleTagsRegex = /\<(p|h1|h2|h3|li|td)\>(.*?)\<\/\1\>/gim;
const specialCharacterRegex = /[\$\&\[\]\%\^\*\(\)\#\\\/]/gim;

const getTitle = (x) => {
    if (x.trim() == '') { return 'untitled' }
    x = x.replace(/^\s*\-?\s*\[x\]/, '');
    return x.match(/[\p{L}\p{N}\w\d].*/gimu)[0];
}

function renderEmphasis(semiText) {

    const latices = [...semiText.matchAll(inlineLatexRegex), ...semiText.matchAll(/%%%/gim)].sort((a, b) => a.index - b.index)

    const htmlText = semiText
        .replace(inlineLatexRegex, '%%%')
        .replace(inlineCodeRegex, (v, p1) => `<code class="inline-code-block">${p1.replaceAll('<', '\&lt').replaceAll('>', '\&gt').trim().split('\n').map(x => `<span>${x}</span>`).join('\n')}</code>`)
        .replace(underlineEmphasisRegex, '<u>$1</u>')
        .replace(boldEmphasisRegex, '<b>$2</b>')
        .replace(italicEmphasisRegex, '<i>$1</i>')
        .replace(strikethroughEmphasisRegex, '<s>$1</s>')
        .replace(highlightEmphasisRegex, '<mark>$1</mark>')
        .replace(hyperlinkRegex, (v, p1, p2) => `<a href="${p2.trim()}" target="_blank">${p1}</a>`)
        .split('%%%').map((x, i) => x.concat(latices[i]?latices[i][0]:'')).join('')
        .replace(inlineLatexRegex, (v, p1) => `<span class="inline-equation">${p1.replaceAll('<', '\\lt ').replaceAll('>', '\\gt ')}</span>`)

    return htmlText.trim();
}

function parseMarkdown(markdownText){
    const htmlText = markdownText
        .replace(blockquoteRegex, (v) => `<blockquote>${parseMarkdown(v.trim().split('\n').map(x => x = x.slice(1, x.length)).join('\n'))}</blockquote>`)
        .replace(codeBlockRegex, (v, p1) => `<pre><code>${p1.replaceAll('<', '\&lt').replaceAll('>', '\&gt').trim().split('\n').map(x => `<span>${x}</span>`).join('\n')}</code></pre>`)
        .replace(displayLatexRegex, (v, p1) => `<div class="display-equation">${p1.replaceAll('<', '\\lt ').replaceAll('>', '\\gt ')}</div>`)
        .replace(h3Regex, '<h3>$1</h3>').replace(h2Regex, '<h2>$1</h2>')
        .replace(h0Regex, '<h1 style="font-size: calc(clamp(2.2em, 11vw, 3.1em))">$1</h1>').replace(h1Regex, '<h1>$1</h1>')
        .replace(horizontalRuleRegex, '<hr class="stylized" rulemark="">')
        .replace(olistRegex, (v) => `<ol>${v.replace(/^\s*\n/gm, '').split('\n').map(x => `<li>${x.replace(/^\d+/gim, '').slice(1, x.length)}</li><hr>`).join('').slice(0, -4)}</ol>`)
        .replace(checkboxRegex, (v, p1, p2, p3) => `<div class="horizontal-flex cross-centered nowrap"><button class="checkbox-outline" data-check="${p2=='x'?'x':'o'}"><span class="material-symbols-outlined">check</span></button><p>${p3}</p></div>`)
        .replace(paraRegex, '<p>$1</p>')
        .replace(lineBreakRegex, '<br>')
        .replace(tagLineRegex, (v) => v.replace(tagRegex, v1 => ` <span class="chip inverted-color display-inline-block">${v1.replace(inlineLatexRegex, '').replace(specialCharacterRegex, '')}</span> `)+'<br>')
        .replace(tableRegex, (v) => `<div style="overflow:scroll"><table>${v.split('\n').map(row => `<tr>${row.slice(1, row.length-(row[row.length-1]=='|')).split('|').map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table></div>`)
        .replace(ulistRegex, (v) => `<ul>${v.replace(/^\s*\n/gm, '').split('\n').map(x => `<li>${x.slice(1, x.length)}</li><hr>`).join('').slice(0, -4)}</ul>`)
        .replace(emphasisSusceptibleTagsRegex, (v, p1, p2) => `<${p1}><span>${renderEmphasis(p2)}</span></${p1}>`)
            
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

        setTimeout(() => {
            markdownRenderBox.querySelectorAll('.display-equation').forEach((x, i) => setTimeout(() => katex.render(String.raw`${x.textContent}`, x, { throwOnError: false, displayMode: true, strict: (errorCode) => errorCode=="newLineInDisplayMode"?'ignore':'warn', }), i*50));
            markdownRenderBox.querySelectorAll('.inline-equation').forEach((x, i) => katex.render(String.raw`${x.textContent}`, x, { throwOnError: false, displayMode: false, newLineInDisplayMode: true, }, i*50));
        }, 500)

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


markdownTextarea.onkeydown = (e) => {
    if(e.key == 'Tab') {
        e.preventDefault();
        const start = markdownTextarea.selectionStart;
        const end = markdownTextarea.selectionEnd;

        markdownTextarea.value = markdownTextarea.value.substring(0, start) + '\t' + markdownTextarea.value.substring(end);
        markdownTextarea.selectionStart = markdownTextarea.selectionEnd = start + 1;
    }
}

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