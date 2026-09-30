"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import type { EditorState } from "@/app/(panel)/content/actions";
import { Badge, Button, Notice, cx, inputClass } from "@/components/ui";
import { MONTH_NAMES, type FieldSpec, type RowColumn } from "@/lib/content-kinds";

export interface RefOption {
  readonly value: string;
  readonly label: string;
  readonly draft: boolean;
}

export interface MediaOption {
  readonly src: string;
  readonly label: string;
  readonly alt: string;
  readonly credit: string | null;
}

export interface EditorProps {
  readonly fields: readonly FieldSpec[];
  readonly keyField: string;
  readonly isNew: boolean;
  readonly itemKey: string | null;
  readonly initial: Record<string, unknown>;
  readonly status: "draft" | "published";
  readonly refs: Readonly<Record<string, readonly RefOption[]>>;
  readonly media: readonly MediaOption[];
  readonly siteUrl: string;
  readonly action: (state: EditorState, form: FormData) => Promise<EditorState>;
  readonly savedNotice?: boolean;
}

/**
 * The content editor (D-36). One component for every kind: fields are
 * rendered from the kind's definition in lib/content-kinds.ts and read back by
 * lib/form-data.ts, and the server validates the result against the shared
 * schema. Complex fields (rows, ordered lists) keep their state here and post
 * it as JSON in a hidden input.
 */
