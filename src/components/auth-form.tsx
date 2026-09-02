"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn, signUp, type AuthState } from "@/lib/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
};

const initialState: AuthState = {};

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [state, action, pending] = useActionState(
    isSignup ? signUp : signIn,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          placeholder="voce@exemplo.com"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          placeholder="Mínimo de 8 caracteres"
        />
      </div>
      {isSignup && (
        <div className="space-y-2">
          <label
            htmlFor="confirmation"
            className="text-sm font-medium text-slate-200"
          >
            Confirmar senha
          </label>
          <input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            placeholder="Repita sua senha"
          />
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
      </button>
      <p className="text-center text-sm text-slate-400">
        {isSignup ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
        <Link
          href={isSignup ? "/login" : "/cadastro"}
          className="font-medium text-cyan-300 hover:text-cyan-200"
        >
          {isSignup ? "Entrar" : "Cadastre-se"}
        </Link>
      </p>
    </form>
  );
}
