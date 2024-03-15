import { parseMarkdown, parseDate, monthName, weekday } from '../utils.js';
import { createSignal, createEffect } from '../blush.js';
import { setAuthInit, getAuthUser, downloadDocument, upload } from '../firebase.js';

const firebaseDelegates = [];

const unsubscribeAuthState = setAuthInit((user) => { firebaseDelegates.forEach(async (f) => await f()); }, () => window.location.replace('/login'));

async function callFirebase(f){
    getAuthUser() ? await f() : firebaseDelegates.push(f);
}

const calendar = document.querySelector('.calendar');
const timeline = document.querySelector('.timeline')
const timelineOpenButton = document.querySelector('#timeline-open');
const timelineCloseButton = document.querySelector('#timeline-closed');
const calendarHeading = document.querySelector('.calendar-heading');
const eventNoteContainer = document.querySelector('#event-note-container');

const currentYear = createSignal(new Date().getFullYear());
const timelineOpened = createSignal(false);
const timelineFocus = createSignal('today');
const timelineDateset = createSignal(new Array(Math.floor((new Date(currentYear.value+1, 0, 0) - new Date(currentYear.value, 0, 0))/(1000*60*60*24))));
const currentSelectedEventNote = createSignal('');

let eventCount = 0;

createEffect(() => callFirebase(async () => downloadDocument(['base', 'commands']).then(x => {
    eventCount = 0;
    if(x.exists()) { 
        const eventlist = {}
        Object.entries(x.data()).forEach(entry => {
            if(entry[1].length < 1) { return; }
            entry[1].forEach(e => {
                const datetime = parseDate(e);
                if(!datetime) { return }
                if(datetime.date.getFullYear() != currentYear.value) { return }
                const dateindex = Math.floor((datetime.date - new Date(currentYear.value, 0, 0))/(1000*60*60*24));
                const dateEvents = Object.assign(datetime, {eventNote: entry[0]});
                eventlist[dateindex] ? eventlist[dateindex].push(dateEvents) : eventlist[dateindex] = [dateEvents];
                eventCount += 1;
            })
        })
        timelineDateset.value = [...timelineDateset.value].map((x, i) => eventlist[i]?eventlist[i]:[{date:new Date(parseInt(currentYear.value), 0, i+1)}])
    }
})));


function CalendarMonth (datestr, eventList={}) {
    const datetime = parseDate(datestr)['date'];
    const firstDay = new Date(datetime.getFullYear(), datetime.getMonth(), 1);
    const lastDay = new Date(datetime.getFullYear(), datetime.getMonth()+1, 0);
    
    const calendarMonthContainer = document.createElement('div');
    calendarMonthContainer.className = 'calendar-month';
    calendarMonthContainer.innerHTML = `<h1>${monthName(firstDay)[0].concat(monthName(firstDay).slice(1,).toLowerCase())}</h1><div><div class="calendar-month-week"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div></div>`
    const calendarMonthDays = document.createElement('div');
    calendarMonthDays.className = 'calendar-month-days';

    for (let i = 0; i < 42; i++) {
        const calendarDay = document.createElement('div');
        calendarDay.className = 'calendar-day';
        calendarDay.style.gridColumn = `${Math.floor(i/7)+1} \/ span 1`;
        calendarDay.style.gridRow = `${i%7+1} \/ span 1`;
        if(i >= firstDay.getDay() && i <= firstDay.getDay() + lastDay.getDate() - firstDay.getDate()){
            calendarDay.style.outline = '2px solid black'
            calendarDay.style.zIndex = 100;
            const calendarDaySpan = document.createElement('span');
            calendarDaySpan.textContent = i-firstDay.getDay()+1;
            calendarDay.appendChild(calendarDaySpan);
            const calendarDayContent = document.createElement('p');
            if(eventList[calendarDaySpan.textContent]){
                const glyphColor = parseInt(eventList[calendarDaySpan.textContent])>12 ? '#aaa' : 'black';
                for (let j = 0; j < Math.min(parseInt(eventList[calendarDaySpan.textContent]), 12); j++) {
                    const calendarEventGlyph = document.createElement('span');
                    calendarEventGlyph.className = 'material-symbols-outlined';
                    calendarEventGlyph.textContent = 'close';
                    calendarEventGlyph.style.color = glyphColor;
                    calendarDayContent.appendChild(calendarEventGlyph);
                }
                calendarDay.style.background = 'radial-gradient(gainsboro 50%, whitesmoke 50%)';
                calendarDay.style.backgroundSize = '4px 4px';
                calendarDay.style.transform = 'rotate(-0deg) scale(101%)';
                calendarDaySpan.style.color = 'black';
            }
            if(eventList[calendarDaySpan.textContent] - 12 > 0) {
                const totalNum = document.createElement('div');
                totalNum.textContent = eventList[calendarDaySpan.textContent];
                calendarDayContent.appendChild(totalNum);
            }
            calendarDay.appendChild(calendarDayContent);
        } else {
            calendarDay.style.outline = '1px dashed gray'
        }
        calendarDay.onclick = () => {
            timelineOpened.value = true;
            timelineFocus.value = `${currentYear.value}/${datetime.getMonth()+1}/${i-firstDay.getDay()+1}`;
        }
        calendarMonthDays.appendChild(calendarDay);
    }
    calendarMonthContainer.querySelector('div').appendChild(calendarMonthDays);
    return calendarMonthContainer;
}

