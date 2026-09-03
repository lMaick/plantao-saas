import Link from "next/link";

import { ShiftForm } from "@/components/shift-form";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDuration,
  formatShiftDate,
  formatShiftTime,
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

type ShiftWithLocation = ShiftRow & {
  locationName: string;
  locationKind: string | null;
};

async function loadPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      timeZone: "America/Sao_Paulo",
      locations: [] as LocationOption[],
      shifts: [] as ShiftWithLocation[],
    };
  }

  const [
    { data: profile },
    { data: activeLocationRows, error: activeLocationsError },
    { data: shiftRows, error: shiftsError },
  ] = await Promise.all([
    supabase.from("profiles").select("timezone").maybeSingle(),
    supabase
      .from("locations")
      .select("id, name, kind")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("shifts")
      .select(
        "id, location_id, starts_at, ends_at, amount_cents, currency_code, notes",
      )
      .eq("user_id", user.id)
      .eq("state", "scheduled")
      .order("starts_at", { ascending: true }),
  ]);

  if (activeLocationsError) {
    throw new Error(
      `Não foi possível carregar os locais: ${activeLocationsError.message}`,
    );
  }

  if (shiftsError) {
    throw new Error(
      `Não foi possível carregar os plantões: ${shiftsError.message}`,
    );
  }

  const activeLocations = (activeLocationRows ?? []) as LocationOption[];

  // Resolver nomes dos locais REFERENCIADOS pelos plantões (ativos OU arquivados),
  // sem restringir pelo `archived_at`, para preservar o histórico de exibição.
  const referencedLocationIds = Array.from(
    new Set(((shiftRows ?? []) as ShiftRow[]).map((s) => s.location_id)),
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
        `Não foi possível carregar os locais referenciados: ${referencedError.message}`,
      );
    }

    referencedLocations = (referencedRows ?? []) as LocationOption[];
  }

  const locationsById = new Map(referencedLocations.map((loc) => [loc.id, loc]));

  const shifts = ((shiftRows ?? []) as ShiftRow[]).map((shift) => {
    const location = locationsById.get(shift.location_id);
    return {
      ...shift,
      locationName: location?.name ?? "Local removido",
      locationKind: location?.kind ?? null,
    };
  });

  return {
    user,
    timeZone: profile?.timezone ?? "America/Sao_Paulo",
    locations: activeLocations,
    shifts,
  };
}

export default async function ShiftsPage() {
  const { user, timeZone, locations, shifts } = await loadPageData();

  if (!user) {
    return null;
  }

  const hasLocations = locations.length > 0;
  const isEmpty = shifts.length === 0;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-3">
          <Link
            href="/app"
            className="inline-flex items-center text-sm font-medium text-slate-400 transition hover:text-cyan-200"
          >
            ← Voltar para a área profissional
          </Link>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
              Plantão SaaS
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Plantões</h1>
            <p className="text-slate-400">
              Cadastre seus próximos plantões para acompanhar a rotina e os
              valores a receber.
            </p>
          </div>
        </header>

        <section
          className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
          aria-labelledby="lista-titulo"
        >
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 id="lista-titulo" className="text-xl font-semibold text-white">
              Próximos plantões
            </h2>
            {hasLocations && !isEmpty && (
              <Link
                href="#novo-plantao"
                className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
              >
                Novo plantão
              </Link>
            )}
          </header>

          {isEmpty ? (
            <div
              className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-6 text-center"
              aria-live="polite"
            >
              <p className="text-slate-300">
                Nenhum plantão agendado. Cadastre seu próximo plantão para
                começar a organizar sua rotina.
              </p>
              {hasLocations && (
                <Link
                  href="#novo-plantao"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Novo plantão
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Plantões agendados">
              {shifts.map((shift) => {
                const startDate = new Date(shift.starts_at);
                const endDate = new Date(shift.ends_at);
                const duration = formatDuration(
                  endDate.getTime() - startDate.getTime(),
                );

                return (
                  <li
                    key={shift.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-white">
                          {shift.locationName}
                        </p>
                        {shift.locationKind && (
                          <p className="text-sm text-slate-400">
                            {shift.locationKind}
                          </p>
                        )}
                        <p className="text-sm text-slate-300">
                          {formatShiftDate(startDate, timeZone)}
                        </p>
                        <p className="text-sm text-slate-300">
                          {formatShiftTime(startDate, timeZone)} →{" "}
                          {formatShiftTime(endDate, timeZone)}
                        </p>
                        <p className="text-xs text-slate-500">{duration}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        {shift.amount_cents !== null ? (
                          <p className="text-lg font-semibold text-white">
                            {formatCurrency(
                              shift.amount_cents,
                              shift.currency_code,
                            )}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Sem valor definido
                          </p>
                        )}
                      </div>
                    </div>
                    {shift.notes && (
                      <p className="mt-3 whitespace-pre-line text-sm text-slate-300">
                        {shift.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          id="novo-plantao"
          className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
          aria-labelledby="novo-plantao-titulo"
        >
          <header className="mb-4 space-y-1">
            <h2
              id="novo-plantao-titulo"
              className="text-xl font-semibold text-white"
            >
              Cadastrar plantão
            </h2>
            <p className="text-sm text-slate-400">
              Informe o local, o período e, se quiser, o valor combinado.
            </p>
          </header>

          {hasLocations ? (
            <ShiftForm locations={locations} />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-6 text-center">
              <p className="text-slate-300">
                Antes de cadastrar um plantão, cadastre pelo menos um local de
                trabalho.
              </p>
              <Link
                href="/app/locais"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Cadastrar local
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
