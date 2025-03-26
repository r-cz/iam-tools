import { useState, useEffect } from "react";
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
import { verifySignature } from "@/lib/jwt/verify-signature";
import { getIssuerBaseUrl } from "@/lib/jwt/generate-signed-token";

export function TokenInspector() {
  const [token, setToken] = useState("");
  const [jwks, setJwks] = useState<jose.JSONWebKeySet | null>(null);
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [tokenType, setTokenType] = useState<TokenType>("id_token");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [activeTab, setActiveTab] = useState("payload");
  const [issuerUrl, setIssuerUrl] = useState("");
  const [isDemoToken, setIsDemoToken] = useState(false);
  
  // Reset issuer URL if it's the default example.com one
  useEffect(() => {
    if (issuerUrl === "https://auth.example.com") {
      // Use the local issuer URL
      const localIssuerUrl = getIssuerBaseUrl();
      console.log('Replacing auth.example.com with local issuer:', localIssuerUrl);
      setIssuerUrl(localIssuerUrl);
    }
  }, [issuerUrl]);

  const resetState = () => {
    // Clear the token
    setToken("");
    // Reset decoded token data
    setDecodedToken(null);
    // Reset validation results
    setValidationResults([]);
    // Reset to default tab
    setActiveTab("payload");
    // Reset demo token status
    setIsDemoToken(false);
    // Reset JWKS and issuer URL if needed
    setJwks(null);
    setIssuerUrl("");
  };

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

      // Check if this is a demo token
      const isDemoTokenCheck = payload.is_demo_token === true || 
        (payload.iss && (
          payload.iss.includes(window.location.host) || 
          payload.iss === "http://localhost:8788/api"
        ));
      setIsDemoToken(isDemoTokenCheck);
      
      console.log('Decoded token:', { 
        header, 
        payload, 
        isDemoToken: isDemoTokenCheck,
        issuer: payload.iss 
      });

      // Use the determineTokenType function
      const detectedTokenType = determineTokenType(header, payload);
      console.log('Detected token type:', detectedTokenType);
      
      setTokenType(detectedTokenType);
      
      // Extract issuer URL from payload if present and auto-fetch JWKS
      if (payload.iss) {
        // Handle the special case of auth.example.com
        let newIssuerUrl = payload.iss;
        
        if (newIssuerUrl === "https://auth.example.com" || isDemoTokenCheck) {
          newIssuerUrl = getIssuerBaseUrl();
          console.log('Using local issuer URL instead of auth.example.com:', newIssuerUrl);
        }
        
        console.log('Extracted issuer URL from token:', newIssuerUrl);
        
        // Only update if it's different to avoid unnecessary re-renders
        if (newIssuerUrl !== issuerUrl) {
          setIssuerUrl(newIssuerUrl);
        }
      }

      // Perform validation using the validation function
      const validationResults = validateToken(header, payload, detectedTokenType);

      let signatureValid = false;
      let signatureError = undefined;

      // Verify signature if JWKS is provided
      if (jwks) {
        try {
          // Use our verification utility
          const verificationResult = await verifySignature(token, jwks);
          
          signatureValid = verificationResult.valid;
          signatureError = verificationResult.error;
          
          console.log('Signature verification result:', verificationResult);
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
    
    // If we have a token, verify it
    if (token) {
      try {
        // Use our verification utility
        const verificationResult = await verifySignature(token, resolvedJwks);
        
        console.log('Signature verification with new JWKS:', verificationResult);
        
        // Update the decoded token with the verification result
        if (decodedToken) {
          setDecodedToken({
            ...decodedToken,
            signature: {
              valid: verificationResult.valid,
              error: verificationResult.error
            }
          });
        } else {
          // If no decoded token yet, do a full decode
          decodeToken();
        }
      } catch (err: any) {
        console.error('Verification error:', err);
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
            onReset={resetState} 
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
                  {isDemoToken && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/10">Demo Token</Badge>
                  )}
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
                  payload={decodedToken.payload}
                  signatureError={decodedToken.signature.error}
                  signatureValid={decodedToken.signature.valid}
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
