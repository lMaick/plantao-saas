"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

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

async function ensureProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("A sessão autenticada é necessária para criar o perfil.");
  }

  const { error } = await supabase.from("profiles").insert({ id: user.id });

  if (error && error.code !== "23505") {
    throw new Error(`Não foi possível criar o perfil: ${error.message}`);
  }
}

async function getAuthConfirmUrl() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto?.split(",")[0] ?? "https";

  if (!host) {
    throw new Error("Não foi possível determinar a origem da aplicação.");
  }

  return `${protocol}://${host}/auth/confirm`;
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

  await ensureProfile(supabase);
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

  await ensureProfile(supabase);
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
