import { useState } from "react";
import * as jose from "jose";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { TokenInput } from "./components/TokenInput";
import { TokenHeader } from "./components/TokenHeader";
import { TokenPayload } from "./components/TokenPayload";
import { TokenSignature } from "./components/TokenSignature";
import { TokenTimeline } from "./components/TokenTimeline";
import { TokenSize } from "./components/TokenSize";
import { validateToken, determineTokenType } from "./utils/token-validation";
import { TokenType, DecodedToken, ValidationResult } from "./utils/types";

export function TokenInspector() {
  const [token, setToken] = useState("");
  const [jwks, setJwks] = useState<jose.JSONWebKeySet | null>(null);
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [tokenType, setTokenType] = useState<TokenType>("id_token");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [activeTab, setActiveTab] = useState("payload");
  const [issuerUrl, setIssuerUrl] = useState("");

  const decodeToken = async () => {
    if (!token) {
      return;
    }

    try {
      // Parse the token to get parts
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Base64 URL decode the header and payload
      const [encodedHeader, encodedPayload] = parts;
      
      // Convert base64url to base64
      const base64Header = encodedHeader.replace(/-/g, '+').replace(/_/g, '/');
      const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding
      const paddedHeader = base64Header + '='.repeat((4 - base64Header.length % 4) % 4);
      const paddedPayload = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4);
      
      // Decode
      const header = JSON.parse(atob(paddedHeader));
      const payload = JSON.parse(atob(paddedPayload));

      // Use the determineTokenType function
      const detectedTokenType = determineTokenType(header, payload);
      console.log('Detected token type:', detectedTokenType);
      
      setTokenType(detectedTokenType);
      
      // Extract issuer URL from payload if present and auto-fetch JWKS
      if (payload.iss) {
        const newIssuerUrl = payload.iss;
        console.log('Extracted issuer URL from token:', newIssuerUrl);
        
        // Only update if it's different to avoid unnecessary re-renders
        if (newIssuerUrl !== issuerUrl) {
          setIssuerUrl(newIssuerUrl);
          
          // Note: We don't auto-fetch here because the issuerUrl state won't be updated yet
          // The fetchJwks function in TokenJwksResolver will be triggered automatically
          // through the "Fetch JWKS automatically" button that appears
        }
      }

      // Perform validation using the validation function
      const validationResults = validateToken(header, payload, detectedTokenType);

      let signatureValid = false;
      let signatureError = undefined;

      // Verify signature if JWKS is provided
      if (jwks) {
        try {
          // Find the matching key by kid
          const matchingKey = jwks.keys.find(k => k.kid === header.kid);
          
          // Add logging to help with debugging
          console.log('Verifying token signature with JWKS:', { 
            tokenKid: header.kid,
            jwksKeyCount: jwks.keys.length,
            jwksKeys: jwks.keys.map((k: {kid?: string}) => k.kid),
            foundMatchingKey: !!matchingKey
          });
          
          if (!matchingKey) {
            throw new Error(`No key with matching kid ${header.kid} found in JWKS`);
          }
          
          // Create a key object and verify
          const key = await jose.importJWK(matchingKey, header.alg);
          await jose.jwtVerify(token, key);
          signatureValid = true;
        } catch (e: any) {
          console.error('Signature verification error:', e);
          signatureError = e.message;
        }
      }

      setDecodedToken({
        header,
        payload,
        signature: {
          valid: signatureValid,
          error: signatureError
        },
        raw: token
      });

      setValidationResults(validationResults);
      
    } catch (err: any) {
      setDecodedToken({
        header: {},
        payload: {},
        signature: {
          valid: false,
          error: err.message
        },
        raw: token
      });
      setValidationResults([{
        claim: "format",
        valid: false,
        message: err.message,
        severity: "error"
      }]);
    }
  };

  const handleJwksResolved = async (resolvedJwks: jose.JSONWebKeySet) => {
    console.log('JWKS resolved:', { 
      keyCount: resolvedJwks.keys.length,
      keyIds: resolvedJwks.keys.map((k: {kid?: string}) => k.kid) 
    });
    
    // Store the JWKS first
    setJwks(resolvedJwks);
    
    // If we have a token, directly verify it without relying on state updates
    if (token) {
      try {
        // Parse the token to get parts for header
        const parts = token.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT format");
        }

        // Get the header to find the kid and alg
        const encodedHeader = parts[0];
        const base64Header = encodedHeader.replace(/-/g, '+').replace(/_/g, '/');
        const paddedHeader = base64Header + '='.repeat((4 - base64Header.length % 4) % 4);
        const header = JSON.parse(atob(paddedHeader));
        
        // Find the matching key by kid
        const matchingKey = resolvedJwks.keys.find(k => k.kid === header.kid);
        
        console.log('Direct verification with matching key:', {
          headerKid: header.kid,
          foundMatchingKey: !!matchingKey,
          alg: header.alg
        });
        
        if (matchingKey) {
          // Create a key object and verify
          const key = await jose.importJWK(matchingKey, header.alg);
          await jose.jwtVerify(token, key);
          
          // Force update the decoded token with valid signature
          if (decodedToken) {
            setDecodedToken({
              ...decodedToken,
              signature: {
                valid: true,
                error: undefined
              }
            });
          } else {
            // If no decoded token yet, do a full decode
            console.log('No decoded token yet, performing full decode');
            decodeToken();
          }
        } else {
          throw new Error(`No key with matching kid ${header.kid} found`);
        }
      } catch (err: any) {
        console.error('Direct verification error:', err);
        if (decodedToken) {
          // Update with error
          setDecodedToken({
            ...decodedToken,
            signature: {
              valid: false,
              error: err.message
            }
          });
        } else {
          // If no decoded token yet, do a full decode
          decodeToken();
        }
      }
    }
  };

  // Helper to get token type badge
  const getTokenTypeBadge = () => {
    if (tokenType === "id_token") {
      return <Badge variant="outline" className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/20">OIDC ID Token</Badge>;
    } else if (tokenType === "access_token") {
      if (decodedToken?.header.typ === "at+jwt" || decodedToken?.header.typ === "application/at+jwt") {
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-700 hover:bg-purple-500/20">OAuth JWT Access Token (RFC9068)</Badge>;
      } else {
        return <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">OAuth Access Token</Badge>;
      }
    } else {
      return <Badge variant="outline" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">Unknown Token Type</Badge>;
    }
  };

  // Helper to get signature status badge
  const getSignatureStatusBadge = () => {
    if (!decodedToken) return null;
    
    if (decodedToken.signature.valid) {
      return <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">Signature Valid</Badge>;
    } else if (jwks) {
      return <Badge variant="outline" className="bg-red-500/20 text-red-700 hover:bg-red-500/20">Signature Invalid</Badge>;
    } else {
      return <Badge variant="outline" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">Signature Not Verified</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <TokenInput 
            token={token} 
            setToken={setToken} 
            onDecode={decodeToken} 
          />
        </CardContent>
      </Card>

      {decodedToken && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col space-y-3 mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getSignatureStatusBadge()}
                </div>
                <div className="flex items-center">
                  <span className="mr-2 text-sm">Detected:</span>
                  {getTokenTypeBadge()}
                </div>
              </div>
              
              {tokenType === "unknown" && (
                <Alert className="mt-2 bg-amber-500/10 border-amber-500/20 text-amber-700">
                  <AlertDescription>
                    Missing standard claims. Check browser console for details.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="border-t pt-3">
                <TokenSize token={decodedToken.raw} />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full flex overflow-x-auto max-w-full">
                <TabsTrigger value="header" className="flex-1 min-w-fit">Header</TabsTrigger>
                <TabsTrigger value="payload" className="flex-1 min-w-fit">Payload</TabsTrigger>
                <TabsTrigger value="signature" className="flex-1 min-w-fit">Signature</TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1 min-w-fit">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="header">
                <TokenHeader 
                  header={decodedToken.header} 
                  validationResults={validationResults.filter(r => r.claim.startsWith('header.'))}
                />
              </TabsContent>
              
              <TabsContent value="payload">
                <TokenPayload 
                  payload={decodedToken.payload} 
                  tokenType={tokenType}
                  validationResults={validationResults.filter(r => !r.claim.startsWith('header.'))}
                />
              </TabsContent>
              
              <TabsContent value="signature">
                <TokenSignature 
                  token={decodedToken.raw}
                  header={decodedToken.header}
                  signatureError={decodedToken.signature.error}
                  jwks={jwks}
                  issuerUrl={issuerUrl}
                  setIssuerUrl={setIssuerUrl}
                  onJwksResolved={handleJwksResolved}
                />
              </TabsContent>
              
              <TabsContent value="timeline">
                <TokenTimeline payload={decodedToken.payload} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