function TimelineDaybox (day, isToday) {
    const daybox = document.createElement('div');
    daybox.className = 'daybox';
    const dayname = `<div class="dayname"><div class="calendar-icon"><span>${monthName(day.date).slice(0, 3)}</span><span>${day.date.getDate()}</span></div><span>${weekday(day.date)}</span></div><hr>`
    daybox.innerHTML = dayname;
    daybox.dataset.datescroll = `${currentYear.value}/${day.date.getMonth()+1}/${day.date.getDate()}`;
    if(new Date(day.date.valueOf()).setHours(0, 0, 0, 0) == new Date().setHours(0, 0, 0, 0)) {
        daybox.firstElementChild.lastElementChild.style.font = '2em "Times New Roman", monospace'
        daybox.firstElementChild.lastElementChild.style.paddingLeft = '8px'
        daybox.firstElementChild.lastElementChild.textContent = 'TODAY'
        daybox.firstElementChild.firstElementChild.style.transform = 'rotateY(18deg) rotateX(-18deg) scale(120%)'
        daybox.lastElementChild.style.paddingTop = '9px'
        daybox.style.paddingTop = '12px';
    }
    return daybox;
}

function constructTimeline() {
    if(eventCount > 0){
        timeline.lastElementChild.innerHTML = '';
    }
    timelineDateset.value.forEach(x => {
        if(x[0].eventName){
            const daynameMargin = document.createElement('div');
            daynameMargin.style.marginTop = '30px';
            timeline.lastElementChild.appendChild(daynameMargin);
            timeline.lastElementChild.appendChild(TimelineDaybox(x[0]))
            const noteboxContainer = document.createElement('div');
            noteboxContainer.className = 'horizontal-flex';
            x.toSorted((a, b) => a.timestring < b.timestring ? -1 : 1).forEach(ex => {
                const notebox = document.createElement('div');
                notebox.className = 'notebox'
                notebox.innerHTML = `<span>${ex.eventName}</span><span>${ex.timestring}</span>`;
                notebox.onclick = () => {
                    currentSelectedEventNote.value = ex.eventNote;
                }
                noteboxContainer.appendChild(notebox);
            })
            timeline.lastElementChild.appendChild(noteboxContainer);
        }
    })
    const footerMargin = document.createElement('div');
    footerMargin.style.height = '50px';
    timeline.lastElementChild.appendChild(footerMargin);
    timelineOpened.value = true;
    timelineFocus.value = (new Date).toISOString().split('T')[0].split('-').map(x => parseInt(x)).join('/');
}
createEffect(constructTimeline);

function renderCalendar() {
    calendar.innerHTML = `<div style="height: ${document.querySelector('.calendar-heading').getBoundingClientRect().height + 12}px;"></div>`;
    let k = 0;
    for (let i = 0; i < 12; i++) {
        const monthEvents = {}
        const lastDay = new Date(currentYear.value, i+1, 0).getDate();
        timelineDateset.value.slice(k, k+lastDay).forEach((x, i) => x[0].eventName?monthEvents[i]=x.length:'');
        k += lastDay;
        calendar.appendChild(CalendarMonth(`${currentYear.value}/${i+1}/1 hello`, monthEvents));
    }
}
createEffect(renderCalendar);

createEffect(() => {
    if(timelineFocus.value == '') { return; }
    if(timelineOpened.value == true) {
        timeline.querySelector(`.daybox[data-datescroll="${timelineFocus.value}"]`)?.scrollIntoView(true);
        timelineFocus.value = '';
    }
})

createEffect(() => calendarHeading.querySelector('h1').textContent = currentYear.value);

createEffect(() => timeline.style.display = timelineOpened.value?'initial':'none');

