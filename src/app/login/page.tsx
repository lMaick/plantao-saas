import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            Plantão SaaS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="text-slate-400">Entre para acessar sua área profissional.</p>
        </div>
        {params.error === "confirmation" && (
          <p
            role="alert"
            className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200"
          >
            O link de confirmação é inválido ou expirou. Solicite um novo
            cadastro para continuar.
          </p>
        )}
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
