// India has no daylight saving: IST is always UTC+05:30.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** "20261009" for the IST calendar date of `date`. */
export function istDateStamp(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10).replaceAll('-', '');
}

/** The instant IST midnight began on the IST calendar day containing `date`. */
export function startOfIstDay(date: Date): Date {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

export const DAY_MS = 24 * 60 * 60 * 1000;
