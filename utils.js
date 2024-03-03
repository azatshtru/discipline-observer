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