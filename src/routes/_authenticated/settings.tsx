import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/finance/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MoneyOS" }] }),
  component: Settings,
});

function Settings() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your MoneyOS workspace." />

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
            <Input defaultValue="INR (₹)" />
          </div>
          <Button size="sm">Save preferences</Button>
        </CardContent>
      </Card>
    </div>
  );
}
