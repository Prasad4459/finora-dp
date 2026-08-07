import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/finance/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { userSettingsRepo } from "@/repositories";

export function Settings() {
  const [email, setEmail] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const settingsQ = useQuery({ queryKey: ["user-settings"], queryFn: () => userSettingsRepo.getMine() });
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    if (settingsQ.data) setCurrency(settingsQ.data.currency);
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: () => userSettingsRepo.upsertMine({ currency: currency || "INR" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Preferences saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save preferences"),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your Finora workspace." />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} readOnly />
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default currency</Label>
            <Input
              value={settingsQ.isLoading ? "" : currency}
              placeholder="INR (₹)"
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || settingsQ.isLoading}>
            {save.isPending ? "Saving..." : "Save preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
