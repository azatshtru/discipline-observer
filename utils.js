const h0Regex = /^#!(.*$)/gim;
const h1Regex = /^#(.*$)/gim;
const h2Regex = /^##(.*$)/gim;
const h3Regex = /^###(.*$)/gim;
const paraRegex = /(^[ \t]*[\p{L}\p{N}\w\d=_~*`:\[\$!].*)/gimu;
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
const smilesChemRegex = /^\$\:\)\n(.*)\n\$/gim;
const commandTagRegex = /^(\@\[.*?\]).*?$/gim;

const inlineLatexRegex = /\$(.*?)\$/gim;
const boldEmphasisRegex = /(\*{1,2})(.*?)\1/gim;
const italicEmphasisRegex = /\_(.*?)\_/gim;
const underlineEmphasisRegex = /\_\_(.*?)\_\_/gim;
const strikethroughEmphasisRegex = /\~(.*?)\~/gim;
const highlightEmphasisRegex = /\=\=(.*?)\=\=/gim;
const googleMaterialIconEmbedRegex = /::(.*?)::/gim;
const spoilerRegex = /\!\!(.*?)\!\!/gim;
const inlineCodeRegex = /`(.*?)`/gim;
const hyperlinkRegex = /\[(.*?)\]\((.*?)\)/gim;

const emphasisSusceptibleTagsRegex = /\<(p|h1|h2|h3|li|td)(.*?)\>(.*?)\<\/\1\>/gim;
const specialCharacterRegex = /[\$\&\[\]\%\^\*\(\)\#\\\/]/gim;

export function renderEmphasis(semiText) {

    const latices = [...semiText.matchAll(inlineLatexRegex), ...semiText.matchAll(/%%%/gim)].sort((a, b) => a.index - b.index)

    const htmlText = semiText
        .replace(inlineLatexRegex, '%%%')
        .replace(inlineCodeRegex, (v, p1) => `<code class="inline-code-block"><span>${p1.replaceAll('<', '\&lt;').replaceAll('>', '\&gt;').replaceAll('_', '&#95;').replaceAll('$', '&#36;').replaceAll('*', '&#42;').replaceAll('=', '&#61;').replaceAll('@', '&#64;').trim()}</span></code>`)
        .replace(googleMaterialIconEmbedRegex, (v, p1) => `<span style="margin: 0; padding: 0; font-size: 165%; font-weight: inherit; vertical-align: text-bottom; line-height: 0.94em" class="material-symbols-outlined">${p1.replaceAll('_', '&#95;')}</span>`)
        .replace(underlineEmphasisRegex, '<u>$1</u>')
        .replace(boldEmphasisRegex, '<b>$2</b>')
        .replace(italicEmphasisRegex, '<i>$1</i>')
        .replace(strikethroughEmphasisRegex, '<s>$1</s>')
        .replace(highlightEmphasisRegex, '<mark>$1</mark>')
        .replace(hyperlinkRegex, (v, p1, p2) => `<a href="${p2.trim()}" target="_blank">${p1}</a>`)
        .split('%%%').map((x, i) => x.concat(latices[i]?latices[i][0]:'')).join('')
        .replace(inlineLatexRegex, (v, p1) => `<span class="inline-equation">${p1.replaceAll('<', '\\lt ').replaceAll('>', '\\gt ')}</span>`)
        .replace(spoilerRegex, '<span class="spoiler">$1</span>')

    return htmlText.trim();
}

export function parseMarkdown(markdownText){
    const htmlText = markdownText
        .replace(codeBlockRegex, (v) => `<pre><code>${v.slice(3, -3).replaceAll('<', '\&lt;').replaceAll('>', '\&gt;').replaceAll('_', '&#95;').replaceAll('$', '&#36;').replaceAll('*', '&#42;').replaceAll('=', '&#61;').replaceAll('@', '&#64;').trim().split('\n').map(x => `<span>${x}</span>`).join('\n')}</code></pre>`)
        .replace(displayLatexRegex, (v, p1) => `<div class="display-equation">${p1.replaceAll('<', '\\lt ').replaceAll('>', '\\gt ')}</div>`)
        .replace(smilesChemRegex, (v, p1) => `<svg class="smiles-structure" data-smiles="${p1}"/>`)
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

export function formatXX(str) {
    return ('00'+str).slice(-2);
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

    if(!isNaN(parseInt(datetime1.hours))) { 
        if(datetime1.hours > 23 || datetime1.hours < 0) { return false; }
        if(datetime1.minutes > 59 || datetime1.minutes < 0) { return false; }
        datetime.setHours(datetime1.hours, datetime1.minutes)
    }
    if(!isNaN(parseInt(datetime1.fhours))) { 
        if(datetime1.fhours > 23 || datetime1.fhours < 1) { return false; }
        if(datetime1.fminutes > 59 || datetime1.fminutes < 0) { return false; }
    }

    return { eventName: eventName, date: datetime, timestring: `${!isNaN(datetime1.hours)?formatXX(datetime.getHours())+':'+formatXX(datetime.getMinutes()):'all day'}${!isNaN(datetime1.fhours) ? (' - '+formatXX(datetime1.fhours)+':'+formatXX(datetime1.fminutes)):''}` };
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

export function ordinal(x) {
    if (x == 0) { return 'the zeroeth'; }
    if (x % 100 > 10 && x % 100 < 20) { return 'the ' + x + 'th' }
    if (x % 10 > 3) { return 'the ' + x + 'th' }
    return 'the ' + x + ({ 1: 'st', 2: 'nd', 3: 'rd' }[x % 10]);
}

export function getAllThursdays(monthIndex, day = 4) {
    const d = new Date(new Date().getFullYear(), monthIndex - 1, 1);
    const l = [];
    while (d.getDay() != day) { d.setDate(d.getDate() + 1) }
    while (d.getMonth() == monthIndex - 1) {
        l.push(new Date(new Date().getFullYear(), 0, (new Date(2024, monthIndex - 1, d.getDate()) - new Date(2024, 0, 0)) / (1000 * 60 * 60 * 24)).getDate());
        d.setDate(d.getDate() + 7);
    }
    return l;
}

export function cronDateList(cron) {
    const monthList = cron.month == '*' ? [...Array(12).keys()].map(x => x + 1) : [cron.month];
    let dateList = []
    monthList.forEach(month => {
        let tempDateList = [];
        if (cron.dom != '*') { tempDateList.push(`${new Date().getFullYear()}/${month}/${cron.dom} `); }
        if (cron.dow != '*') { getAllThursdays(month, cron.dow).forEach(x => tempDateList.push(`${new Date().getFullYear()}/${month}/${x} `)); }
        if (tempDateList.length == 0) {
            [...Array(new Date(new Date().getFullYear(), month, 0).getDate()).keys()].forEach(x => tempDateList.push(`${new Date().getFullYear()}/${month}/${x + 1} `));
        }
        dateList.push(...tempDateList);
    });
    if (cron.hour == '*' && cron.minute == '*') {
        dateList = dateList.map(date => date.concat(''));
        return dateList;
    }
    if (cron.hour != '*') { dateList = dateList.map(date => date.concat(cron.hour)) }
    else { dateList = dateList.map(date => [...Array(24).keys()].map(x => date.concat(parseInt(x) % 24))).flat() }
    if (cron.minute == '*') { dateList = dateList.map(date => date.concat(`:00-${(parseInt(date.at(-1)) + 1) % 24}:00`)); }
    else { dateList = dateList.map(date => date.concat(`:${cron.minute}`)) }
    return dateList;
}

export function cronString(cron) {
    const monthString = cron.month == '*' ? 'every month' : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][cron.month - 1];
    const domString = cron.dom == '*' ? '' : 'on ' + ordinal(cron.dom) + ' of ' + monthString;
    const dowString = cron.dow == '*' ? '' : (cron.dom == '*' ? '' : 'and ') + 'every ' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][cron.dow] + ' of ' + monthString;
    const dateString = (domString + dowString).length == 0 ? 'everyday of ' + monthString : domString + ' ' + dowString;
    if (cron.hour == '*') { return `At ${cron.minute == '*' ? 'every' : ordinal(cron.minute)} minute of every hour ${dateString}` }
    if (cron.minute == '*') { return `From ${cron.hour}:00 to ${parseInt(cron.hour) + 1}:00 ${dateString}` }
    return `At ${cron.hour}:${('00' + cron.minute).slice(-2)} ${dateString}`;
}

export function parseCronExpression(expression) {
    const cron = {
        minute: '*',
        hour: '*',
        dom: '*',
        month: '*',
        dow: '*'
    }
    const cronSeq = expression.split(' ').filter(x=>x.length>0).filter(x => !isNaN(x) || x == '*');
    if (cronSeq.length != 5) { return null; }
    const cronIter = cronSeq[Symbol.iterator]();
    cron.minute = Math.min(Math.max(parseInt(cronIter.next().value), 0), 59);
    cron.hour = Math.min(Math.max(parseInt(cronIter.next().value), 0), 23);
    cron.dom = Math.min(Math.max(parseInt(cronIter.next().value), 1), 31) || cron.dom;
    cron.month = Math.min(Math.max(parseInt(cronIter.next().value), 1), 12) || cron.month;
    cron.dow = Math.min(Math.max(parseInt(cronIter.next().value), 0), 6);
    cron.minute = (cron.minute || cron.minute === 0) ? cron.minute : '*';
    cron.hour = (cron.hour || cron.hour === 0) ? cron.hour : '*';
    cron.dow = (cron.dow || cron.dow === 0) ? cron.dow : '*';

    return cron;
}

export function cronUtilityCheck(expression) {
    const cronRegex = /^(\d\d?|\*) (\d\d?|\*) (\d\d?|\*) (\d\d?|\*) (\d|\*) ([\w\p{L}].*)$/i;
    if(!cronRegex.test(expression.trim())) { return false; }
    return Object.assign(parseCronExpression(expression.match(cronRegex).slice(1, 6).join(' ')), { eventName: expression.match(cronRegex)[6] });
}