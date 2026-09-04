import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDuration,
  formatShiftDate,
  formatShiftTime,
  getCurrentMonthRangeInTimeZone,
  getTodayCivilInTimeZone,
} from "@/lib/time";

export const dynamic = "force-dynamic";

type LocationOption = {
  id: string;
  name: string;
  kind: string | null;
};

type ShiftRow = {
  id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number | null;
  currency_code: string;
  notes: string | null;
};

type ObligationRow = {
  id: string;
  shift_id: string;
  amount_due_cents: number;
  currency_code: string;
  due_date: string;
};

type PaymentRow = {
  id: string;
  obligation_id: string;
  amount_cents: number;
  currency_code: string;
  payment_date: string;
};

type Receivable = {
  obligationId: string;
  locationName: string;
  balanceCents: number;
  currencyCode: string;
  dueDate: string;
  status: "future" | "due_today" | "overdue";
};

type UpcomingShift = {
  id: string;
  locationName: string;
  locationKind: string | null;
  startsAt: Date;
  endsAt: Date;
  amountCents: number | null;
  currencyCode: string;
};

type DashboardData = {
  user: { id: string; email: string | null } | null;
  timeZone: string;
  today: string;
  totalReceivableCents: number;
  totalOverdueCents: number;
  receivedThisMonthCents: number;
  upcomingShiftsCount: number;
  hasCurrencyMismatch: boolean;
  hasInconsistencies: boolean;
  upcomingShifts: UpcomingShift[];
  receivables: Receivable[];
};

