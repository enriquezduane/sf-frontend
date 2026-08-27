"use client";

import { Fragment, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import AddressesField from "@/components/contacts/AddressesField";
import PhotoField from "@/components/contacts/PhotoField";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Address,
  type AddressFormRow,
  type Contact,
  type ContactTextField,
  type FormState,
} from "@/lib/contacts/types";

/** A stored address as the raw strings the form inputs expect. */
function addressToRow(address: Address): AddressFormRow {
  return {
    type: address.type,
    street: address.street,
    city: address.city ?? "",
    state: address.state ?? "",
    postal_code: address.postal_code ?? "",
    country: address.country ?? "",
  };
}

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  // While a chosen file is still being read, the hidden photo input holds the
  // previous value — submitting then would save the wrong image.
  const [photoReading, setPhotoReading] = useState(false);

  function valueFor(name: ContactTextField): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  const initialAddresses =
    state.values?.addresses ?? contact?.addresses.map(addressToRow) ?? [];

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="sr-only">Photo</legend>

        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Photo
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Optional picture shown on the contact&apos;s avatar.
          </p>
        </div>

        <PhotoField
          initialPhoto={state.values?.photo ?? contact?.photo ?? null}
          error={state.fieldErrors?.photo}
          onReadingChange={setPhotoReading}
        />
      </fieldset>

      {CONTACT_FIELD_GROUPS.map((group) => (
        <Fragment key={group.title}>
          <fieldset className="space-y-4">
            <legend className="sr-only">{group.title}</legend>

            <div className="border-b border-hairline pb-2">
              <h2 className="font-display text-sm font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {group.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  defaultValue={valueFor(field.name)}
                  error={state.fieldErrors?.[field.name]}
                />
              ))}
            </div>
          </fieldset>

          {group.title === "Work" ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">Addresses</legend>

              <div className="border-b border-hairline pb-2">
                <h2 className="font-display text-sm font-semibold text-foreground">
                  Addresses
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  Any number of home, work, or other postal addresses.
                </p>
              </div>

              <AddressesField
                initialAddresses={initialAddresses}
                error={state.fieldErrors?.addresses}
              />
            </fieldset>
          ) : null}
        </Fragment>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} disabled={photoReading} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
