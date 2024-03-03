import { parseDate, monthName, weekday } from '../utils.js';
import { createSignal, createEffect } from '../blush.js';
import { setAuthInit, getAuthUser, downloadDocument } from '../firebase.js';

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

const currentYear = createSignal(new Date().getFullYear());
const timelineOpened = createSignal(true);
const timelineDateset = createSignal(new Array(Math.floor((new Date(currentYear.value+1, 0, 0) - new Date(currentYear.value, 0, 0))/(1000*60*60*24))));

createEffect(() => callFirebase(async () => downloadDocument(['base', 'commands']).then(x => {
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
        calendarMonthDays.appendChild(calendarDay);
    }
    calendarMonthContainer.querySelector('div').appendChild(calendarMonthDays);
    return calendarMonthContainer;
}

function TimelineDaybox (day) {
    const daybox = document.createElement('div');
    daybox.className = 'daybox';
    const dayname = `<div class="dayname"><div class="calendar-icon"><span>${monthName(day.date).slice(0, 3)}</span><span>${day.date.getDate()}</span></div><span>${weekday(day.date)}</span></div><hr>`
    daybox.innerHTML = dayname;
    return daybox;
}

function constructTimeline() {
    timeline.lastElementChild.innerHTML = '';
    timelineDateset.value.forEach(x => {
        if(x[0].eventName){
            const daynameMargin = document.createElement('div');
            daynameMargin.style.marginTop = '30px';
            timeline.lastElementChild.appendChild(daynameMargin);
            timeline.lastElementChild.appendChild(TimelineDaybox(x[0]))
            const noteboxContainer = document.createElement('div');
            noteboxContainer.className = 'horizontal-flex';
            x.forEach(ex => {
                const notebox = document.createElement('div');
                notebox.className = 'notebox'
                notebox.innerHTML = `<span>${ex.eventName}</span><span>${ex.timestring}</span>`;
                noteboxContainer.appendChild(notebox);
            })
            timeline.lastElementChild.appendChild(noteboxContainer);
        } else {
            //const simpleDateText = document.createElement('p');
            //simpleDateText.textContent = `${monthName(x[0].date).slice(0,3)} ${x[0].date.getDate()}, ${weekday(x[0].date).slice(0, 3)}`
            //simpleDateText.style.fontFamily = "'Montserrat', monospace";
            //simpleDateText.style.fontSize = 'small';
            //simpleDateText.style.fontWeight = '600';
            //timeline.lastElementChild.appendChild(simpleDateText);
        }
    })
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

createEffect(() => calendarHeading.querySelector('h1').textContent = currentYear.value);

createEffect(() => timeline.style.display = timelineOpened.value?'initial':'none');

timelineOpenButton.onclick = () => {
    timelineOpened.value = true;
}

timelineCloseButton.onclick = () => {
    timelineOpened.value = false;
}

new ResizeObserver(() => {
    renderCalendar();
    timelineOpened.value = window.innerWidth > 650 ? true : timelineOpened.value;
}).observe(calendarHeading);
document.querySelectorAll('.stamp-button').forEach(stampButton => stampButton.innerHTML = `<span class="material-symbols-outlined stamp-icon">${stampButton.dataset.icon}</span><span class="stampchar-container">${[...stampButton.textContent].map((c, i) => `<span style="--charangle:${i*20}deg" class="stamp-span">${c}</span>`).join('')}</span>`);