async function loadDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();

  const [
    { data: profile },
    { data: shiftRows, error: shiftsError },
    { data: realizedRows, error: realizedError },
    { data: obligationRows, error: obligationsError },
    { data: paymentRows, error: paymentsError },
  ] = await Promise.all([
    supabase.from("profiles").select("timezone").maybeSingle(),
    supabase
      .from("shifts")
      .select(
        "id, location_id, starts_at, ends_at, amount_cents, currency_code, notes",
      )
      .eq("user_id", user.id)
      .eq("state", "scheduled")
      .order("starts_at", { ascending: true }),
    supabase
      .from("shifts")
      .select(
        "id, location_id, starts_at, ends_at, amount_cents, currency_code, notes",
      )
      .eq("user_id", user.id)
      .eq("state", "realized"),
    supabase
      .from("obligations")
      .select("id, shift_id, amount_due_cents, currency_code, due_date")
      .eq("user_id", user.id)
      .is("voided_at", null),
    supabase
      .from("payments")
      .select("id, obligation_id, amount_cents, currency_code, payment_date")
      .eq("user_id", user.id)
      .is("voided_at", null),
  ]);

  if (shiftsError) {
    throw new Error(
      `Não foi possível carregar os plantões: ${shiftsError.message}`,
    );
  }
  if (realizedError) {
    throw new Error(
      `Não foi possível carregar os plantões realizados: ${realizedError.message}`,
    );
  }
  if (obligationsError) {
    throw new Error(
      `Não foi possível carregar as obrigações: ${obligationsError.message}`,
    );
  }
  if (paymentsError) {
    throw new Error(
      `Não foi possível carregar os recebimentos: ${paymentsError.message}`,
    );
  }

  const timeZone = profile?.timezone ?? "America/Sao_Paulo";
  const today = getTodayCivilInTimeZone(now, timeZone);
  const monthRange = getCurrentMonthRangeInTimeZone(now, timeZone);

  const allShiftRows: ShiftRow[] = [
    ...(((shiftRows ?? []) as ShiftRow[]) || []),
    ...(((realizedRows ?? []) as ShiftRow[]) || []),
  ];
  const referencedLocationIds = Array.from(
    new Set(allShiftRows.map((s) => s.location_id)),
  );

  let referencedLocations: LocationOption[] = [];
  if (referencedLocationIds.length > 0) {
    const { data: referencedRows, error: referencedError } = await supabase
      .from("locations")
      .select("id, name, kind")
      .eq("user_id", user.id)
      .in("id", referencedLocationIds);

    if (referencedError) {
      throw new Error(
        `Não foi possível carregar os locais: ${referencedError.message}`,
      );
    }
    referencedLocations = (referencedRows ?? []) as LocationOption[];
  }
  const locationsById = new Map(
    referencedLocations.map((loc) => [loc.id, loc]),
  );

  const paymentsByObligationId = new Map<string, PaymentRow[]>();
  for (const payment of ((paymentRows ?? []) as PaymentRow[]) || []) {
    const list = paymentsByObligationId.get(payment.obligation_id) ?? [];
    list.push(payment);
    paymentsByObligationId.set(payment.obligation_id, list);
  }

  const obligations = (obligationRows ?? []) as ObligationRow[];
  const realizedShifts = (realizedRows ?? []) as ShiftRow[];

  let totalReceivableCents = 0;
  let totalOverdueCents = 0;
  const receivables: Receivable[] = [];
  const seenCurrencies = new Set<string>();
  let hasCurrencyMismatch = false;
  let hasInconsistencies = false;

  for (const obligation of obligations) {
    seenCurrencies.add(obligation.currency_code);
    const payments = paymentsByObligationId.get(obligation.id) ?? [];

    if (obligation.currency_code !== "BRL") {
      hasCurrencyMismatch = true;
      continue;
    }

    const hasCurrencyMismatchInPayments = payments.some(
      (p) => p.currency_code !== "BRL",
    );
    if (hasCurrencyMismatchInPayments) {
      hasCurrencyMismatch = true;
      hasInconsistencies = true;
      continue;
    }

    const receivedCents = payments.reduce(
      (acc, p) => acc + Number(p.amount_cents ?? 0),
      0,
    );
    const amountDueCents = Number(obligation.amount_due_cents);
    const balanceCents = amountDueCents - receivedCents;

    if (receivedCents > amountDueCents) {
      hasInconsistencies = true;
      continue;
    }

    if (balanceCents > 0) {
      totalReceivableCents += balanceCents;
    }

    if (balanceCents > 0) {
      let status: Receivable["status"];
      if (obligation.due_date < today) {
        status = "overdue";
        totalOverdueCents += balanceCents;
      } else if (obligation.due_date === today) {
        status = "due_today";
      } else {
        status = "future";
      }

      const shift = realizedShifts.find((s) => s.id === obligation.shift_id);
      const location = shift
        ? locationsById.get(shift.location_id)
        : undefined;

      receivables.push({
        obligationId: obligation.id,
        locationName: location?.name ?? "Local removido",
        balanceCents,
        currencyCode: obligation.currency_code,
        dueDate: obligation.due_date,
        status,
      });
    }
  }

  let receivedThisMonthCents = 0;
  for (const payment of ((paymentRows ?? []) as PaymentRow[]) || []) {
    seenCurrencies.add(payment.currency_code);
    if (payment.currency_code !== "BRL") {
      hasCurrencyMismatch = true;
      continue;
    }
    if (payment.payment_date >= monthRange.start &&
      payment.payment_date <= monthRange.end) {
      receivedThisMonthCents += Number(payment.amount_cents ?? 0);
    }
  }

  if (seenCurrencies.size > 1) {
    hasCurrencyMismatch = true;
  }

  const obligationShiftIds = new Set(obligations.map((o) => o.shift_id));
  const missingObligationCount = realizedShifts.filter(
    (s) => !obligationShiftIds.has(s.id),
  ).length;
  if (missingObligationCount > 0) {
    hasInconsistencies = true;
  }

  const upcomingShiftsRaw = ((shiftRows ?? []) as ShiftRow[]) || [];
  const upcomingShifts: UpcomingShift[] = upcomingShiftsRaw
    .filter((s) => new Date(s.starts_at).getTime() >= now.getTime())
    .slice(0, 3)
    .map((shift) => {
      const location = locationsById.get(shift.location_id);
      return {
        id: shift.id,
        locationName: location?.name ?? "Local removido",
        locationKind: location?.kind ?? null,
        startsAt: new Date(shift.starts_at),
        endsAt: new Date(shift.ends_at),
        amountCents:
          shift.amount_cents == null ? null : Number(shift.amount_cents),
        currencyCode: shift.currency_code,
      };
    });

  const upcomingShiftsCount = upcomingShiftsRaw.filter(
    (s) => new Date(s.starts_at).getTime() >= now.getTime(),
  ).length;

  receivables.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const receivablesTop = receivables.slice(0, 3);

  return {
    user: { id: user.id, email: user.email ?? null },
    timeZone,
    today,
    totalReceivableCents,
    totalOverdueCents,
    receivedThisMonthCents,
    upcomingShiftsCount,
    hasCurrencyMismatch,
    hasInconsistencies,
    upcomingShifts,
    receivables: receivablesTop,
  };
}

function formatCivilDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return isoDate;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function receivableStatusLabel(status: Receivable["status"]): {
  label: string;
  tone: string;
} {
  if (status === "overdue") {
    return { label: "Em atraso", tone: "text-amber-300" };
  }
  if (status === "due_today") {
    return { label: "Vence hoje", tone: "text-amber-200" };
  }
  return { label: "A receber", tone: "text-cyan-200" };
}

export default async function AppPage() {
  const dashboard = await loadDashboardData();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300">
            Plantão SaaS
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Olá
          </h1>
          {dashboard.user?.email && (
            <p className="text-sm text-slate-400">{dashboard.user.email}</p>
          )}
        </header>

        {dashboard.hasInconsistencies && (
          <div
            role="note"
            className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100"
          >
            Há dados financeiros que precisam de revisão.
          </div>
        )}
        {dashboard.hasCurrencyMismatch && (
          <div
            role="note"
            className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100"
          >
            Existem valores em moedas diferentes que não foram incluídos nos totais em reais.
          </div>
        )}

        <section
          aria-label="Resumo financeiro"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              A receber
            </p>
            <p className="mt-2 text-2xl font-semibold text-cyan-200">
              {formatCurrency(dashboard.totalReceivableCents, "BRL")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Recebido neste mês
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {formatCurrency(dashboard.receivedThisMonthCents, "BRL")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Em atraso
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">
              {formatCurrency(dashboard.totalOverdueCents, "BRL")}
            </p>
            {dashboard.totalOverdueCents > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Pagamentos com vencimento antes de{" "}
                {formatCivilDate(dashboard.today)}.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Próximos plantões
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {dashboard.upcomingShiftsCount}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Agendados a partir de agora.
            </p>
          </div>
        </section>

        <section aria-label="Próximos plantões" className="space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Próximos plantões
            </h2>
            <Link
              href="/app/plantoes"
              className="text-xs font-medium text-cyan-200 transition hover:text-cyan-100"
            >
              Ver todos os plantões
            </Link>
          </header>
          {dashboard.upcomingShifts.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Nenhum plantão agendado para os próximos dias.
            </p>
          ) : (
            <ul className="space-y-3">
              {dashboard.upcomingShifts.map((shift) => {
                const durationMs =
                  shift.endsAt.getTime() - shift.startsAt.getTime();
                return (
                  <li
                    key={shift.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {shift.locationName}
                    </p>
                    {shift.locationKind && (
                      <p className="text-xs text-slate-400">
                        {shift.locationKind}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-slate-300">
                      {formatShiftDate(shift.startsAt, dashboard.timeZone)}
                    </p>
                    <p className="text-sm text-slate-300">
                      {formatShiftTime(shift.startsAt, dashboard.timeZone)} →{" "}
                      {formatShiftTime(shift.endsAt, dashboard.timeZone)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDuration(durationMs)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-cyan-200">
                      {shift.amountCents == null
                        ? "Valor ainda não definido"
                        : formatCurrency(shift.amountCents, shift.currencyCode)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Valores a receber" className="space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Valores a receber
            </h2>
          </header>
          {dashboard.receivables.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Nenhum valor a receber no momento.
            </p>
          ) : (
            <ul className="space-y-3">
              {dashboard.receivables.map((receivable) => {
                const { label, tone } = receivableStatusLabel(
                  receivable.status,
                );
                return (
                  <li
                    key={receivable.obligationId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {receivable.locationName}
                      </p>
                      <p className="text-xs text-slate-400">
                        Previsto para {formatCivilDate(receivable.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(
                          receivable.balanceCents,
                          receivable.currencyCode,
                        )}
                      </p>
                      <p
                        className={`text-xs font-medium uppercase tracking-wider ${tone}`}
                      >
                        {label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <nav
          aria-label="Atalhos da área profissional"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Link
            href="/app/plantoes"
            className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 transition hover:border-cyan-300 hover:bg-slate-900/70"
          >
            <p className="text-base font-semibold text-white">Plantões</p>
            <p className="text-sm text-slate-400">
              Cadastre e acompanhe seus plantões.
            </p>
          </Link>
          <Link
            href="/app/locais"
            className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 transition hover:border-cyan-300 hover:bg-slate-900/70"
          >
            <p className="text-base font-semibold text-white">
              Locais de trabalho
            </p>
            <p className="text-sm text-slate-400">
              Hospitais, clínicas e unidades onde você realiza plantões.
            </p>
          </Link>
        </nav>

        <form action={signOut}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-white/15 px-5 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
