const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez"
] as const;

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

const WEEKDAYS_LONG = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado"
] as const;

const dateLongFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

/**
 * O backend serializa colunas DATE como "AAAA-MM-DDTHH:mm:ss.sssZ".
 * Interpretamos apenas a parte de data, em horário local, para não deslocar o dia.
 */
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  return new Date(value);
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function formatDateLong(value: string): string {
  return dateLongFormatter.format(parseDateOnly(value));
}

export function formatDateShort(value: string): string {
  const date = parseDateOnly(value);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDay(value: string): string {
  return String(parseDateOnly(value).getDate()).padStart(2, "0");
}

export function formatMonthShort(value: string | Date): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  return MONTHS_SHORT[date.getMonth()] ?? "";
}

export function formatWeekdayShort(value: string | Date): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  return WEEKDAYS_SHORT[date.getDay()] ?? "";
}

export function formatWeekdayLong(value: string | Date): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value;
  return WEEKDAYS_LONG[date.getDay()] ?? "";
}

export function formatMonthYear(date: Date): string {
  const full = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(date);
  return full.charAt(0).toUpperCase() + full.slice(1);
}

export function isPastDate(value: string): boolean {
  return parseDateOnly(value).getTime() < startOfToday().getTime();
}

export function isToday(value: string): boolean {
  return toDateOnly(parseDateOnly(value)) === todayDateOnly();
}

export function daysUntil(value: string): number {
  const target = parseDateOnly(value);
  const today = startOfToday();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDay(value: string): string {
  const diff = daysUntil(value);

  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff > 1 && diff <= 7) return `Em ${diff} dias`;
  if (diff < -1 && diff >= -7) return `Há ${Math.abs(diff)} dias`;
  return formatDateShort(value);
}

/** "3:45" ou "—" quando a duração não foi cadastrada. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** "42 min", "1 h 12 min" ou "—". */
export function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

/** "03:45" (mm:ss) usado como valor de campo de formulário. */
export function secondsToInput(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** Converte "3:45", "03:45" ou "3" (minutos) em segundos; null se inválido. */
export function inputToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{1,3}$/.test(trimmed)) {
    const minutes = Number(trimmed);
    return minutes > 0 ? minutes * 60 : null;
  }

  const match = /^(\d{1,3}):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function formatHorario(horario: string): string {
  return horario;
}

export function sortByDateAndTime<
  T extends { horario?: string | null; data?: string; date?: string }
>(items: T[]): T[] {
  const dateOf = (item: T): string => item.data ?? item.date ?? "";

  return [...items].sort((a, b) => {
    const byDate = parseDateOnly(dateOf(a)).getTime() - parseDateOnly(dateOf(b)).getTime();
    if (byDate !== 0) return byDate;
    return (a.horario ?? "00:00").localeCompare(b.horario ?? "00:00");
  });
}
