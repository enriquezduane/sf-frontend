import { z } from "zod";
import {
  ADDRESS_TYPES,
  MAX_ADDRESSES,
  type AddressFormRow,
  type AddressInput,
  type ContactInput,
  type ContactTextField,
} from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Largest file the picker accepts; base64 inflates it by ~4/3 on the wire. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Mirror of the API's cap on the encoded data URL. */
export const MAX_PHOTO_LENGTH = 5_000_000;

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

/** One address row; mirrors the API's `AddressCreate`. */
export const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES, "Pick Home, Work, or Other"),
  street: requiredText(300, "Street"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
}) satisfies z.ZodType<AddressInput, unknown>;

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  addresses: z
    .array(addressInputSchema)
    .max(MAX_ADDRESSES, `A contact can have at most ${MAX_ADDRESSES} addresses`)
    .default([]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  photo: z
    .string()
    .trim()
    .max(MAX_PHOTO_LENGTH, "Photo is too large — choose an image under 2 MB")
    .refine(
      (value) => value === "" || value.startsWith("data:image/"),
      "Photo must be an image file",
    )
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/**
 * Collapse a ZodError into one message per field, keyed by input name.
 * Address issues collapse onto the `addresses` key, labelled with their row.
 */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactInput, string>> {
  const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || key in fieldErrors) continue;

    const row = issue.path[1];
    fieldErrors[key as keyof ContactInput] =
      key === "addresses" && typeof row === "number"
        ? `Address ${row + 1}: ${issue.message}`
        : issue.message;
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: ContactTextField;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** Every single-value input the form submits: the text fields plus the photo. */
export const CONTACT_INPUT_NAMES: ContactTextField[] = [
  ...CONTACT_FIELDS.map((field) => field.name),
  "photo",
];

/** The columns of one address row, in the order the row renders them. */
export const ADDRESS_FIELD_NAMES = [
  "type",
  "street",
  "city",
  "state",
  "postal_code",
  "country",
] as const satisfies readonly (keyof AddressInput)[];

/** Form input name for one address column; repeated across rows. */
export function addressInputName(field: keyof AddressInput): string {
  return `address_${field}`;
}

/** Raw strings pulled out of a submitted contact form. */
export type ContactFormRawValues = Record<ContactTextField, string> & {
  addresses: AddressFormRow[];
};

/**
 * Pull the contact fields out of a submitted form, as raw strings.
 *
 * Address rows repeat the same input names (`address_street`, …), so
 * `FormData.getAll` yields one aligned array per column — every row renders
 * every column, which keeps the arrays the same length in DOM order.
 */
export function formDataToValues(formData: FormData): ContactFormRawValues {
  const text = Object.fromEntries(
    CONTACT_INPUT_NAMES.map((name) => [name, String(formData.get(name) ?? "")]),
  ) as Record<ContactTextField, string>;

  const columns = ADDRESS_FIELD_NAMES.map((field) =>
    formData.getAll(addressInputName(field)).map(String),
  );
  const rowCount = Math.max(...columns.map((column) => column.length), 0);
  const addresses: AddressFormRow[] = Array.from({ length: rowCount }, (_, row) =>
    Object.fromEntries(
      ADDRESS_FIELD_NAMES.map((field, column) => [field, columns[column][row] ?? ""]),
    ) as AddressFormRow,
  );

  return { ...text, addresses };
}
