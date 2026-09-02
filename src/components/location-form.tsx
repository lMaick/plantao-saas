"use client";

import { useActionState } from "react";

import {
  createLocation,
  updateLocation,
  type LocationFormState,
} from "@/lib/locations/actions";

type Mode = "create" | "edit";

type LocationFormProps = {
  mode: Mode;
  defaultValues?: {
    id?: string;
    name?: string;
    kind?: string | null;
  };
};

const initialState: LocationFormState = {};

export function LocationForm({ mode, defaultValues }: LocationFormProps) {
  const isEdit = mode === "edit";
  const action = isEdit ? updateLocation : createLocation;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && defaultValues?.id ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="location-name"
          className="text-sm font-medium text-slate-200"
        >
          Nome
        </label>
        <input
          id="location-name"
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={defaultValues?.name ?? ""}
          placeholder="Hospital Municipal"
          aria-invalid={state.fieldErrors?.name ? "true" : undefined}
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
        />
        {state.fieldErrors?.name && (
          <p role="alert" className="text-sm text-red-300">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="location-kind"
          className="text-sm font-medium text-slate-200"
        >
          Tipo <span className="text-slate-400">(opcional)</span>
        </label>
        <input
          id="location-kind"
          name="kind"
          type="text"
          maxLength={60}
          defaultValue={defaultValues?.kind ?? ""}
          placeholder="Hospital, Clínica, UPA, Consultório"
          aria-invalid={state.fieldErrors?.kind ? "true" : undefined}
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 aria-[invalid=true]:border-red-400"
        />
        {state.fieldErrors?.kind && (
          <p role="alert" className="text-sm text-red-300">
            {state.fieldErrors.kind}
          </p>
        )}
      </div>

      {state.error && !state.fieldErrors && (
        <p role="alert" className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar local"}
      </button>
    </form>
  );
}
