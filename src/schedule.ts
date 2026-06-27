import { HDate } from "@hebcal/hdate";

// Traditional schedules for reading the whole book of Tehilim on a cycle.
//
// Two fixed divisions are in common liturgical use:
//   • Weekly  (לימי השבוע) — the 150 psalms split across the 7 weekdays.
//   • Monthly (לימי החודש) — the 150 psalms split across the days of the
//     Hebrew month, so the book is completed once per month. Psalm 119 (the
//     long acrostic) is split over two days: 119:1–96 on the 25th and
//     119:97–176 on the 26th.
//
// These boundaries are fixed religious data, not computed. If any range needs
// correcting, edit the tables below — nothing else derives them.

export type PsalmPortion = {
  /** First chapter to open when jumping to this portion. */
  from: number;
  /** Last chapter included in this portion. */
  to: number;
  /** Human-readable range, e.g. "1–29" or "119:1–96". */
  rangeLabel: string;
};

export type WeeklyReading = {
  /** "Sunday" … "Shabbat". */
  dayName: string;
  portion: PsalmPortion;
};

export type MonthlyReading = {
  /** e.g. "25 Sivan". */
  hebrewDate: string;
  /** Day of the Hebrew month, 1–30. */
  dayOfMonth: number;
  portion: PsalmPortion;
  /**
   * True when a 29-day Hebrew month folds the 30th-day portion into the 29th,
   * so the reader knows the 29th covers two portions' worth.
   */
  combinesNextDay: boolean;
};

// Indexed by JS Date.getDay() — 0 = Sunday … 6 = Saturday (Shabbat).
const WEEKLY_DIVISION: { dayName: string; from: number; to: number }[] = [
  { dayName: "Sunday", from: 1, to: 29 },
  { dayName: "Monday", from: 30, to: 50 },
  { dayName: "Tuesday", from: 51, to: 72 },
  { dayName: "Wednesday", from: 73, to: 89 },
  { dayName: "Thursday", from: 90, to: 106 },
  { dayName: "Friday", from: 107, to: 119 },
  { dayName: "Shabbat", from: 120, to: 150 },
];

// Indexed by (day of Hebrew month − 1), so [0] is the 1st, [29] is the 30th.
const MONTHLY_DIVISION: PsalmPortion[] = [
  { from: 1, to: 9, rangeLabel: "1–9" }, // 1
  { from: 10, to: 17, rangeLabel: "10–17" }, // 2
  { from: 18, to: 22, rangeLabel: "18–22" }, // 3
  { from: 23, to: 28, rangeLabel: "23–28" }, // 4
  { from: 29, to: 34, rangeLabel: "29–34" }, // 5
  { from: 35, to: 38, rangeLabel: "35–38" }, // 6
  { from: 39, to: 43, rangeLabel: "39–43" }, // 7
  { from: 44, to: 48, rangeLabel: "44–48" }, // 8
  { from: 49, to: 54, rangeLabel: "49–54" }, // 9
  { from: 55, to: 59, rangeLabel: "55–59" }, // 10
  { from: 60, to: 65, rangeLabel: "60–65" }, // 11
  { from: 66, to: 68, rangeLabel: "66–68" }, // 12
  { from: 69, to: 71, rangeLabel: "69–71" }, // 13
  { from: 72, to: 76, rangeLabel: "72–76" }, // 14
  { from: 77, to: 78, rangeLabel: "77–78" }, // 15
  { from: 79, to: 82, rangeLabel: "79–82" }, // 16
  { from: 83, to: 87, rangeLabel: "83–87" }, // 17
  { from: 88, to: 89, rangeLabel: "88–89" }, // 18
  { from: 90, to: 96, rangeLabel: "90–96" }, // 19
  { from: 97, to: 103, rangeLabel: "97–103" }, // 20
  { from: 104, to: 105, rangeLabel: "104–105" }, // 21
  { from: 106, to: 107, rangeLabel: "106–107" }, // 22
  { from: 108, to: 112, rangeLabel: "108–112" }, // 23
  { from: 113, to: 118, rangeLabel: "113–118" }, // 24
  { from: 119, to: 119, rangeLabel: "119:1–96" }, // 25
  { from: 119, to: 119, rangeLabel: "119:97–176" }, // 26
  { from: 120, to: 134, rangeLabel: "120–134" }, // 27
  { from: 135, to: 139, rangeLabel: "135–139" }, // 28
  { from: 140, to: 144, rangeLabel: "140–144" }, // 29
  { from: 145, to: 150, rangeLabel: "145–150" }, // 30
];

/** Today's portion in the weekly cycle, by day of week. */
export function getWeeklyReading(date: Date = new Date()): WeeklyReading {
  const entry = WEEKLY_DIVISION[date.getDay()];
  return {
    dayName: entry.dayName,
    portion: { from: entry.from, to: entry.to, rangeLabel: `${entry.from}–${entry.to}` },
  };
}

/** Today's portion in the monthly cycle, by day of the Hebrew month. */
export function getMonthlyReading(date: Date = new Date()): MonthlyReading {
  const hd = new HDate(date);
  const day = hd.getDate(); // 1–30
  const hebrewDate = `${day} ${hd.getMonthName()}`;

  // A 29-day Hebrew month has no 30th day, so its 30th-day portion (145–150)
  // is read together with the 29th-day portion (140–144) on the 29th.
  if (day === 29 && hd.daysInMonth() === 29) {
    return {
      hebrewDate,
      dayOfMonth: day,
      portion: { from: 140, to: 150, rangeLabel: "140–150" },
      combinesNextDay: true,
    };
  }

  return {
    hebrewDate,
    dayOfMonth: day,
    portion: { ...MONTHLY_DIVISION[day - 1] },
    combinesNextDay: false,
  };
}
