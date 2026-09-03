"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  realizeShift,
  type RealizeFormState,
} from "@/lib/shifts/realize";

type RealizeShiftFormProps = {
  shiftId: string;
  defaultAmountCents: number | null;
  currencyCode: string;
};

const initialState: RealizeFormState = {};

function formatDefaultAmount(cents: number, currencyCode: string): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

  return currencyCode === "BRL" ? formatted : formatted;
}

export function RealizeShiftForm({
  shiftId,
  defaultAmountCents,
  currencyCode,
}: RealizeShiftFormProps) {
  const [state, formAction, pending] = useActionState(
    realizeShift,
    initialState,
  );
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (state.success && detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [state.success]);

  const defaultAmount =
    defaultAmountCents !== null
      ? formatDefaultAmount(defaultAmountCents, currencyCode)
      : "";

  return (
    <details
      ref={detailsRef}
      className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
    >
      <summary className="cursor-pointer text-sm font-semibold text-cyan-200 hover:text-cyan-100">
        Marcar como realizado
      </summary>

      {state.success ? (
        <p
          role="status"
          className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200"
        >
          Plantão marcado como realizado. Agora é um valor a receber.
        </p>
      ) : (
        <form action={formAction} className="mt-3 space-y-4">
          <input type="hidden" name="shift_id" value={shiftId} />

          <div className="space-y-2">
            <label
              htmlFor={`realize-amount-${shiftId}`}
              className="text-sm font-medium text-slate-200"
            >
              Valor final (R$)
            </label>
            <input
              id={`realize-amount-${shiftId}`}
              name="amount"
              type="text"
              inputMode="decimal"
              maxLength={40}
              required
              defaultValue={defaultAmount}
              placeholder="850,00"
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
              htmlFor={`realize-due-date-${shiftId}`}
              className="text-sm font-medium text-slate-200"
            >
              Data prevista de pagamento
            </label>
            <input
              id={`realize-due-date-${shiftId}`}
              name="due_date"
              type="date"
              required
              aria-invalid={state.fieldErrors?.due_date ? "true" : undefined}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
            />
            {state.fieldErrors?.due_date && (
              <p role="alert" className="text-sm text-red-300">
                {state.fieldErrors.due_date}
              </p>
            )}
          </div>

          {state.error && !state.fieldErrors && (
            <div className="space-y-2">
              <p
                role="alert"
                className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200"
              >
                {state.error}
              </p>
              {state.error.includes("arquivado") && (
                <a
                  href="/app/locais?arquivados=1"
                  className="inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  Ir para locais arquivados →
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-xl bg-cyan-300 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Concluindo..." : "Confirmar realização"}
          </button>
        </form>
      )}
    </details>
  );
}
