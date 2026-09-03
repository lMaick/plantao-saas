"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { wallClockToUtc } from "@/lib/time";

const locationIdSchema = z.string().uuid("Local de trabalho inválido.");

const wallClockSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/,
    "Informe data e hora válidas.",
  );

const notesSchema = z
  .string()
  .trim()
  .max(500, "Observação deve ter no máximo 500 caracteres.")
  .optional();

const amountSchema = z
  .string()
  .trim()
  .max(40, "Valor do plantão inválido.")
  .optional();

const createSchema = z.object({
  location_id: locationIdSchema,
  starts_at: wallClockSchema,
  ends_at: wallClockSchema,
  amount: amountSchema,
  notes: notesSchema,
});

const LOCATION_ERROR = "Local de trabalho inválido ou indisponível.";

export type ShiftFormState = {
  error?: string;
  fieldErrors?: {
    location_id?: string;
    starts_at?: string;
    ends_at?: string;
    amount?: string;
    notes?: string;
  };
};

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

async function loadProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone, default_currency_code")
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o perfil: ${error.message}`);
  }

  return {
    timezone: data?.timezone ?? "America/Sao_Paulo",
    defaultCurrencyCode: data?.default_currency_code ?? "BRL",
  };
}

function parseAmount(value: string | undefined) {
  if (value === undefined) {
    return { cents: null as bigint | null };
  }

  try {
    return { cents: parseAmountToCents(value) };
  } catch (error) {
    return {
      cents: null as bigint | null,
      error: error instanceof Error ? error.message : "Valor inválido.",
    };
  }
}

export async function createScheduledShift(
  _previousState: ShiftFormState,
  formData: FormData,
): Promise<ShiftFormState> {
  const parsed = createSchema.safeParse({
    location_id: formData.get("location_id"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    amount: formData.get("amount") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: ShiftFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "location_id" ||
        key === "starts_at" ||
        key === "ends_at" ||
        key === "amount" ||
        key === "notes"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      error: "Confira os dados informados.",
      fieldErrors,
    };
  }

  const { supabase, user } = await requireUser();
  const profile = await loadProfile(supabase);

  // Valida ownership do local (ativo e próprio).
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id")
    .eq("id", parsed.data.location_id)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (locationError) {
    return { error: "Não foi possível validar o local de trabalho." };
  }

  if (!location) {
    return { error: LOCATION_ERROR };
  }

  // Interpreta datas no timezone do profile.
  let startsAt: Date;
  let endsAt: Date;

  try {
    startsAt = wallClockToUtc(parsed.data.starts_at, profile.timezone);
    endsAt = wallClockToUtc(parsed.data.ends_at, profile.timezone);
  } catch {
    return {
      fieldErrors: {
        starts_at: "Data/hora inválida.",
        ends_at: "Data/hora inválida.",
      },
      error: "Confira os dados informados.",
    };
  }

  if (endsAt.getTime() <= startsAt.getTime()) {
    return {
      fieldErrors: {
        starts_at: "Início deve ser anterior ao fim.",
        ends_at: "Fim deve ser posterior ao início.",
      },
      error: "Confira os dados informados.",
    };
  }

  // Valor.
  const amountInput = parsed.data.amount?.trim();
  const amountResult = parseAmount(amountInput);

  if (amountResult.error) {
    return {
      fieldErrors: { amount: amountResult.error },
      error: "Confira os dados informados.",
    };
  }

  let amountCents: number | null = null;

  if (amountResult.cents !== null) {
    if (amountResult.cents > BigInt(Number.MAX_SAFE_INTEGER)) {
      return {
        fieldErrors: { amount: "Valor do plantão é muito alto." },
        error: "Confira os dados informados.",
      };
    }

    const centsAsNumber = Number(amountResult.cents);
    if (!Number.isInteger(centsAsNumber)) {
      return {
        fieldErrors: { amount: "Valor inválido." },
        error: "Confira os dados informados.",
      };
    }

    amountCents = centsAsNumber;
  }

  const { error } = await supabase.from("shifts").insert({
    user_id: user.id,
    location_id: location.id,
    referrer_contact_id: null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    state: "scheduled",
    amount_cents: amountCents,
    currency_code: profile.defaultCurrencyCode,
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
  });

  if (error) {
    return { error: "Não foi possível cadastrar o plantão." };
  }

  revalidatePath("/app/plantoes");
  return {};
}
