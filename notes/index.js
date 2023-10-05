const notesDataObjectModel = {
    notes: [],
    tags: {},
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

let currentActiveNote;
let currentlyEditing = false;

const activeTagsState = {
    activeTags: [],
    previousTags: [],
    filteredNotes: [],

    subscribers: [],

    subscribe(fn){
        this.subscribers.push(fn);
    },
 
    clearFilters() {
        this.previousTags = [...this.activeTags];
        this.activeTags = [];
        this.filteredNotes = [];
    },

    filter() {
        const semiFilteredNotes = {};
        for(const tag of this.previousTags){
            if(!(tag in notesDataObjectModel.tags)) { continue; }
            this.activeTags.push(tag);
            notesDataObjectModel.tags[tag].forEach(x => {
                if (x in semiFilteredNotes) { semiFilteredNotes[x] += 1; }
                else { semiFilteredNotes[x] = 1; }
            });
        }
        for(const i in semiFilteredNotes){
            if (semiFilteredNotes[i] === this.activeTags.length){
                this.filteredNotes.push(i);
            }
        } 
        this.publish();
    },

    selectTag(tag){
        if(this.activeTags.includes(tag)){
            this.activeTags = this.activeTags.filter(x => x !== tag);
        } else {
            this.activeTags.push(tag);
        }
        this.clearFilters();
        this.filter();
        this.publish();
    },

    publish(){
        for(const fn of this.subscribers){ fn(); }
    }
};

const getTitle = (x) => {
    if (x.trim() == '') { return 'untitled' }
    return x.match(/[\w\d].*/gim)[0];
}

const handleTaglistChanges = () => {
    if (Object.keys(notesDataObjectModel.tags).length == 0){
        noTagsMessage.classList.remove("nodisplay");
    } else {
        noTagsMessage.classList.add("nodisplay");
    }

    if (Object.keys(notesDataObjectModel.tags).length >= 10){
        tagSearchBox.classList.remove("nodisplay");
    } else {
        tagSearchBox.classList.add("nodisplay");
    }
}

const removeTagIfEmpty = (x) => {
    if (notesDataObjectModel.tags[x].length == 0) {
        delete notesDataObjectModel.tags[x];
        document.querySelector(`[data-tagname="${x}"]`).remove();
    }
}

function updateFilterchipUI() {
    document.querySelectorAll(`[data-selected="1"]`).forEach(x => x.dataset.selected = '0');
    activeTagsState.activeTags.forEach(tag => document.querySelector(`[data-tagname="${tag}"]`).dataset.selected = '1');
}
activeTagsState.subscribe(updateFilterchipUI);

function updateFilteredNoteUI() {
    [...notesContainer.children].forEach(x => x.classList.add('nodisplay'));
    activeTagsState.filteredNotes.forEach(noteIndex => notesContainer.children[noteIndex].classList.remove('nodisplay'));
    if(activeTagsState.activeTags.length === 0){[...notesContainer.children].forEach(x => x.classList.remove('nodisplay'))};
}
activeTagsState.subscribe(updateFilteredNoteUI);

function tagChip(content){
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = content;
    chip.dataset.tagname = content;
    chip.dataset.selected = '0';

    chip.addEventListener('click', () => {
        if(currentlyEditing){ return; }
        activeTagsState.selectTag(chip.dataset.tagname);
    });

    return chip;
}

function tonalNoteButton(content){
    const noteButton = document.createElement('div');
    noteButton.classList.add('note-button', 'tonal-button');

    const noteIcon = document.createElement('span');
    noteIcon.className = 'material-symbols-outlined';
    noteIcon.textContent = 'notes';

    noteButton.appendChild(noteIcon);
    const noteTitle = document.createTextNode(content);
    noteButton.appendChild(noteTitle);

    noteButton.addEventListener('click', () => {
        if(currentlyEditing){ return; }
        markdownRenderBox.parentElement.style.display = 'initial';
        currentActiveNote = noteButton.dataset.noteIndex;
        markdownRenderBox.innerHTML = parseMarkdown(notesDataObjectModel.notes[currentActiveNote].content);
        currentlyEditing = true;
    });

    return noteButton;
}

Object.keys(notesDataObjectModel.tags)?.forEach(x => {
    tagsContainer.appendChild(tagChip(x));
});
handleTaglistChanges();

notesDataObjectModel.notes?.forEach((x, i) => {
    const noteButton = tonalNoteButton(getTitle(x.content));
    noteButton.dataset.noteIndex = i;
    notesContainer.appendChild(noteButton);
});

const h1Regex = /^#(.*$)/gim;
const paraRegex = /(^[\w\d].*)/gim;
const lineBreakRegex = /^\n$/gim;
const tagRegex = /^@(.*$)/gim;

function parseMarkdown(mardownText){
    const htmlText = mardownText
        .replace(h1Regex, '<h1>$1</h1>')
        .replace(paraRegex, '<p>$1</p>')
        .replace(lineBreakRegex, '<br />')
        .replace(tagRegex, '<span class="chip inverted-color display-inline-block">$1</span>');
    return htmlText.trim();
}

markdownEditButton.addEventListener('click', () => {
    activeTagsState.clearFilters();
    markdownTextarea.value = notesDataObjectModel.notes[currentActiveNote].content;
    markdownTextarea.parentElement.style.display = 'initial';
    markdownEditButton.parentElement.style.display = 'none';
});

markdownSubmitButton.addEventListener('click', () => {
    notesDataObjectModel.notes[currentActiveNote].tags.forEach(x => {
        notesDataObjectModel.tags[x] = notesDataObjectModel.tags[x].filter(item => item !== currentActiveNote);
        removeTagIfEmpty(x);
        handleTaglistChanges();
    });
    notesDataObjectModel.notes[currentActiveNote].tags = [];
    const editedActiveTaglist = markdownTextarea.value.match(tagRegex);

    editedActiveTaglist?.forEach(x => {
        const currentTag = x.slice(1).trim();
        notesDataObjectModel.notes[currentActiveNote].tags.push(currentTag);
        if (!(currentTag in notesDataObjectModel.tags)) { 
            notesDataObjectModel.tags[currentTag] = [currentActiveNote];
            handleTaglistChanges();
            tagsContainer.appendChild(tagChip(currentTag));
        } else {
            notesDataObjectModel.tags[currentTag].push(currentActiveNote);
        }
    });

    const htmlString = parseMarkdown(markdownTextarea.value);
    notesDataObjectModel.notes[currentActiveNote].content = markdownTextarea.value;
    document.querySelector(`[data-note-index="${currentActiveNote}"]`).lastChild.textContent = getTitle(markdownTextarea.value);
    markdownRenderBox.parentElement.style.display = 'initial';
    markdownRenderBox.innerHTML = htmlString;

    //TODO: Update data in firestore.

    const footer = document.createElement('div');
    footer.style.height = '1in';
    markdownRenderBox.appendChild(footer);

    markdownTextarea.parentElement.style.display = 'none';

    activeTagsState.filter();
});

markdownRenderCloseButton.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'none';
    currentlyEditing = false;
});

addNoteButton.addEventListener('click', () => {
    activeTagsState.clearFilters();

    notesDataObjectModel.notes.push(
        {
            content: `# Untitled document\n\nEdit this with your ideas :)`,
            tags: [],
        }
    );

    const noteButton = tonalNoteButton(getTitle(notesDataObjectModel.notes[notesDataObjectModel.notes.length-1].content));
    noteButton.dataset.noteIndex = notesDataObjectModel.notes.length-1;
    notesContainer.appendChild(noteButton);

    noteButton.click();
});