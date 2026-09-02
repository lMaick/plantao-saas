"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

const signUpSchema = credentialsSchema
  .extend({
    confirmation: z.string(),
  })
  .refine((data) => data.password === data.confirmation, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmation"],
  });

export type AuthState = {
  error?: string;
  success?: string;
};

async function getAuthConfirmUrl() {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");

  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin);

      if (origin.protocol === "http:" || origin.protocol === "https:") {
        return `${origin.origin}/auth/confirm`;
      }
    } catch {
      // Fall through to the proxy-aware host headers.
    }
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Não foi possível determinar a origem da aplicação.");
  }

  const normalizedHost = host.split(",")[0].trim();
  const protocol =
    forwardedProto?.split(",")[0].trim() ||
    (normalizedHost.startsWith("localhost:") ||
    normalizedHost.startsWith("127.0.0.1:")
      ? "http"
      : "https");

  return `${protocol}://${normalizedHost}/auth/confirm`;
}

export async function signUp(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: await getAuthConfirmUrl(),
    },
  });

  if (error) {
    return { error: "Não foi possível criar a conta com esses dados." };
  }

  if (!data.session) {
    return {
      success:
        "Conta criada. Confirme seu e-mail para concluir o acesso e entrar.",
    };
  }

  redirect("/app");
}

export async function signIn(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Não foi possível sair: ${error.message}`);
  }

  redirect("/login");
}
