/**
 * Types mirroring the Contacts API OpenAPI 3.1 document (`GET /openapi.json`).
 * Field names stay snake_case so payloads map 1:1 onto the wire format.
 */

/** The `type` values the API's `AddressType` enum accepts, in dropdown order. */
export const ADDRESS_TYPES = ["Home", "Work", "Other"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

/** `AddressRead` — one stored postal address in the contact's 1:N set. */
export interface Address {
  id: string;
  contact_id: number;
  type: AddressType;
  street: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

/** `AddressCreate` — one address inside a create/replace payload. */
export type AddressInput = Omit<Address, "id" | "contact_id">;

/** Most addresses one contact can carry; mirrors the API's cap. */
export const MAX_ADDRESSES = 10;

/** `ContactRead` — a stored contact, as returned by every contact endpoint. */
export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  addresses: Address[];
  notes: string | null;
  /** Base64 data URL (`data:image/...`); null means show initials. */
  photo: string | null;
  created_at: string;
  updated_at: string;
  full_name: string;
}

/** Every editable field, i.e. `ContactCreate` / `ContactReplace`. */
export type ContactInput = Omit<
  Contact,
  "id" | "created_at" | "updated_at" | "full_name" | "addresses"
> & { addresses: AddressInput[] };

/** The scalar (single text input) contact fields, excluding the address rows. */
export type ContactTextField = Exclude<keyof ContactInput, "addresses">;

/** `ContactPage` — one page of contacts plus the totals needed to paginate. */
export interface ContactPage {
  items: Contact[];
  total: number;
  limit: number;
  offset: number;
}

/** `HealthResponse` — result of the liveness probe. */
export interface HealthResponse {
  status: string;
  database: string;
  contacts: number;
}

/** Sort fields the API's allow-list accepts. */
export const SORT_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "company",
  "created_at",
  "updated_at",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

/** Bounds the API enforces on `limit`. */
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 200;
export const DEFAULT_PER_PAGE = 25;
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Result of a server action, consumed by `useActionState` in the forms.
 * Lives here (not in the `"use server"` module) so client components can import
 * the type without pulling server code into the browser bundle.
 */
/** One address row as raw form strings, before validation. */
export type AddressFormRow = Record<keyof AddressInput, string>;

export type FormState = {
  status: "idle" | "error";
  /** Message shown above the form; used for API-level failures. */
  message?: string;
  /** Per-field messages keyed by input name; address issues land under `addresses`. */
  fieldErrors?: Partial<Record<keyof ContactInput, string>>;
  /** Echo of the submitted values so the form survives a failed round trip. */
  values?: Partial<Record<ContactTextField, string>> & {
    addresses?: AddressFormRow[];
  };
};

export const EMPTY_FORM_STATE: FormState = { status: "idle" };
