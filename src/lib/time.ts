/**
 * Converte uma data/hora civil em um timezone IANA para um Date UTC (timestamptz).
 *
 * Entrada: "YYYY-MM-DDTHH:mm" e um IANA timezone (ex.: "America/Sao_Paulo").
 * Saída: um Date correspondente ao instante UTC daquele wall clock.
 *
 * A estratégia usa Intl.DateTimeFormat para descobrir o offset do timezone
 * no instante alvo e aplica esse offset ao wall clock.
 */
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
  const month = Number(monthStr);
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

  // 1) Constrói um Date com os componentes tratados como UTC para ter uma referência.
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // 2) Descobre qual seria o wall clock no timezone alvo para esse instante.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(asUtc));

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const tzYear = get("year");
  const tzMonth = get("month");
  const tzDay = get("day");
  const tzHour = get("hour");
  const tzMinute = get("minute");
  const tzSecond = get("second");

  // 3) Calcula a diferença entre o wall clock informado e o wall clock observado.
  // Se tzWall > wall, o timezone está adiantado em relação a UTC, então subtraímos.
  const tzWallAsUtc = Date.UTC(
    tzYear,
    tzMonth - 1,
    tzDay,
    tzHour === 24 ? 0 : tzHour,
    tzMinute,
    tzSecond,
  );

  let offsetMinutes = Math.round((tzWallAsUtc - asUtc) / 60000);

  // Caso raro: Intl retorna hour = 24 em vez de 0. Normaliza.
  if (tzHour === 24) {
    offsetMinutes -= 24 * 60;
  }

  // 4) Aplica o offset ao wall clock original.
  return new Date(asUtc - offsetMinutes * 60000);
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