export function ContentEditor(props: EditorProps) {
  const [state, action, pending] = useActionState<EditorState, FormData>(props.action, {});
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.message ? (
        <Notice tone={state.errors ? "error" : "success"}>{state.message}</Notice>
      ) : props.savedNotice ? (
        <Notice tone="success">Created. It goes live when you publish the site.</Notice>
      ) : null}
      {state.warnings && state.warnings.length > 0 ? (
        <Notice tone="warning">
          <p className="font-semibold">Saved, but these must be fixed before the site can be published:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {state.warnings.slice(0, 8).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="space-y-5 rounded-xl border border-ink-200 bg-white p-5 sm:p-6">
        {props.fields.map((field) => (
          <FieldRow key={field.name} field={field} props={props} error={errors[field.name]} errors={errors} />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ink-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Status
          <select name="status" defaultValue={props.status} className={`${inputClass} w-auto`}>
            <option value="published">Published (shown on the site)</option>
            <option value="draft">Draft (hidden)</option>
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : props.isNew ? "Create" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldRow({
  field,
  props,
  error,
  errors,
}: {
  field: FieldSpec;
  props: EditorProps;
  error?: string;
  errors: Record<string, string>;
}) {
  const id = `f-${field.name}`;
  const value = props.initial[field.name];
  const label = (
    <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-900">
      {field.label}
    </label>
  );
  const help =
    error ? (
      <p className="mt-1 text-xs font-medium text-danger-600" role="alert">
        {error}
      </p>
    ) : field.hint ? (
      <p className="mt-1 text-xs text-ink-500">{field.hint}</p>
    ) : null;
  const invalid = error ? "border-danger-600" : "";

  switch (field.type) {
    case "key":
      if (!props.isNew) {
        return (
          <div>
            <p className="mb-1 text-sm font-semibold text-ink-900">{field.label}</p>
            <p className="font-mono text-sm text-ink-700">{props.itemKey}</p>
          </div>
        );
      }
      return (
        <div>
          {label}
          <input id={id} name={field.name} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={cx(inputClass, "font-mono", invalid)} placeholder="e.g. hill-country-escape" />
          {help}
        </div>
      );
    case "text":
      return (
        <div>
          {label}
          <input id={id} name={field.name} defaultValue={str(value)} className={cx(inputClass, invalid)} />
          {help}
        </div>
      );
    case "textarea":
      return (
        <div>
          {label}
          <textarea id={id} name={field.name} rows={field.rows ?? 4} defaultValue={str(value)} className={cx(inputClass, invalid)} />
          {help}
        </div>
      );
    case "number":
      return (
        <div className="max-w-xs">
          {label}
          <input id={id} name={field.name} type="number" step={field.step ?? 1} min={field.min} max={field.max} defaultValue={value === undefined ? "" : String(value)} className={cx(inputClass, invalid)} />
          {help}
        </div>
      );
    case "price":
      return (
        <div className="max-w-xs">
          {label}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-500">$</span>
            <input id={id} name={field.name} inputMode="numeric" defaultValue={value === undefined ? "" : String(value)} placeholder="No price set" className={cx(inputClass, "pl-7", invalid)} />
          </div>
          {help}
        </div>
      );
    case "select":
      return (
        <div className="max-w-sm">
          {label}
          <select id={id} name={field.name} defaultValue={str(value)} className={cx(inputClass, invalid)}>
            <option value="" disabled>Choose…</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {help}
        </div>
      );
    case "ref":
      return (
        <div className="max-w-sm">
          {label}
          <select id={id} name={field.name} defaultValue={str(value)} className={cx(inputClass, invalid)}>
            <option value="" disabled>Choose…</option>
            {(props.refs[field.ref] ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}{option.draft ? " (draft)" : ""}
              </option>
            ))}
          </select>
          {help}
        </div>
      );
    case "multi":
    case "months": {
      const options = field.type === "months" ? MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name })) : field.options;
      const selected = new Set((Array.isArray(value) ? value : []).map(String));
      return (
        <fieldset>
          <legend className="mb-1 text-sm font-semibold text-ink-900">{field.label}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm has-checked:border-jungle-600 has-checked:bg-jungle-50">
                <input type="checkbox" name={field.name} value={option.value} defaultChecked={selected.has(option.value)} className="accent-jungle-700" />
                {option.label}
              </label>
            ))}
          </div>
          {help}
        </fieldset>
      );
    }
    case "refs":
      if (field.ordered) {
        return <OrderedRefs id={id} field={field} initial={arr(value)} options={props.refs[field.ref] ?? []} label={label} help={help} />;
      }
      return <RefChecklist field={field} initial={arr(value)} options={props.refs[field.ref] ?? []} help={help} />;
    case "lines":
      return (
        <div>
          {label}
          <textarea id={id} name={field.name} rows={Math.max(3, arr(value).length + 1)} defaultValue={arr(value).join("\n")} className={cx(inputClass, invalid)} />
          {help ?? <p className="mt-1 text-xs text-ink-500">One per line.</p>}
        </div>
      );
    case "paragraphs":
      return (
        <div>
          {label}
          <textarea id={id} name={field.name} rows={Math.min(16, Math.max(5, arr(value).length * 4))} defaultValue={arr(value).join("\n\n")} className={cx(inputClass, invalid)} />
          {help}
        </div>
      );
    case "coordinates": {
      const coords = (value ?? {}) as { lat?: number; lng?: number };
      return (
        <fieldset>
          <legend className="mb-1 text-sm font-semibold text-ink-900">{field.label}</legend>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <label className="text-xs text-ink-600">
              Latitude
              <input name={`${field.name}.lat`} inputMode="decimal" defaultValue={coords.lat ?? ""} className={cx(inputClass, "mt-1", errors[`${field.name}.lat`] && "border-danger-600")} />
            </label>
            <label className="text-xs text-ink-600">
              Longitude
              <input name={`${field.name}.lng`} inputMode="decimal" defaultValue={coords.lng ?? ""} className={cx(inputClass, "mt-1", errors[`${field.name}.lng`] && "border-danger-600")} />
            </label>
          </div>
          <p className="mt-1 text-xs text-ink-500">In Sri Lanka: latitude 5.5–10.1, longitude 79.4–82.1. Right-click a spot in Google Maps to copy them.</p>
          {errors[`${field.name}.lat`] || errors[`${field.name}.lng`] ? (
            <p className="mt-1 text-xs font-medium text-danger-600" role="alert">{errors[`${field.name}.lat`] ?? errors[`${field.name}.lng`]}</p>
          ) : null}
        </fieldset>
      );
    }
    case "image":
      return <ImageField field={field} value={(value ?? {}) as Record<string, string>} media={props.media} siteUrl={props.siteUrl} errors={errors} />;
    case "rows":
      return <RowsEditor field={field} initial={(Array.isArray(value) ? value : []) as Record<string, unknown>[]} refs={props.refs} error={error} />;
  }
}

const str = (value: unknown) => (typeof value === "string" ? value : value === undefined || value === null ? "" : String(value));
const arr = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

function RefChecklist({ field, initial, options, help }: { field: FieldSpec; initial: string[]; options: readonly RefOption[]; help: React.ReactNode }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set(initial));
  const shown = options.filter((option) => option.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink-900">
        {field.label} <span className="font-normal text-ink-500">({selected.size} chosen)</span>
      </legend>
      <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter…" aria-label={`Filter ${field.label}`} className={`${inputClass} mb-2 max-w-xs`} />
      <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-ink-200 p-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className={cx("flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-ink-50", !shown.includes(option) && "hidden")}>
            <input
              type="checkbox"
              name={field.name}
              value={option.value}
              checked={selected.has(option.value)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(option.value);
                else next.delete(option.value);
                setSelected(next);
              }}
              className="accent-jungle-700"
            />
            {option.label}
            {option.draft ? <Badge tone="amber">draft</Badge> : null}
          </label>
        ))}
      </div>
      {help}
    </fieldset>
  );
}

