import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-xl space-y-8 text-center">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            Plantão SaaS
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Mais clareza para cada plantão.
          </h1>
          <p className="text-lg leading-8 text-slate-300">
            Controle seus plantões, recebimentos e valores a receber.
          </p>
        </div>
        <div className="space-y-4">
          <Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            Fundação técnica configurada
          </Button>
          <p className="text-sm text-slate-400">
            O produto será construído em etapas simples e confiáveis.
          </p>
        </div>
      </section>
    </main>
  );
}
