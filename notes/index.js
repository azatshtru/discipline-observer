let notesDataObjectModel = {
    notes: [
        {
            content: `# Hi guys
kaise`,
            tags: [],
        },
        {
            content: "Hello guys",
            tags: [],
        },
        {
            content: "# here is some content",
            tags: [],
        },
    ],
    tags: {},
}

const getTitle = (x) => {
    if (x.trim() == '') { return 'untitled' }
    return x.match(/[\w\d].*/gim)[0];
}

const removeTagIfEmpty = (x) => {
    if (notesDataObjectModel.tags[x].length == 0) {
        delete notesDataObjectModel.tags[x];
        document.querySelector(`[data-tagname="${x}"]`).remove();
    }
}

function tagChip(content){
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = content;
    chip.dataset.tagname = content;
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

    return noteButton;
}

const tagsContainer = document.querySelector('#tags-container');
Object.keys(notesDataObjectModel.tags)?.forEach(x => {
    tagsContainer.appendChild(tagChip(x));
});

const notesContainer = document.querySelector('#notes-container');
notesDataObjectModel.notes?.forEach((x, i) => {
    const noteButton = tonalNoteButton(getTitle(x.content));
    noteButton.dataset.noteIndex = i;
    notesContainer.appendChild(noteButton);
});

let currentActiveNote;
let currentActiveTaglist;

const markdownRenderBox = document.querySelector('#markdown-render-box');
const markdownEditButton = document.querySelector('#markdown-edit-button');
const markdownSubmitButton = document.querySelector('#markdown-submit-button');
const markdownTextarea = document.querySelector('#markdown-textarea');

const h1Regex = /^#(.*$)/gim;
const paraRegex = /(^[\w\d].*)/gim;
const lineBreakRegex = /^\n$/gim;
const tagRegex = /^@(.*$)/gim;

function parseMarkdown(mardownText){
    const htmlText = mardownText
        .replace(h1Regex, '<h1>$1</h1>')
        .replace(paraRegex, '<p>$1</p>')
        .replace(lineBreakRegex, '<br />')
        .replace(tagRegex, '<span class="chip inverted-color">$1</span>');
    return htmlText.trim();
}

markdownEditButton.addEventListener('click', () => {
    markdownTextarea.value = notesDataObjectModel.notes[currentActiveNote].content;
    markdownTextarea.parentElement.style.display = 'initial';
    markdownEditButton.parentElement.style.display = 'none';
});

markdownSubmitButton.addEventListener('click', () => {
    currentActiveTaglist.forEach(x => {
        notesDataObjectModel.tags[x] = notesDataObjectModel.tags[x].filter(item => item !== currentActiveNote);
        removeTagIfEmpty(x);
    });
    notesDataObjectModel.notes[currentActiveNote].tags = [];
    const editedActiveTaglist = markdownTextarea.value.match(tagRegex);

    editedActiveTaglist?.forEach(x => {
        const currentTag = x.slice(1).trim();
        notesDataObjectModel.notes[currentActiveNote].tags.push(currentTag);
        if (!(currentTag in notesDataObjectModel.tags)) { 
            notesDataObjectModel.tags[currentTag] = [currentActiveNote];
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
});

const noteButtons = document.querySelectorAll('.note-button');
noteButtons.forEach(x => x.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'initial';
    currentActiveNote = x.dataset.noteIndex;
    currentActiveTaglist = notesDataObjectModel.notes[currentActiveNote].tags;
    markdownRenderBox.innerHTML = parseMarkdown(notesDataObjectModel.notes[currentActiveNote].content);
}));

const markdownRenderCloseButton = document.querySelector('#markdown-render-close-button');
markdownRenderCloseButton.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'none';
});