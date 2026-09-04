"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  registerPayment,
  type RegisterPaymentFormState,
} from "@/lib/payments/register";

type RegisterPaymentFormProps = {
  obligationId: string;
  defaultAmountCents: number;
  currencyCode: string;
};

const initialState: RegisterPaymentFormState = {};

function formatDefaultAmount(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function RegisterPaymentForm({
  obligationId,
  defaultAmountCents,
}: RegisterPaymentFormProps) {
  const [state, formAction, pending] = useActionState(
    registerPayment,
    initialState,
  );
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (state.success && detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [state.success]);

  const defaultAmount = formatDefaultAmount(defaultAmountCents);

  return (
    <details
      ref={detailsRef}
      className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
    >
      <summary className="cursor-pointer text-sm font-semibold text-cyan-200 hover:text-cyan-100">
        Registrar recebimento
      </summary>

      {state.success ? (
        <p
          role="status"
          className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200"
        >
          Recebimento registrado.
        </p>
      ) : (
        <form action={formAction} className="mt-3 space-y-4">
          <input type="hidden" name="obligation_id" value={obligationId} />

          <div className="space-y-2">
            <label
              htmlFor={`payment-amount-${obligationId}`}
              className="text-sm font-medium text-slate-200"
            >
              Valor recebido (R$)
            </label>
            <input
              id={`payment-amount-${obligationId}`}
              name="amount"
              type="text"
              inputMode="decimal"
              maxLength={40}
              required
              defaultValue={defaultAmount}
              placeholder="450,00"
              aria-invalid={state.fieldErrors?.amount ? "true" : undefined}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
            />
            {state.fieldErrors?.amount && (
              <p role="alert" className="text-sm text-red-300">
                {state.fieldErrors.amount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`payment-date-${obligationId}`}
              className="text-sm font-medium text-slate-200"
            >
              Data do recebimento
            </label>
            <input
              id={`payment-date-${obligationId}`}
              name="payment_date"
              type="date"
              required
              aria-invalid={
                state.fieldErrors?.payment_date ? "true" : undefined
              }
              className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
            />
            {state.fieldErrors?.payment_date && (
              <p role="alert" className="text-sm text-red-300">
                {state.fieldErrors.payment_date}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`payment-notes-${obligationId}`}
              className="text-sm font-medium text-slate-200"
            >
              Observação (opcional)
            </label>
            <input
              id={`payment-notes-${obligationId}`}
              name="notes"
              type="text"
              maxLength={500}
              placeholder="Pix, repasse, etc."
              aria-invalid={state.fieldErrors?.notes ? "true" : undefined}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
            />
            {state.fieldErrors?.notes && (
              <p role="alert" className="text-sm text-red-300">
                {state.fieldErrors.notes}
              </p>
            )}
          </div>

          {state.error && !state.fieldErrors && (
            <p
              role="alert"
              className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-xl bg-cyan-300 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Registrando..." : "Confirmar recebimento"}
          </button>
        </form>
      )}
    </details>
  );
}