function OrderedRefs({ id, field, initial, options, label, help }: { id: string; field: FieldSpec; initial: string[]; options: readonly RefOption[]; label: React.ReactNode; help: React.ReactNode }) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState("");
  const name = (slug: string) => options.find((option) => option.value === slug)?.label ?? slug;
  const move = (index: number, by: number) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    setItems(next);
  };
  return (
    <div>
      {label}
      <input type="hidden" name={field.name} value={JSON.stringify(items)} />
      <ol className="space-y-1">
        {items.map((slug, index) => (
          <li key={`${slug}-${index}`} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm">
            <span className="w-6 text-ink-500">{index + 1}.</span>
            <span className="flex-1">{name(slug)}</span>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="p-1 disabled:opacity-30" aria-label={`Move ${name(slug)} earlier`}><ArrowUp size={14} /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="p-1 disabled:opacity-30" aria-label={`Move ${name(slug)} later`}><ArrowDown size={14} /></button>
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-1 text-danger-600" aria-label={`Remove ${name(slug)}`}><X size={14} /></button>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex max-w-md gap-2">
        <select id={id} value={adding} onChange={(event) => setAdding(event.target.value)} className={inputClass} aria-label={`Add to ${field.label}`}>
          <option value="">Add a stop…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Button type="button" variant="secondary" disabled={!adding} onClick={() => { setItems([...items, adding]); setAdding(""); }}>
          <Plus size={16} aria-hidden /> Add
        </Button>
      </div>
      {help}
    </div>
  );
}

function ImageField({ field, value, media, siteUrl, errors }: { field: FieldSpec; value: Record<string, string>; media: readonly MediaOption[]; siteUrl: string; errors: Record<string, string> }) {
  const [src, setSrc] = useState(value.src ?? "");
  const [alt, setAlt] = useState(value.alt ?? "");
  const [credit, setCredit] = useState(value.credit ?? "");
  const preview = src.startsWith("/media/") ? src : src.startsWith("/images/") ? `${siteUrl}${src}` : src.startsWith("https://images.unsplash.com/") ? src : "";
  const pick = (option: MediaOption) => {
    setSrc(option.src);
    if (!alt && option.alt) setAlt(option.alt);
    if (!credit && option.credit) setCredit(option.credit);
  };
  const err = (part: string) => errors[`${field.name}.${part}`];
  return (
    <fieldset className="rounded-lg border border-ink-200 p-4">
      <legend className="px-1 text-sm font-semibold text-ink-900">{field.label}</legend>
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-ink-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- previews of arbitrary sources; the optimiser adds nothing here
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <p className="flex h-full items-center justify-center p-3 text-center text-xs text-ink-500">No preview</p>
          )}
        </div>
        <div className="space-y-3">
          <label className="block text-xs text-ink-600">
            Image
            <input name={`${field.name}.src`} value={src} onChange={(event) => setSrc(event.target.value)} list={`${field.name}-media`} placeholder="Pick from the library or paste a path" className={cx(inputClass, "mt-1 font-mono", err("src") && "border-danger-600")} />
            <datalist id={`${field.name}-media`}>
              {media.map((option) => (
                <option key={option.src} value={option.src}>{option.label}</option>
              ))}
            </datalist>
            {err("src") ? <span className="mt-1 block font-medium text-danger-600">{err("src")}</span> : null}
          </label>
          {media.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-jungle-700">Choose from the media library ({media.length})</summary>
              <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {media.map((option) => (
                  <button key={option.src} type="button" onClick={() => pick(option)} className={cx("overflow-hidden rounded border-2", src === option.src ? "border-jungle-600" : "border-transparent")} title={option.label}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={option.src} alt={option.label} className="aspect-[4/3] w-full object-cover" />
                  </button>
                ))}
              </div>
            </details>
          ) : null}
          <label className="block text-xs text-ink-600">
            Alt text (describe what the photo shows)
            <input name={`${field.name}.alt`} value={alt} onChange={(event) => setAlt(event.target.value)} className={cx(inputClass, "mt-1", err("alt") && "border-danger-600")} />
            {err("alt") ? <span className="mt-1 block font-medium text-danger-600">{err("alt")}</span> : null}
          </label>
          <label className="block text-xs text-ink-600">
            Credit (required for Creative Commons photos)
            <input name={`${field.name}.credit`} value={credit} onChange={(event) => setCredit(event.target.value)} placeholder="Photo by … / CC BY-SA 4.0, via Wikimedia Commons" className={cx(inputClass, "mt-1")} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-600">
              Source page URL
              <input name={`${field.name}.sourceUrl`} defaultValue={value.sourceUrl ?? ""} className={cx(inputClass, "mt-1", err("sourceUrl") && "border-danger-600")} />
            </label>
            <label className="block text-xs text-ink-600">
              Licence URL
              <input name={`${field.name}.licenceUrl`} defaultValue={value.licenceUrl ?? ""} className={cx(inputClass, "mt-1", err("licenceUrl") && "border-danger-600")} />
            </label>
          </div>
        </div>
      </div>
    </fieldset>
  );
}

