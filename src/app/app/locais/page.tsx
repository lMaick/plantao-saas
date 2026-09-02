import Link from "next/link";

import { LocationForm } from "@/components/location-form";
import {
  archiveLocation,
  restoreLocation,
} from "@/lib/locations/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LocationRow = {
  id: string;
  name: string;
  kind: string | null;
  archived_at: string | null;
};

async function loadLocations(showArchived: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, locations: [] as LocationRow[] };
  }

  let query = supabase
    .from("locations")
    .select("id, name, kind, archived_at")
    .order("name", { ascending: true });

  if (showArchived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar os locais: ${error.message}`);
  }

  return { user, locations: (data ?? []) as LocationRow[] };
}

type LocationsPageProps = {
  searchParams: Promise<{ arquivados?: string }>;
};

export default async function LocationsPage({
  searchParams,
}: LocationsPageProps) {
  const params = await searchParams;
  const showArchived = params.arquivados === "1";
  const { locations } = await loadLocations(showArchived);

  const isEmpty = locations.length === 0;

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
            <h1 className="text-3xl font-semibold tracking-tight">
              Locais de trabalho
            </h1>
            <p className="text-slate-400">
              Cadastre hospitais, clínicas ou unidades onde você realiza seus
              plantões.
            </p>
          </div>
        </header>

        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/app/locais"
            aria-current={showArchived ? undefined : "page"}
            className={`rounded-full px-3 py-1 transition ${
              showArchived
                ? "border border-white/10 text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
                : "bg-cyan-300 text-slate-950"
            }`}
          >
            Ativos
          </Link>
          <Link
            href="/app/locais?arquivados=1"
            aria-current={showArchived ? "page" : undefined}
            className={`rounded-full px-3 py-1 transition ${
              showArchived
                ? "bg-cyan-300 text-slate-950"
                : "border border-white/10 text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
            }`}
          >
            Arquivados
          </Link>
        </nav>

        {isEmpty ? (
          <section
            className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center"
            aria-live="polite"
          >
            <h2 className="text-xl font-semibold">
              {showArchived
                ? "Nenhum local arquivado."
                : "Você ainda não cadastrou nenhum local de trabalho."}
            </h2>
            <p className="mt-2 text-slate-300">
              {showArchived
                ? "Quando você arquivar um local, ele aparecerá aqui."
                : "Cadastre hospitais, clínicas ou outras unidades onde você realiza seus plantões."}
            </p>
            {!showArchived && (
              <Link
                href="#novo-local"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Cadastrar local
              </Link>
            )}
          </section>
        ) : (
          <ul className="space-y-3" aria-label="Locais">
            {locations.map((location) => (
              <li
                key={location.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-white">
                    {location.name}
                  </p>
                  {location.kind ? (
                    <p className="text-sm text-slate-400">{location.kind}</p>
                  ) : (
                    <p className="text-sm text-slate-500">Sem tipo definido</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {showArchived ? (
                    <form action={restoreLocation}>
                      <input
                        type="hidden"
                        name="id"
                        value={location.id}
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-xl border border-white/15 px-4 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                      >
                        Restaurar
                      </button>
                    </form>
                  ) : (
                    <>
                      <Link
                        href={`/app/locais/${location.id}/editar`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                      >
                        Editar
                      </Link>
                      <form action={archiveLocation}>
                        <input
                          type="hidden"
                          name="id"
                          value={location.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-red-300 hover:text-red-200"
                        >
                          Arquivar
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!showArchived && (
          <section
            id="novo-local"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
            aria-labelledby="novo-local-titulo"
          >
            <header className="mb-4 space-y-1">
              <h2
                id="novo-local-titulo"
                className="text-xl font-semibold text-white"
              >
                Cadastrar novo local
              </h2>
              <p className="text-sm text-slate-400">
                Apenas o nome é obrigatório. O tipo ajuda a identificar o local.
              </p>
            </header>
            <LocationForm mode="create" />
          </section>
        )}
      </div>
    </main>
  );
}
