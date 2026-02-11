import { endOfWeek, format, isPast, isSameDay, isThisWeek, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function formatJaDate(value: string): string {
  return format(parseISO(value), "yyyy/MM/dd", { locale: ja });
}

export function deadlineLabel(value: string | null, now: Date = new Date()): string {
  if (!value) return "期限なし";

  const due = parseISO(value);
  if (isSameDay(due, now)) return "今日";

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(due, tomorrow)) return "明日";

  if (isPast(due) && !isSameDay(due, now)) {
    return `期限超過 (${formatJaDate(value)})`;
  }

  return formatJaDate(value);
}

export function isInThisWeek(value: string, now: Date = new Date()): boolean {
  const date = parseISO(value);
  return isThisWeek(date, { weekStartsOn: 1 }) && date <= endOfWeek(now, { weekStartsOn: 1 });
}

export function clampDifficulty(value: number): 1 | 2 | 3 | 4 | 5 {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return value as 1 | 2 | 3 | 4 | 5;
}
