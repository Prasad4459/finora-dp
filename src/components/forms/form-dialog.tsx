import { useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * `showWhen` makes a field conditional on the values entered so far — used by
 * instrument-aware forms (an FD asks for a rate, a mutual fund asks for units).
 * Hidden fields are never submitted and never block submission.
 */
type Common = {
  showWhen?: (values: Record<string, string | boolean>) => boolean;
  hint?: string;
  /** Value-aware label (e.g. "Grams held" for per-gram instruments). */
  dynamicLabel?: (values: Record<string, string | boolean>) => string;
  /** Value-aware hint (e.g. the 24K reference convention for gold). */
  dynamicHint?: (values: Record<string, string | boolean>) => string | null;
  /** Shown under the field when it is required but empty on submit. */
  requiredMessage?: string;
};

/** A select option may carry a UUID value plus a rich display label. */
export type SelectOption = { value: string; label: string; hint?: string };

export const normalizeOptions = (options: readonly (string | SelectOption)[]): SelectOption[] =>
  options
    // Radix throws when a SelectItem has an empty value; an empty value means
    // "no selection" and is represented by the placeholder instead.
    .map((o) => (typeof o === "string" ? { value: o, label: o } : o))
    .filter((o) => o.value !== "");

export type FieldDef =
  | ({ key: string; label: string; type: "text" | "number" | "date"; required?: boolean; placeholder?: string; default?: string } & Common)
  | ({ key: string; label: string; type: "select"; options: readonly (string | SelectOption)[]; dynamicOptions?: (values: Record<string, string | boolean>) => readonly (string | SelectOption)[]; required?: boolean; default?: string; placeholder?: string } & Common)
  | ({ key: string; label: string; type: "switch"; default?: string; required?: boolean; placeholder?: string } & Common)
  | ({ key: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; default?: string } & Common);

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | null }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function FormDialog({
  open,
  onClose,
  title,
  fields,
  onSubmit,
  initialValues,
  submitLabel = "Save",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, any>) => void;
  /** Pre-populated values, used when editing an existing entity. */
  initialValues?: Record<string, string | boolean> | null;
  submitLabel?: string;
}) {
  const initial = useMemo(() => {
    const o: Record<string, string | boolean> = {};
    fields.forEach((f) => {
      if (f.type === "switch") o[f.key] = f.default === "true";
      else o[f.key] = f.default ?? "";
    });
    return { ...o, ...(initialValues ?? {}) };
  }, [fields, initialValues]);
  const [values, setValues] = useState<Record<string, string | boolean>>(initial);
  const [showErrors, setShowErrors] = useState(false);

  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) {
      setValues(initial);
      setShowErrors(false);
    }
  }

  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  const visible = fields.filter((f) => (f.showWhen ? f.showWhen(values) : true));

  const isMissing = (f: FieldDef) => {
    if (!f.required) return false;
    const v = values[f.key];
    return typeof v === "string" ? v.trim().length === 0 : false;
  };

  const canSubmit = visible.every((f) => !isMissing(f));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      // Never submit a partially-filled financial form; surface what is missing.
      setShowErrors(true);
      return;
    }
    // Hidden fields must not leak stale values into the payload.
    const visibleKeys = new Set(visible.map((f) => f.key));
    const payload: Record<string, string | boolean> = {};
    Object.entries(values).forEach(([k, v]) => {
      if (visibleKeys.has(k)) payload[k] = v;
    });
    onSubmit(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          {visible.map((f) => (
            <Field
              key={f.key}
              label={f.dynamicLabel ? f.dynamicLabel(values) : f.label}
              error={showErrors && isMissing(f) ? (f.requiredMessage ?? `${f.label} is required`) : null}
            >
              {f.type === "select" ? (
                <Select value={String(values[f.key] ?? "")} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={f.placeholder ?? "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {normalizeOptions(f.dynamicOptions ? f.dynamicOptions(values) : f.options).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex w-full items-center justify-between gap-3">
                          <span>{o.label}</span>
                          {o.hint ? (
                            <span className="text-xs text-muted-foreground">{o.hint}</span>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "switch" ? (
                <div className="flex items-center gap-2">
                  <Switch checked={!!values[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                  <span className="text-xs text-muted-foreground">{f.hint ?? "Repeat this every period"}</span>
                </div>
              ) : f.type === "textarea" ? (
                <Textarea value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : (
                <Input
                  type={f.type}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )}
              {f.type !== "switch" && (f.dynamicHint ? f.dynamicHint(values) : f.hint) ? (
                <p className="text-xs text-muted-foreground">
                  {f.dynamicHint ? f.dynamicHint(values) : f.hint}
                </p>
              ) : null}
            </Field>
          ))}
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}