import { formatDay, formatMonthShort, formatWeekdayShort } from "../../lib/format";

interface DateBadgeProps {
  date: string;
  variant?: "light" | "purple" | "dark";
  size?: "sm" | "md" | "lg";
}

export function DateBadge({ date, variant = "light", size = "md" }: DateBadgeProps) {
  return (
    <span className={`date-badge date-badge--${variant} date-badge--${size}`} aria-hidden="true">
      <span className="date-badge__weekday">{formatWeekdayShort(date)}</span>
      <strong className="date-badge__day">{formatDay(date)}</strong>
      <span className="date-badge__month">{formatMonthShort(date)}</span>
    </span>
  );
}
