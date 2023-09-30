let notesDataObjectModel = {
    notes: [
        {
            content: `# Hi guys
kaise`,
        },
        {
            content: "Hello guys",
        },
        {
            content: "# here is some content",
        },
    ],
    tags: []
}

const getTitle = (x) => {
    if (x.content.trim() == '') { return 'untitled' }
    return x.content.match(/[\w\d].*/gim)[0];
}

const notesContainer = document.querySelector('#notes-container');
notesDataObjectModel.notes.forEach((x, i) => {
    const noteButton = document.createElement('div');
    noteButton.classList.add('note-button', 'tonal-button');

    const noteIcon = document.createElement('span');
    noteIcon.className = 'material-symbols-outlined';
    noteIcon.textContent = 'notes';

    noteButton.appendChild(noteIcon);
    const noteTitle = document.createTextNode(getTitle(x));
    noteButton.appendChild(noteTitle);

    noteButton.dataset.noteIndex = i;

    notesContainer.appendChild(noteButton);
});

let currentActiveNote;

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
    const htmlString = parseMarkdown(markdownTextarea.value);
    notesDataObjectModel.notes[currentActiveNote].content = markdownTextarea.value;
    markdownRenderBox.parentElement.style.display = 'initial';
    markdownRenderBox.innerHTML = htmlString;

    const footer = document.createElement('div');
    footer.style.height = '1in';
    markdownRenderBox.appendChild(footer);

    markdownTextarea.parentElement.style.display = 'none';
});

const noteButtons = document.querySelectorAll('.note-button');
noteButtons.forEach(x => x.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'initial';
    currentActiveNote = x.dataset.noteIndex;
    markdownRenderBox.innerHTML = parseMarkdown(notesDataObjectModel.notes[currentActiveNote].content);
}));

const markdownRenderCloseButton = document.querySelector('#markdown-render-close-button');
markdownRenderCloseButton.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'none';
});