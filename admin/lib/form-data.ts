import type { z } from "zod";

import type { FieldSpec, KindSpec } from "@/lib/content-kinds";

/**
 * Turns the editor's form submission into a content object (D-36), ready for
 * the kind's zod schema. The schema, not this parser, decides what is valid:
 * this only converts form strings into the right shapes.
 *
 * Form conventions (see components/content-editor.tsx):
 * - text, textarea, select, ref: one value under the field name;
 * - multi, months, refs: repeated values under the field name (checkboxes);
 * - image, coordinates: `name.part` (e.g. `image.alt`);
 * - rows and ordered refs: JSON written by a client component into one hidden input.
 */
export function formToObject(spec: KindSpec, form: FormData, key?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of spec.fields) {
    const value = readField(field, form);
    if (value !== undefined) out[field.name] = value;
  }
  // The key comes from the URL when editing; it cannot be changed in the form.
  if (key !== undefined && !spec.singleton) out[spec.keyField] = key;
  return out;
}

const str = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
};

function numberOrUndefined(raw: string): number | undefined {
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function readField(field: FieldSpec, form: FormData): unknown {
  switch (field.type) {
    case "key":
    case "text":
    case "select":
    case "ref": {
      const value = str(form, field.name);
      return value === "" && (field.type === "text" && field.optional) ? undefined : value;
    }
    case "textarea":
      return str(form, field.name);
    case "number":
      return numberOrUndefined(str(form, field.name));
    case "price": {
      // Blank means "no price": the site falls back to the band.
      const value = str(form, field.name).replace(/[$,\s]/g, "");
      return value === "" ? undefined : numberOrUndefined(value);
    }
    case "multi":
    case "refs":
      if (field.type === "refs" && field.ordered) return parseJson(str(form, field.name), []);
      return form.getAll(field.name).filter((value): value is string => typeof value === "string" && value !== "");
    case "months":
      return form
        .getAll(field.name)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value))
        .sort((a, b) => a - b);
    case "lines":
      return str(form, field.name)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    case "paragraphs":
      return str(form, field.name)
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);
    case "image": {
      const image: Record<string, string> = {};
      for (const part of ["src", "alt", "credit", "sourceUrl", "licenceUrl"]) {
        const value = str(form, `${field.name}.${part}`);
        if (value !== "") image[part] = value;
      }
      return image;
    }
    case "coordinates":
      return {
        lat: numberOrUndefined(str(form, `${field.name}.lat`)),
        lng: numberOrUndefined(str(form, `${field.name}.lng`)),
      };
    case "rows": {
      const rows = parseJson(str(form, field.name), []) as Record<string, unknown>[];
      return rows.map((row, index) => {
        const clean: Record<string, unknown> = {};
        for (const column of field.columns) {
          const raw = row[column.name];
          if (column.type === "number") clean[column.name] = typeof raw === "number" ? raw : numberOrUndefined(String(raw ?? ""));
          else if (column.type === "refs") clean[column.name] = Array.isArray(raw) ? raw : [];
          else {
            const value = typeof raw === "string" ? raw.trim() : "";
            if (value === "") {
              if (field.nullable?.includes(column.name)) clean[column.name] = null;
              else if ((column.type === "select" || column.type === "text") && column.optional) continue;
              else clean[column.name] = "";
            } else clean[column.name] = value;
          }
        }
        if (field.numbered) clean[field.numbered] = index + 1;
        return clean;
      });
    }
  }
}

function parseJson(raw: string, fallback: unknown): unknown {
  if (raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** zod's generic wording, in words an editor understands. */
function friendly(message: string): string {
  if (/expected (string|number|array|object), received (undefined|null)/.test(message)) return "Required.";
  if (/expected number, received NaN/.test(message)) return "Enter a number.";
  if (/Too small: expected array to have >=1/.test(message)) return "Choose at least one.";
  if (/Too small: expected string to have >=1/.test(message)) return "Required.";
  if (/Invalid option/.test(message)) return "Choose one of the options.";
  if (/Invalid URL/i.test(message)) return "Enter a full web address starting with https://.";
  return message;
}

/** Zod issues as one message per form field, keyed by the field name the form uses. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const [first, second, third] = issue.path.map(String);
    let name = first ?? "_form";
    let message = friendly(issue.message);
    if ((first === "image" || first === "coordinates") && second) name = `${first}.${second}`;
    else if (second !== undefined && /^\d+$/.test(second)) {
      message = `Row ${Number(second) + 1}${third ? ` (${third})` : ""}: ${issue.message}`;
    }
    errors[name] ??= message;
  }
  return errors;
}
