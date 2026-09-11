import { HebrewCalendar, flags } from '@hebcal/core';
import { dateToKey } from './dateUtils';

const HOLIDAY_NAMES: Record<string, string> = {
  'Rosh Hashana': 'ראש השנה',
  'Yom Kippur': 'יום כיפור',
  'Sukkot': 'סוכות',
  'Shmini Atzeret': 'שמחת תורה',
  'Chanukah': 'חנוכה',
  'Tu BiShvat': 'ט"ו בשבט',
  'Purim': 'פורים',
  'Shushan Purim': 'שושן פורים',
  'Pesach': 'פסח',
  'Yom HaShoah': 'יום השואה',
  'Yom HaZikaron': 'יום הזיכרון',
  "Yom HaAtzma'ut": 'יום העצמאות',
  'Lag BaOmer': 'ל"ג בעומר',
  'Yom Yerushalayim': 'יום ירושלים',
  'Shavuot': 'שבועות',
  "Tish'a B'Av": 'תשעה באב',
};

const yearCache = new Map<number, Map<string, string>>();

function computeYear(year: number): Map<string, string> {
  const map = new Map<string, string>();

  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
    noMinorFast: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
  });

  for (const ev of events) {
    const name = HOLIDAY_NAMES[ev.basename()];
    if (!name) continue;
    if ((ev.getFlags() & flags.EREV) !== 0) continue;

    const key = dateToKey(ev.getDate().greg());
    if (!map.has(key)) map.set(key, name);
  }

  return map;
}

export function getHolidayName(dateKey: string): string | undefined {
  const year = Number(dateKey.slice(0, 4));
  let map = yearCache.get(year);
  if (!map) {
    map = computeYear(year);
    yearCache.set(year, map);
  }
  return map.get(dateKey);
}
