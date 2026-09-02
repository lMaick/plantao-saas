import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LocationForm } from "@/components/location-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditLocationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLocationPage({
  params,
}: EditLocationPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, kind, archived_at")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o local: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-3">
          <Link
            href="/app/locais"
            className="inline-flex items-center text-sm font-medium text-slate-400 transition hover:text-cyan-200"
          >
            ← Voltar para locais
          </Link>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
              Plantão SaaS
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Editar local
            </h1>
            <p className="text-slate-400">
              Atualize o nome e o tipo do local. O histórico de plantões e
              pagamentos permanece preservado.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <LocationForm
            mode="edit"
            defaultValues={{
              id: data.id,
              name: data.name,
              kind: data.kind,
            }}
          />
        </section>
      </div>
    </main>
  );
}
