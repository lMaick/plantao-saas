import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            Plantão SaaS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Crie sua conta</h1>
          <p className="text-slate-400">
            Comece a organizar sua rotina profissional com clareza.
          </p>
        </div>
        <AuthForm mode="signup" />
      </section>
    </main>
  );
}
