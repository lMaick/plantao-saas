"use client";

import { useActionState } from "react";

import {
  createScheduledShift,
  type ShiftFormState,
} from "@/lib/shifts/actions";

type LocationOption = {
  id: string;
  name: string;
  kind: string | null;
};

type ShiftFormProps = {
  locations: LocationOption[];
};

const initialState: ShiftFormState = {};

export function ShiftForm({ locations }: ShiftFormProps) {
  const [state, formAction, pending] = useActionState(
    createScheduledShift,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="shift-location"
          className="text-sm font-medium text-slate-200"
        >
          Local de trabalho
        </label>
        <select
          id="shift-location"
          name="location_id"
          required
          defaultValue=""
          aria-invalid={state.fieldErrors?.location_id ? "true" : undefined}
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
        >
          <option value="" disabled className="bg-slate-900 text-slate-400">
            Selecione um local
          </option>
          {locations.map((location) => (
            <option
              key={location.id}
              value={location.id}
              className="bg-slate-900 text-white"
            >
              {location.kind ? `${location.name} — ${location.kind}` : location.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.location_id && (
          <p role="alert" className="text-sm text-red-300">
            {state.fieldErrors.location_id}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="shift-starts"
            className="text-sm font-medium text-slate-200"
          >
            Início
          </label>
          <input
            id="shift-starts"
            name="starts_at"
            type="datetime-local"
            required
            aria-invalid={state.fieldErrors?.starts_at ? "true" : undefined}
            className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
          />
          {state.fieldErrors?.starts_at && (
            <p role="alert" className="text-sm text-red-300">
              {state.fieldErrors.starts_at}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="shift-ends"
            className="text-sm font-medium text-slate-200"
          >
            Fim
          </label>
          <input
            id="shift-ends"
            name="ends_at"
            type="datetime-local"
            required
            aria-invalid={state.fieldErrors?.ends_at ? "true" : undefined}
            className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
          />
          {state.fieldErrors?.ends_at && (
            <p role="alert" className="text-sm text-red-300">
              {state.fieldErrors.ends_at}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="shift-amount"
          className="text-sm font-medium text-slate-200"
        >
          Valor do plantão (R$) <span className="text-slate-400">(opcional)</span>
        </label>
        <input
          id="shift-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          maxLength={40}
          placeholder="850,00"
          aria-invalid={state.fieldErrors?.amount ? "true" : undefined}
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
        />
        {state.fieldErrors?.amount && (
          <p role="alert" className="text-sm text-red-300">
            {state.fieldErrors.amount}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="shift-notes"
          className="text-sm font-medium text-slate-200"
        >
          Observação <span className="text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="shift-notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Plantão noturno, UTI, troca com colega..."
          aria-invalid={state.fieldErrors?.notes ? "true" : undefined}
          className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
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
        className="h-12 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Cadastrar plantão"}
      </button>
    </form>
  );
}
