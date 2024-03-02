import { validateDate, monthName } from '../utils.js';
import { createSignal, createComputed, createEffect } from '../blush.js';

const calendar = document.querySelector('.calendar');
const timeline = document.querySelector('.timeline')
const timelineOpenButton = document.querySelector('#timeline-open');
const timelineCloseButton = document.querySelector('.timeline-close');
const calendarHeading = document.querySelector('.calendar-heading');

const currentYear = createSignal(new Date().getFullYear());
const timelineOpened = createSignal(true);

function CalendarMonth (datestr, eventList={}) {
    const datetime = validateDate(datestr);
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

function renderCalendar() {
    calendar.innerHTML = `<div style="height: ${document.querySelector('.calendar-heading').getBoundingClientRect().height + 12}px;"></div>`;
    for (let i = 0; i < 12; i++) {calendar.appendChild(CalendarMonth(`${currentYear.value}/${i+1}/1`));}
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