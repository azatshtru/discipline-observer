export function validateDate(command) {
    const dateRegex = /(\d{4})(\/|\-)(\d\d?)\2(\d\d?)( (\d\d?)\:(\d\d?))?/i;
    if(!dateRegex.test(command.trim())) { return false; }

    const datetime0 = command.trim().match(dateRegex);
    const datetime1 = { year:datetime0[1], month:datetime0[3], date:datetime0[4], hours:datetime0[6], minutes:datetime0[7] }
    Object.keys(datetime1).forEach(x => datetime1[x] = parseInt(datetime1[x]));

    if(datetime1.month > 12 || datetime1.month < 1) { return false; }
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

    return datetime;
}

export function weekday(datetime) {
    return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][datetime.getDay()];
}

export function monthName(datetime) {
    return ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][datetime.getMonth()];
}