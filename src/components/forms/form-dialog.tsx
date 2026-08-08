import { useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type FieldDef =
  | { key: string; label: string; type: "text" | "number" | "date"; required?: boolean; placeholder?: string; default?: string }
  | { key: string; label: string; type: "select"; options: readonly string[] | string[]; required?: boolean; default?: string; placeholder?: string }
  | { key: string; label: string; type: "switch"; default?: string; required?: boolean; placeholder?: string }
  | { key: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; default?: string };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
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

  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) setValues(initial);
  }

  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  const canSubmit = fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.key];
    return typeof v === "string" ? v.trim().length > 0 : true;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "select" ? (
                <Select value={String(values[f.key] ?? "")} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={f.placeholder ?? "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "switch" ? (
                <div className="flex items-center gap-2">
                  <Switch checked={!!values[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                  <span className="text-xs text-muted-foreground">Repeat this every period</span>
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
            </Field>
          ))}
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}