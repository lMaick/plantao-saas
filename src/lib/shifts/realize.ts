"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data prevista inválida.");

const realizeSchema = z.object({
  shift_id: z.string().uuid("Plantão inválido."),
  amount: z
    .string()
    .trim()
    .max(40, "Valor do plantão inválido.")
    .min(1, "Informe o valor final do plantão."),
  due_date: isoDateSchema,
});

const LOCATION_ARCHIVED_ERROR =
  "Este local está arquivado. Restaure o local antes de concluir este plantão.";

export type RealizeFormState = {
  error?: string;
  fieldErrors?: {
    shift_id?: string;
    amount?: string;
    due_date?: string;
  };
  success?: boolean;
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

function mapRpcError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("shift_not_found")) {
    return "Plantão não encontrado ou indisponível.";
  }
  if (normalized.includes("shift_not_scheduled")) {
    return "Este plantão não está mais disponível para conclusão.";
  }
  if (normalized.includes("invalid_amount")) {
    return "Informe um valor válido.";
  }
  if (normalized.includes("invalid_payer")) {
    return "O local responsável pelo pagamento está indisponível.";
  }
  if (normalized.includes("unauthenticated")) {
    return "Sua sessão expirou. Entre novamente.";
  }
  return "Não foi possível concluir o plantão.";
}

function isCivilDateValid(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return false;
  }

  return true;
}

export async function realizeShift(
  _previousState: RealizeFormState,
  formData: FormData,
): Promise<RealizeFormState> {
  const parsed = realizeSchema.safeParse({
    shift_id: formData.get("shift_id"),
    amount: formData.get("amount"),
    due_date: formData.get("due_date"),
  });

  const fieldErrors: RealizeFormState["fieldErrors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "shift_id" || key === "amount" || key === "due_date") {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      error: "Confira os dados informados.",
      fieldErrors,
    };
  }

  if (!isCivilDateValid(parsed.data.due_date)) {
    return {
      fieldErrors: { due_date: "Data prevista inválida." },
      error: "Confira os dados informados.",
    };
  }

  let amountCents: number;
  try {
    const cents = parseAmountToCents(parsed.data.amount);
    if (cents === null) {
      return {
        fieldErrors: { amount: "Informe o valor final do plantão." },
        error: "Confira os dados informados.",
      };
    }
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
      return {
        fieldErrors: { amount: "Valor do plantão é muito alto." },
        error: "Confira os dados informados.",
      };
    }
    amountCents = Number(cents);
  } catch (error) {
    return {
      fieldErrors: {
        amount: error instanceof Error ? error.message : "Valor inválido.",
      },
      error: "Confira os dados informados.",
    };
  }

  const { supabase, user } = await requireUser();

  // Ownership/state pré-checagem: o plantão deve existir, ser do usuário
  // e estar em `scheduled`. Esta é uma camada de UX; o RPC reforça.
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("id, state, location_id")
    .eq("id", parsed.data.shift_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (shiftError) {
    return { error: "Não foi possível concluir o plantão." };
  }

  if (!shift) {
    return { error: "Plantão não encontrado ou indisponível." };
  }

  if (shift.state !== "scheduled") {
    return { error: "Este plantão não está mais disponível para conclusão." };
  }

  // Verifica se o local vinculado está ativo. Se estiver arquivado,
  // orientamos o usuário sem chamar o RPC.
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, archived_at")
    .eq("id", shift.location_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (locationError) {
    return { error: "Não foi possível concluir o plantão." };
  }

  if (!location || location.archived_at !== null) {
    return { error: LOCATION_ARCHIVED_ERROR };
  }

  const { error: rpcError } = await supabase.rpc("realize_shift", {
    p_shift_id: parsed.data.shift_id,
    p_amount_due_cents: amountCents,
    p_payer_type: "location",
    p_payer_id: shift.location_id,
    p_due_date: parsed.data.due_date,
  });

  if (rpcError) {
    return { error: mapRpcError(rpcError.message) };
  }

  revalidatePath("/app/plantoes");
  return { success: true };
}
