import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
  [key: string]: any;
}

export function ClientCredentialsFlow() {
  const [tokenEndpoint, setTokenEndpoint] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);
      if (scope) params.append("scope", scope);

      const res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        error: "network_error",
        error_description: err.message || "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Credentials Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="token-endpoint">Token Endpoint</Label>
            <Input
              id="token-endpoint"
              type="url"
              value={tokenEndpoint}
              onChange={(e) => setTokenEndpoint(e.target.value)}
              required
              placeholder="https://example.com/oauth/token"
            />
          </div>
          <div>
            <Label htmlFor="client-id">Client ID</Label>
            <Input
              id="client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="client-secret">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="scope">Scope (optional)</Label>
            <Input
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="space-separated scopes"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Requesting..." : "Request Token"}
          </Button>
        </form>
        {result && (
          <div className="mt-6">
            <Label>Result</Label>
            <textarea
              readOnly
              value={JSON.stringify(result, null, 2)}
              className="font-mono text-xs w-full rounded border p-2 bg-muted"
              rows={8}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ClientCredentialsFlow;