type RowsField = Extract<FieldSpec, { type: "rows" }>;

function RowsEditor({ field, initial, refs, error }: { field: RowsField; initial: Record<string, unknown>[]; refs: EditorProps["refs"]; error?: string }) {
  const [rows, setRows] = useState(initial);
  const blank = useMemo(() => Object.fromEntries(field.columns.map((column) => [column.name, column.type === "refs" ? [] : ""])), [field.columns]);
  const update = (index: number, name: string, value: unknown) => setRows(rows.map((row, i) => (i === index ? { ...row, [name]: value } : row)));
  const move = (index: number, by: number) => {
    const next = [...rows];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    setRows(next);
  };
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink-900">{field.label}</legend>
      <input type="hidden" name={field.name} value={JSON.stringify(rows)} />
      {error ? <p className="mb-2 text-xs font-medium text-danger-600" role="alert">{error}</p> : null}
      <ol className="space-y-3">
        {rows.map((row, index) => (
          <li key={index} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-600 uppercase">{field.numbered ? `Day ${index + 1}` : `Row ${index + 1}`}</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-1 hover:bg-white disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} className="rounded p-1 hover:bg-white disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))} className="rounded p-1 text-danger-600 hover:bg-white" aria-label="Remove row"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {field.columns.map((column) => (
                <RowCell key={column.name} column={column} value={row[column.name]} refs={refs} onChange={(value) => update(index, column.name, value)} />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <Button type="button" variant="secondary" className="mt-3" onClick={() => setRows([...rows, { ...blank }])}>
        <Plus size={16} aria-hidden /> Add {field.numbered ? "day" : "row"}
      </Button>
    </fieldset>
  );
}

function RowCell({ column, value, refs, onChange }: { column: RowColumn; value: unknown; refs: EditorProps["refs"]; onChange: (value: unknown) => void }) {
  const wide = column.type === "text" && column.wide ? "sm:col-span-2 lg:col-span-4" : column.type === "refs" ? "sm:col-span-2" : "";
  const labelClass = "block text-xs text-ink-600";
  if (column.type === "number") {
    return (
      <label className={labelClass}>
        {column.label}
        <input type="number" value={value === undefined || value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} className={cx(inputClass, "mt-1")} />
      </label>
    );
  }
  if (column.type === "select") {
    const options = column.ref ? (refs[column.ref] ?? []) : (column.options ?? []);
    return (
      <label className={labelClass}>
        {column.label}
        <select value={str(value)} onChange={(event) => onChange(event.target.value)} className={cx(inputClass, "mt-1")}>
          <option value="">{column.optional ? "None" : "Choose…"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }
  if (column.type === "refs") {
    const selected = arr(value);
    const options = refs[column.ref] ?? [];
    return (
      <div className={cx(labelClass, wide)}>
        {column.label}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {selected.map((slug) => (
            <span key={slug} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-ink-200">
              {options.find((option) => option.value === slug)?.label ?? slug}
              <button type="button" onClick={() => onChange(selected.filter((item) => item !== slug))} aria-label="Remove"><X size={12} /></button>
            </span>
          ))}
          <select value="" onChange={(event) => event.target.value && onChange([...selected, event.target.value])} className="rounded border border-ink-200 bg-white px-1 py-0.5 text-xs" aria-label={`Add to ${column.label}`}>
            <option value="">+ add</option>
            {options.filter((option) => !selected.includes(option.value)).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }
  return (
    <label className={cx(labelClass, wide)}>
      {column.label}
      {column.type === "text" && column.multiline ? (
        <textarea rows={3} value={str(value)} onChange={(event) => onChange(event.target.value)} className={cx(inputClass, "mt-1")} />
      ) : (
        <input value={str(value)} onChange={(event) => onChange(event.target.value)} className={cx(inputClass, "mt-1")} />
      )}
    </label>
  );
}
