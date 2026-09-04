"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseAmountToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data do recebimento inválida.");

const registerSchema = z.object({
  obligation_id: z.string().uuid("Valor a receber inválido."),
  amount: z
    .string()
    .trim()
    .max(40, "Valor do recebimento inválido.")
    .min(1, "Informe o valor recebido."),
  payment_date: isoDateSchema,
  notes: z
    .string()
    .trim()
    .max(500, "Observação deve ter no máximo 500 caracteres.")
    .optional()
    .or(z.literal("")),
});

export type RegisterPaymentFormState = {
  error?: string;
  fieldErrors?: {
    obligation_id?: string;
    amount?: string;
    payment_date?: string;
    notes?: string;
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
  if (normalized.includes("obligation_not_found")) {
    return "Valor a receber não encontrado ou indisponível.";
  }
  if (normalized.includes("invalid_amount")) {
    return "Informe um valor válido.";
  }
  if (normalized.includes("payment_exceeds_balance")) {
    return "O valor recebido não pode ser maior que o saldo restante.";
  }
  if (normalized.includes("payment_before_shift")) {
    return "A data do recebimento não pode ser anterior à data do plantão.";
  }
  if (normalized.includes("profile_not_found")) {
    return "Não foi possível concluir o recebimento.";
  }
  if (normalized.includes("unauthenticated")) {
    return "Sua sessão expirou. Entre novamente.";
  }
  return "Não foi possível registrar o recebimento.";
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

export async function registerPayment(
  _previousState: RegisterPaymentFormState,
  formData: FormData,
): Promise<RegisterPaymentFormState> {
  const parsed = registerSchema.safeParse({
    obligation_id: formData.get("obligation_id"),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    notes: formData.get("notes") ?? "",
  });

  const fieldErrors: RegisterPaymentFormState["fieldErrors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "obligation_id" ||
        key === "amount" ||
        key === "payment_date" ||
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

  if (!isCivilDateValid(parsed.data.payment_date)) {
    return {
      fieldErrors: { payment_date: "Data do recebimento inválida." },
      error: "Confira os dados informados.",
    };
  }

  let amountCents: number;
  try {
    const cents = parseAmountToCents(parsed.data.amount);
    if (cents === null) {
      return {
        fieldErrors: { amount: "Informe o valor recebido." },
        error: "Confira os dados informados.",
      };
    }
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
      return {
        fieldErrors: { amount: "Valor do recebimento é muito alto." },
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

  const notes = parsed.data.notes?.trim() ?? "";

  const { supabase, user } = await requireUser();

  // Ownership pré-checagem: a obrigação deve existir, ser do usuário
  // e não estar anulada. Esta é uma camada de UX; o RPC reforça.
  const { data: obligation, error: obligationError } = await supabase
    .from("obligations")
    .select("id, amount_due_cents")
    .eq("id", parsed.data.obligation_id)
    .eq("user_id", user.id)
    .is("voided_at", null)
    .maybeSingle();

  if (obligationError) {
    return { error: "Não foi possível registrar o recebimento." };
  }

  if (!obligation) {
    return { error: "Valor a receber não encontrado ou indisponível." };
  }

  // Recalcular o saldo atual a partir dos pagamentos válidos para oferecer
  // uma validação local amigável. Esta checagem é apenas de UX: o RPC
  // continua sendo a autoridade transacional e revalida com `FOR UPDATE`.
  const { data: paymentRows, error: paymentsError } = await supabase
    .from("payments")
    .select("amount_cents")
    .eq("obligation_id", parsed.data.obligation_id)
    .eq("user_id", user.id)
    .is("voided_at", null);

  if (paymentsError) {
    return { error: "Não foi possível registrar o recebimento." };
  }

  const receivedCents = (paymentRows ?? []).reduce(
    (acc, row) => acc + Number(row.amount_cents ?? 0),
    0,
  );
  const balanceCents = Number(obligation.amount_due_cents) - receivedCents;

  if (amountCents > balanceCents) {
    return {
      error: "O valor recebido não pode ser maior que o saldo restante.",
    };
  }

  const { error: rpcError } = await supabase.rpc("register_payment", {
    p_obligation_id: parsed.data.obligation_id,
    p_amount_cents: amountCents,
    p_payment_date: parsed.data.payment_date,
    p_notes: notes.length > 0 ? notes : null,
  });

  if (rpcError) {
    return { error: mapRpcError(rpcError.message) };
  }

  revalidatePath("/app/plantoes");
  return { success: true };
}
