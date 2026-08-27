"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import { MAX_PHOTO_BYTES } from "@/lib/contacts/schema";

/**
 * Photo picker for the contact form. Converts the chosen file to a base64 data
 * URL with `FileReader` and submits it through a hidden `photo` input, so the
 * form still posts as plain form data. On edit, the hidden input starts out
 * holding the stored photo — a save without touching this field re-sends it,
 * which is what keeps `PUT` from wiping the image.
 */
export default function PhotoField({
  initialPhoto,
  error,
  onReadingChange,
}: {
  initialPhoto: string | null;
  error?: string;
  /** Fired when a file read starts/finishes so the form can hold the submit. */
  onReadingChange?: (reading: boolean) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The read currently allowed to update state; anything older is stale.
  const readerRef = useRef<FileReader | null>(null);

  function cancelPendingRead() {
    readerRef.current?.abort();
    readerRef.current = null;
    onReadingChange?.(false);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file after a remove.
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("That file is not an image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("Choose an image under 2 MB.");
      return;
    }

    cancelPendingRead();
    const reader = new FileReader();
    readerRef.current = reader;
    onReadingChange?.(true);
    reader.onload = () => {
      if (readerRef.current !== reader) return;
      setFileError(null);
      setPhoto(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => {
      if (readerRef.current !== reader) return;
      setFileError("The image could not be read.");
    };
    reader.onloadend = () => {
      if (readerRef.current !== reader) return;
      readerRef.current = null;
      onReadingChange?.(false);
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    cancelPendingRead();
    setFileError(null);
    setPhoto(null);
  }

  const message = fileError ?? error;

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="photo" value={photo ?? ""} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="sr-only"
        aria-label="Choose a contact photo"
      />

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL preview
        <img
          src={photo}
          alt="Photo preview"
          className="h-20 w-20 shrink-0 rounded-full aspect-square object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-secondary/40 text-muted-foreground"
        >
          <User className="h-8 w-8" strokeWidth={1.5} />
        </span>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {photo ? "Change photo" : "Upload photo"}
          </Button>
          {photo ? (
            <Button variant="ghost" size="sm" onClick={removePhoto}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
        {message ? (
          <p role="alert" className="text-[13px] text-destructive">
            {message}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            JPG, PNG, or GIF up to 2 MB. Without one, initials are shown.
          </p>
        )}
      </div>
    </div>
  );
}
