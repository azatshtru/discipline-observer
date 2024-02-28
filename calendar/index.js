import { validateDate, monthName } from '../utils.js';
import { createSignal, createComputed, createEffect } from '../blush.js';

const calendar = document.querySelector('.calendar');
calendar.scrollIntoView(false);
const timelineButton = document.querySelector('.timeline-open')
const timelineCloseButton = document.querySelector('.timeline-close')

function calendarMonth (datestr, eventList={}) {
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

const renderCalendarMonths = () => {
    calendar.innerHTML = '<div style="height: 7em;"></div>';
    for (let i = 0; i < 12; i++) {calendar.appendChild(calendarMonth(`${state.currentYear.get_value(renderCalendarMonths)}/${i+1}/1`));}
}
renderCalendarMonths();
