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

    const footer = document.createElement('div');
    footer.style.height = '1in';
    markdownRenderBox.appendChild(footer);

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

/* 
# nothing will begin unless I start writing this shit out.

I am trying to type fast and believe me I am but fuck this shit taking too long to even begin being functional.

ok lets try to reach the end of the page.

I will have to type something really filler up.

I can't seem to think anything.
# here's a heading
# here's another

I wonder if two headings one below the other looks appealing or not.

but fuck this shit anything to make it to the end of the page like it's a real fucking piece of text. And yep I sweared into a note but man this is taking a toll on me.
here's one more filler heading.

and here we go at the end of the fucking page.
and for the most part this seems to be working, only I can't see the upper part so. 
*/