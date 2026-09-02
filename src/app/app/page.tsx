import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.id });

  if (profileError && profileError.code !== "23505") {
    throw new Error(`Não foi possível garantir o perfil: ${profileError.message}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-xl space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/20 sm:p-10">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            Plantão SaaS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sua área profissional
          </h1>
          <p className="leading-7 text-slate-300">
            Em breve você poderá organizar seus plantões, recebimentos e valores
            a receber.
          </p>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-white/15 px-5 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}
