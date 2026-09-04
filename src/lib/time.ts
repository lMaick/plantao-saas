/**
 * Converte uma data/hora civil em um timezone IANA para um Date UTC (timestamptz).
 *
 * Entrada: "YYYY-MM-DDTHH:mm[:ss]" e um IANA timezone (ex.: "America/Sao_Paulo").
 * Saída: um Date correspondente ao instante UTC daquele wall clock.
 *
 * A conversão usa @date-fns/tz para tratar corretamente o timezone IANA
 * (incluindo DST e mudanças sazonais) e valida por round-trip que a data
 * civil realmente existe (recusa 2026-02-31, 2026-13-01, etc.).
 */
import { TZDate } from "@date-fns/tz";

export function wallClockToUtc(
  wallClock: string,
  timeZone: string,
): Date {
  const match = wallClock.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    throw new Error("Data/hora inválida.");
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr); // 1..12
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr ?? "0");

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    throw new Error("Data/hora inválida.");
  }

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error("Data/hora fora dos limites esperados.");
  }

  // TZDate aceita mês 0-based.
  const tzDate = new TZDate(year, month - 1, day, hour, minute, second, timeZone);
  const utc = new Date(tzDate.getTime());

  // Round-trip: renderizar o instante UTC no mesmo IANA timezone
  // e confirmar que batem com os componentes informados.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utc);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const tzHourRaw = get("hour");
  const tzHour = tzHourRaw === 24 ? 0 : tzHourRaw;

  if (
    get("year") !== year ||
    get("month") !== month ||
    get("day") !== day ||
    tzHour !== hour ||
    get("minute") !== minute ||
    get("second") !== second
  ) {
    throw new Error("Data/hora inválida.");
  }

  return utc;
}

/**
 * Formata um Date (UTC) em um timezone IANA, devolvendo partes nomeadas.
 */
export function formatDateTimeInTimeZone(
  date: Date,
  timeZone: string,
): {
  date: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
} {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  const day = get("day") ?? "";
  const month = get("month") ?? "";
  const year = get("year") ?? "";
  const hour = get("hour") ?? "";
  const minute = get("minute") ?? "";

  return {
    date: `${day}/${month}/${year}`,
    startTime: `${hour}:${minute}`,
    endTime: `${hour}:${minute}`,
    durationLabel: "",
  };
}

/**
 * Extrai os componentes wall clock de um Date em um timezone IANA.
 */
export function getWallClockParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const hour = get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: hour === 24 ? 0 : hour,
    minute: get("minute"),
  };
}

const MONTHS_PT = [
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
  "dez",
];

export function formatShiftDate(date: Date, timeZone: string): string {
  const { day, month, year } = getWallClockParts(date, timeZone);
  return `${String(day).padStart(2, "0")} ${MONTHS_PT[month - 1] ?? ""} ${year}`;
}

export function formatShiftTime(date: Date, timeZone: string): string {
  const { hour, minute } = getWallClockParts(date, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

export function formatCurrencyBRL(cents: number): string {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatCurrency(cents: number, currency: string): string {
  if (currency === "BRL") {
    return formatCurrencyBRL(cents);
  }
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/**
 * Devolve a data civil atual (`YYYY-MM-DD`) em um timezone IANA.
 *
 * Importante: o cálculo é feito a partir do wall clock do usuário, não de
 * `new Date().toISOString().slice(0,10)`, para que regras como "atraso",
 * "vence hoje" e "recebido neste mês" sigam o calendário local.
 */
export function getTodayCivilInTimeZone(
  date: Date,
  timeZone: string,
): string {
  const { year, month, day } = getWallClockParts(date, timeZone);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Devolve o intervalo civil do mês atual (`YYYY-MM-DD`) em um timezone IANA.
 *
 * `start` é o primeiro dia do mês e `end` é o último. Usado para somar
 * pagamentos do mês corrente sem converter `payment_date` (que já é
 * `date` civil) para UTC.
 */
export function getCurrentMonthRangeInTimeZone(
  date: Date,
  timeZone: string,
): { start: string; end: string; year: number; month: number } {
  const { year, month } = getWallClockParts(date, timeZone);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const end = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, year, month };
}
