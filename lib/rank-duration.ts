/** Rank dates follow the organisation's Jakarta calendar, not elapsed hours. */
export function rankCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function daysAtRank(start: string | null, today: string): number | null {
  const dateValue = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
  };
  const from = start ? dateValue(start) : null;
  const to = dateValue(today);
  if (from === null || to === null || from > to) return null;
  return Math.floor((to - from) / 86_400_000);
}
