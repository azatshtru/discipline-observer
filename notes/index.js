const markdownRenderBox = document.querySelector('#markdown-render-box');
const markdownEditButton = document.querySelector('#markdown-edit-button');
const markdownSubmitButton = document.querySelector('#markdown-submit-button');
const markdownTextarea = document.querySelector('#markdown-textarea');

const h1Regex = /^# (.*$)/gim;
const paraRegex = /(^[\w\d].*)\n/gim;
const lineBreakRegex = /^\n$/gim;

function parseMarkdown(mardownText){
    const htmlText = mardownText.replace(h1Regex, '<h1>$1</h1>').replace(paraRegex, '<p>$1</p>').replace(lineBreakRegex, '<br />');
    return htmlText.trim();
}

markdownEditButton.addEventListener('click', () => {
    //read data from server
    markdownTextarea.parentElement.style.display = 'initial';
    markdownEditButton.parentElement.style.display = 'none';
});

markdownSubmitButton.addEventListener('click', () => {
    const htmlString = parseMarkdown(markdownTextarea.value);
    markdownRenderBox.parentElement.style.display = 'initial';
    markdownRenderBox.innerHTML = htmlString;
    markdownTextarea.parentElement.style.display = 'none';
});

const noteButtons = document.querySelectorAll('.note-button');
noteButtons.forEach(x => x.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'initial';
}));

const markdownRenderCloseButton = document.querySelector('#markdown-render-close-button');
markdownRenderCloseButton.addEventListener('click', () => {
    markdownRenderBox.parentElement.style.display = 'none';
});