"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { CONTROL } from "@/components/ui/Field";
import { addressInputName } from "@/lib/contacts/schema";
import {
  ADDRESS_TYPES,
  MAX_ADDRESSES,
  type AddressFormRow,
  type AddressInput,
} from "@/lib/contacts/types";

/** The blank row appended by the "Add address" button. */
const EMPTY_ROW: AddressFormRow = {
  type: "Home",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

interface AddressColumn {
  field: Exclude<keyof AddressInput, "type">;
  label: string;
  maxLength: number;
  placeholder: string;
  required?: boolean;
  wide?: boolean;
}

const COLUMNS: AddressColumn[] = [
  {
    field: "street",
    label: "Street",
    maxLength: 300,
    placeholder: "1 Market St, Suite 400",
    required: true,
    wide: true,
  },
  { field: "city", label: "City", maxLength: 120, placeholder: "San Francisco" },
  { field: "state", label: "State / region", maxLength: 120, placeholder: "CA" },
  { field: "postal_code", label: "Postal code", maxLength: 20, placeholder: "94105" },
  { field: "country", label: "Country", maxLength: 120, placeholder: "USA" },
];

interface Row {
  /** Stable identity for React, so removing a middle row keeps the others' input state. */
  key: number;
  initial: AddressFormRow;
}

/**
 * Dynamic address rows for the contact form. Every row renders the same set of
 * repeated input names (`address_type`, `address_street`, …), so the server
 * action can zip `FormData.getAll` columns back into one object per row —
 * the form still posts as plain form data.
 */
export default function AddressesField({
  initialAddresses,
  error,
}: {
  initialAddresses: AddressFormRow[];
  error?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialAddresses.map((initial, index) => ({ key: index, initial })),
  );
  const [nextKey, setNextKey] = useState(initialAddresses.length);

  function addRow() {
    setRows((current) => [...current, { key: nextKey, initial: EMPTY_ROW }]);
    setNextKey((key) => key + 1);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No addresses yet — add one below.
        </p>
      ) : null}

      {rows.map((row, index) => (
        <div
          key={row.key}
          className="space-y-4 rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-muted-foreground">
              Address {index + 1}
            </span>
            <Button variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`address-${row.key}-type`}
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Type
              </label>
              <select
                id={`address-${row.key}-type`}
                name={addressInputName("type")}
                defaultValue={row.initial.type}
                className={`${CONTROL} border-border focus:border-primary`}
              >
                {ADDRESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {COLUMNS.map((column) => (
              <div key={column.field} className={column.wide ? "sm:col-span-2" : undefined}>
                <label
                  htmlFor={`address-${row.key}-${column.field}`}
                  className="mb-1.5 block text-[13px] font-medium text-foreground"
                >
                  {column.label}
                  {column.required ? (
                    <span className="ml-1 text-destructive" aria-hidden="true">
                      *
                    </span>
                  ) : (
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                      optional
                    </span>
                  )}
                </label>
                <input
                  id={`address-${row.key}-${column.field}`}
                  name={addressInputName(column.field)}
                  type="text"
                  defaultValue={row.initial[column.field]}
                  maxLength={column.maxLength}
                  required={column.required}
                  placeholder={column.placeholder}
                  className={`${CONTROL} border-border focus:border-primary`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        variant="secondary"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= MAX_ADDRESSES}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </Button>
    </div>
  );
}
