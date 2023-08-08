export function myDateTimeFormat(date: Date) {
  return `${dayOfTheMonthFormat(date)} ${monthFormat(date)} ${hourFormat(date)}:${minuteFormat(date)}`
}

export function minuteFormat(date: Date) {
  return String(`${date.getMinutes()}`).padStart(2, '0');
}

export function hourFormat(date: Date) {
  return String(`${date.getHours()}`).padStart(2, '0');
}

export function dayOfTheMonthFormat(date: Date) {
  return String(`${date.getDate()}`).padStart(2, '0');
}

export function monthFormat(date: Date) {
  switch (date.getMonth()) {
    case 0: return "Jan";
    case 1: return "Feb";
    case 2: return "Mar";
    case 3: return "Apr";
    case 4: return "May";
    case 5: return "Jun";
    case 6: return "Jul";
    case 7: return "Aug";
    case 8: return "Sep";
    case 9: return "Oct";
    case 10: return "Nov";
    case 11: return "Dec";
    default: return "Invalid month";
  }
}

export function weekDayFormat(date: Date) {
  switch (date.getDay()) {
    case 0: return "Sun";
    case 1: return "Mon";
    case 2: return "Tue";
    case 3: return "Wed";
    case 4: return "Thu";
    case 5: return "Fri";
    case 6: return "Sat";
    default: return "Invalid weekday";
  }
}