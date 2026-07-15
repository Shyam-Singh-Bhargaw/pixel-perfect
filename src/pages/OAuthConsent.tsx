import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type AuthOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const oauth = (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border">
          <CardHeader><CardTitle className="text-destructive">Authorization error</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{error}</p></CardContent>
        </Card>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary font-heading">Loading…</div>
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";
  const scopes: string[] = (details.scopes ?? details.requested_scopes ?? details.scope?.split(" ") ?? []).filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg border-border">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Connect {clientName} to PrepOS</CardTitle>
          <CardDescription>
            This lets {clientName} use PrepOS as you — reading your tasks, revision items, study notes, and job applications, and creating new tasks or notes on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scopes.length > 0 && (
            <div className="text-sm">
              <div className="text-muted-foreground mb-1">Requested access:</div>
              <ul className="list-disc pl-5 space-y-1">
                {scopes.map(s => <li key={s} className="font-mono text-xs">{s}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This does not bypass PrepOS's permissions — all data access still runs under your account's row-level security.
          </p>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
            <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
