"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const nameSchema = z
  .string({ error: "Informe o nome do local." })
  .trim()
  .min(1, "Informe o nome do local.")
  .max(120, "O nome do local deve ter no máximo 120 caracteres.");

const kindSchema = z
  .string()
  .trim()
  .max(60, "O tipo deve ter no máximo 60 caracteres.")
  .optional();

const idSchema = z.string().uuid("Identificador de local inválido.");

const createSchema = z.object({
  name: nameSchema,
  kind: kindSchema,
});

const updateSchema = z.object({
  id: idSchema,
  name: nameSchema,
  kind: kindSchema,
});

const idOnlySchema = z.object({
  id: idSchema,
});

export type LocationFormState = {
  error?: string;
  fieldErrors?: { name?: string; kind?: string };
};

const NOT_FOUND_ERROR = "Local não encontrado ou indisponível para esta operação.";

function parseKind(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createLocation(
  _previousState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    kind: parseKind(formData.get("kind")),
  });

  if (!parsed.success) {
    const fieldErrors: LocationFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "kind") {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      error: "Confira os dados informados.",
      fieldErrors,
    };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("locations").insert({
    user_id: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind ?? null,
  });

  if (error) {
    return { error: "Não foi possível cadastrar o local." };
  }

  revalidatePath("/app/locais");
  return {};
}

export async function updateLocation(
  _previousState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    kind: parseKind(formData.get("kind")),
  });

  if (!parsed.success) {
    const fieldErrors: LocationFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "kind") {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      error: "Confira os dados informados.",
      fieldErrors,
    };
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Não foi possível atualizar o local." };
  }

  if (!data) {
    return { error: NOT_FOUND_ERROR };
  }

  revalidatePath("/app/locais");
  return {};
}

export async function archiveLocation(formData: FormData) {
  const parsed = idOnlySchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    throw new Error("Identificador de local inválido.");
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("locations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível arquivar o local.");
  }

  if (!data) {
    throw new Error(NOT_FOUND_ERROR);
  }

  revalidatePath("/app/locais");
}

export async function restoreLocation(formData: FormData) {
  const parsed = idOnlySchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    throw new Error("Identificador de local inválido.");
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("locations")
    .update({ archived_at: null })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível restaurar o local.");
  }

  if (!data) {
    throw new Error(NOT_FOUND_ERROR);
  }

  revalidatePath("/app/locais");
}