let latexRenderTimeout;
createEffect(() => {
    if(currentSelectedEventNote.value.length === 0) {
        eventNoteContainer.style.display = 'none';
        eventNoteContainer.firstElementChild.lastElementChild.href = '';
        document.body.style.overflow = 'scroll';
    } else {
        eventNoteContainer.firstElementChild.lastElementChild.href = `/notes?prenote=${currentSelectedEventNote.value}`;
        const eventNote = eventNoteContainer.querySelector('#event-note');
        eventNote.innerHTML = '';
        eventNoteContainer.style.display = 'initial';
        callFirebase(() => downloadDocument(['notes', currentSelectedEventNote.value]).then(x => {
            if(x.exists()) { 
                const eventNoteData = x.data();
                eventNote.innerHTML = parseMarkdown(eventNoteData.content);
                eventNote.querySelectorAll('.checkbox-outline').forEach((box, i) => {
                    box.dataset.checkindex = i.toString();
                    box.onclick = () => {
                        let content = eventNoteData.content;
                        const checkboxes = content.matchAll(/^(\>*\s*\-?\s*\[)(\s?|x)\](.*$)/gim);
                        for (let i = 0; i < box.dataset.checkindex; i++) { checkboxes.next() }
                        const checkbox = checkboxes.next().value;
                        const i = checkbox.index + checkbox[0].search(/\[/);
                        const v = box.dataset.check == 'x' ? ' ' : 'x';
                        content = content.slice(0, i + 1).concat(v).concat(content.slice(i + 1 + (content[i + 1] == ']' ? 0 : 1), content.length));
                        eventNoteData.content = content;
                        callFirebase(() => upload(['notes', eventNoteData.index], eventNoteData));
                        box.dataset.check = v=='x'?'x':'o';
                    }
                })
                eventNote.querySelectorAll('.progress-container > button').forEach((box, i) => {
                    box.dataset.progressIndex = i.toString();
                    box.onclick = () => {
                        let content = eventNoteData.content;
                        const progresses = content.matchAll(/^(\>*\s*\-?\s*\[)(\d+\/\d+)\](.*$)/gim);
                        for (let i = 0; i < box.dataset.progressIndex; i++) { progresses.next() }
                        const progress = progresses.next().value;
                        const i = progress.index + progress[0].search(/\[/);
                        const j = progress.index + progress[0].search(/\]/);
                        const v = parseInt(box.dataset.value) + 1;
                        content = content.slice(0, i + 1).concat(v).concat(`\/${box.dataset.max}`).concat(content.slice(j, content.length));
                        box.dataset.value = parseInt(box.dataset.value) + 1;

                        const progressValue = box.parentElement.firstChild.firstChild;
                        progressValue.textContent = box.dataset.value;
                        const progressBar = box.parentElement.querySelector('.progress-bar > div');
                        progressBar.style.setProperty('--perc', `${box.dataset.value * 100 / box.dataset.max}%`);

                        eventNoteData.content = content;
                        callFirebase(() => upload(['notes', eventNoteData.index], eventNoteData));
                    }
                })
            clearTimeout(latexRenderTimeout);
            latexRenderTimeout = setTimeout(() => {
                eventNote.querySelectorAll('.display-equation').forEach((k, i) => setTimeout(() => katex.render(String.raw`${k.textContent}`, k, { throwOnError: false, displayMode: true, strict: (errorCode) => errorCode=="newLineInDisplayMode"?'ignore':'warn', }), i));
                eventNote.querySelectorAll('.inline-equation').forEach((k, i) => katex.render(String.raw`${k.textContent}`, k, { throwOnError: false, displayMode: false, newLineInDisplayMode: true, }, i));
            }, 0);
            }
        }));
        document.body.style.overflow = 'hidden';
    }
});

timelineOpenButton.onclick = () => {
    timelineOpened.value = true;
}

timelineCloseButton.onclick = () => {
    timelineOpened.value = false;
}

eventNoteContainer.firstElementChild.firstElementChild.onclick = () => {
    currentSelectedEventNote.value = ''
};

new ResizeObserver(() => {
    renderCalendar();
    timelineOpened.value = window.innerWidth > 650 ? true : timelineOpened.value;
}).observe(calendarHeading);
document.querySelectorAll('.stamp-button').forEach(stampButton => stampButton.innerHTML = `<span class="material-symbols-outlined stamp-icon">${stampButton.dataset.icon}</span><span class="stampchar-container">${[...stampButton.textContent].map((c, i) => `<span style="--charangle:${i*20}deg" class="stamp-span">${c}</span>`).join('')}</span>`);
