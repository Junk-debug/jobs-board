import type { JobLocation, Money } from "@/entities/job";

const LOCALE = "en-CH";

const UNTITLED_JOB = "Untitled job";

export function formatJobTitle(title: string | null): string {
  return title ?? UNTITLED_JOB;
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Zurich",
});

export function formatMoney(money: Money): string {
  if (!money.currency) {
    return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2 }).format(
      money.amount
    );
  }

  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: money.currency,
  }).format(money.amount);
}

export function formatHourlyWage(money: Money): string {
  return `${formatMoney(money)} / h`;
}

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

export function formatPeriod(from: Date, to: Date | null): string {
  if (!to) {
    return `From ${formatDate(from)}`;
  }

  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function formatLocation(location: JobLocation): string {
  return [location.zip, location.city].filter(Boolean).join(" ");
}
