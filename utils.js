const h0Regex = /^#!(.*$)/gim;
const h1Regex = /^#(.*$)/gim;
const h2Regex = /^##(.*$)/gim;
const h3Regex = /^###(.*$)/gim;
const paraRegex = /(^[ \t]*[\p{L}\p{N}\w\d=_~*`:\[\$].*)/gimu;
const lineBreakRegex = /^\s*?\n(?=\s)/gim;
const tagLineRegex = /^@(.*$)/gim;
const tagRegex = /@.*?(?=@|$)/gim;
const checkboxRegex = /^( *\-? *\[)( ?|x)\](.*$)/gim;
const tableRegex = /^\|(.*\n\|)*.*/gim;
const ulistRegex = /^\-(.*\n(^[^\S\n\r]*\n)?\-)*.*/gim;
const olistRegex = /^\d+(\.|\))(.*\n(^[^\S\n\r]*\n)?\d+(\.|\)))*.*/gim;
const displayLatexRegex = /^\$\$\n?(.*)\n?\$\$$/gim;
const horizontalRuleRegex = /(^\-|^\_)\1{2,}/gim;
const codeBlockRegex = /^```(.*\n)*?(.*?)```$/gim;
const blockquoteRegex = /^(>.*)(\n>.*)*/gim;
const progressBarRegex = /^( *\-? *\[)((\d+)\/(\d+))\](.*$)/gim;
const commandTagRegex = /^(\@\[.*?\]).*?$/gim;

const inlineLatexRegex = /\$(.*?)\$/gim;
const boldEmphasisRegex = /(\*{1,2})(.*?)\1/gim;
const italicEmphasisRegex = /\_(.*?)\_/gim;
const underlineEmphasisRegex = /\_\_(.*?)\_\_/gim;
const strikethroughEmphasisRegex = /\~(.*?)\~/gim;
const highlightEmphasisRegex = /\=\=(.*?)\=\=/gim;
const googleMaterialIconEmbedRegex = /::(.*?)::/gim;
const inlineCodeRegex = /`(.*?)`/gim;
const hyperlinkRegex = /\[(.*?)\]\((.*?)\)/gim;

const emphasisSusceptibleTagsRegex = /\<(p|h1|h2|h3|li|td)(.*?)\>(.*?)\<\/\1\>/gim;
const specialCharacterRegex = /[\$\&\[\]\%\^\*\(\)\#\\\/]/gim;

export function renderEmphasis(semiText) {

    const latices = [...semiText.matchAll(inlineLatexRegex), ...semiText.matchAll(/%%%/gim)].sort((a, b) => a.index - b.index)

    const htmlText = semiText
        .replace(inlineLatexRegex, '%%%')
        .replace(inlineCodeRegex, (v, p1) => `<code class="inline-code-block"><span>${p1.replaceAll('<', '\&lt;').replaceAll('>', '\&gt;').trim()}</span></code>`)
        .replace(underlineEmphasisRegex, '<u>$1</u>')
        .replace(boldEmphasisRegex, '<b>$2</b>')
        .replace(italicEmphasisRegex, '<i>$1</i>')
        .replace(strikethroughEmphasisRegex, '<s>$1</s>')
        .replace(highlightEmphasisRegex, '<mark>$1</mark>')
        .replace(googleMaterialIconEmbedRegex, '<span style="margin: 0; padding: 0; font-size: 165%; font-weight: inherit; vertical-align: text-bottom; line-height: 0.94em" class="material-symbols-outlined">$1</span>')
        .replace(hyperlinkRegex, (v, p1, p2) => `<a href="${p2.trim()}" target="_blank">${p1}</a>`)
        .split('%%%').map((x, i) => x.concat(latices[i]?latices[i][0]:'')).join('')
        .replace(inlineLatexRegex, (v, p1) => `<span class="inline-equation">${p1.replaceAll('<', '\\lt ').replaceAll('>', '\\gt ')}</span>`)

    return htmlText.trim();
}

export function parseMarkdown(markdownText){
    const htmlText = markdownText
        .replace(codeBlockRegex, (v) => `<pre><code>${v.slice(3, -3).replaceAll('<', '\&lt;').replaceAll('>', '\&gt;').trim().split('\n').map(x => `<span>${x}</span>`).join('\n')}</code></pre>`)
        .replace(displayLatexRegex, (v, p1) => `<div class="display-equation">${p1.replaceAll('<', '\\lt ').replaceAll('>', '\\gt ')}</div>`)
        .replace(h3Regex, '<h3>$1</h3>').replace(h2Regex, '<h2>$1</h2>')
        .replace(h0Regex, '<h1 style="font-size: calc(clamp(2.2em, 11vw, 3.1em))">$1</h1>').replace(h1Regex, '<h1>$1</h1>')
        .replace(horizontalRuleRegex, '<hr class="stylized" rulemark="">')
        .replace(olistRegex, (v) => `<ol>${v.replace(/^\s*\n/gm, '').split('\n').map(x => `<li value="${x.match(/^\d+/gim)[0]}">${x.replace(/^\d+/gim, '').slice(1, x.length)}</li><hr>`).join('').slice(0, -4)}</ol>`)
        .replace(checkboxRegex, (v, p1, p2, p3) => `<div class="horizontal-flex cross-centered nowrap"><button class="checkbox-outline" data-check="${p2=='x'?'x':'o'}"><span class="material-symbols-outlined">check</span></button><p>${p3}</p></div>`)
        .replace(progressBarRegex, (v, p1, p2, p3, p4, p5) => `<div class="progress-container"><span><span>${p3}</span><span>${p4}</span></span><div class="progress-t"><span>${p5}</span><div class="progress-bar"><div style="--perc:${100*p3/p4}%"></div></div></div><button data-value="${p3}" data-max="${p4}"><span class="material-symbols-outlined">flag</span></button></div>`)
        .replace(paraRegex, '<p>$1</p>')
        .replace(lineBreakRegex, '<br>')
        .replace(commandTagRegex, v => `<div class="commandbox">${v.match(/\@\[.+?\]/gim).map(x => `<span data-command="${x.trim().slice(2, -1)}"><span class="material-symbols-outlined"></span>${x.trim().slice(2, -1)}</span>`).join('')}</div>`)
        .replace(tagLineRegex, (v) => v.replace(tagRegex, v1 => ` <span class="chip inverted-color display-inline-block">${v1.replace(inlineLatexRegex, '').replace(specialCharacterRegex, '')}</span> `)+'<br>')
        .replace(tableRegex, (v) => `<div style="overflow:visible"><table>${v.split('\n').map(row => `<tr>${row.slice(1, row.length-(row[row.length-1]=='|')).split('|').map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table></div>`)
        .replace(ulistRegex, (v) => `<ul>${v.replace(/^\s*\n/gm, '').split('\n').map(x => `<li>${x.slice(1, x.length)}</li><hr>`).join('').slice(0, -4)}</ul>`)
        .replace(emphasisSusceptibleTagsRegex, (v, p1, p2, p3) => `<${p1} ${p2}><span>${renderEmphasis(p3)}</span></${p1}>`)
        .replace(blockquoteRegex, (v) => `<blockquote>${parseMarkdown(v.trim().split('\n').map(x => x = x.slice(1, x.length)).join('\n').replace(tagLineRegex, '&nbsp;$&'))}</blockquote>`)
            
    return htmlText.trim();
}

export function parseDate(command) {
    const dateRegex = /(\d{4})\/(\d\d?)\/(\d\d?)( ((\d\d?)\:(\d\d?))(\-(\d\d?)\:(\d\d?))?)? ([a-zA-Z\p{L}].*)/i;
    if(!dateRegex.test(command.trim())) { return false; }

    const datetime0 = command.trim().match(dateRegex);
    const datetime1 = { year:datetime0[1], month:datetime0[2], date:datetime0[3], hours:datetime0[6], minutes:datetime0[7], fhours: datetime0[9], fminutes: datetime0[10] }
    const eventName = datetime0[11];
    Object.keys(datetime1).forEach(x => datetime1[x] = parseInt(datetime1[x]));

    if(datetime1.month > 12 || datetime1.month < 1) { console.log('here');return false; }
    if(datetime1.year < 0) { return false; }

    const datetime = new Date(datetime1.year, datetime1.month-1, 1);
    datetime.setMonth(datetime.getMonth()+1);
    datetime.setDate(datetime.getDate()-1);
    if(datetime1.date > datetime.getDate() || datetime1.date < 1) { return false; }
    datetime.setDate(datetime1.date);

    if(datetime1.hours) { 
        if(datetime1.hours > 23 || datetime1.hours < 1) { return false; }
        if(datetime1.minutes > 59 || datetime1.minutes < 0) { return false; }
        datetime.setHours(datetime1.hours, datetime1.minutes)
    }
    if(datetime1.fhours) {
        if(datetime1.fhours > 23 || datetime1.fhours < 1) { return false; }
        if(datetime1.fminutes > 59 || datetime1.fminutes < 0) { return false; }
    }

    return { eventName: eventName, date: datetime, timestring: `${datetime.getHours()?datetime.getHours()+':'+datetime.getMinutes():'all day'}${datetime1.fhours ? ' - '+datetime1.fhours+':'+datetime1.fminutes:''}` };
}

export function weekday(datetime) {
    const daylist = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    if(!datetime) { return daylist }
    return daylist[datetime.getDay()];
}

export function monthName(datetime) {
    const monthlist = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    if(!datetime) { return monthlist }
    return monthlist[datetime.getMonth()];
}