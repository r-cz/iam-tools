import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Key, Info, AlertCircle } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';
import { Button } from '@/components/ui/button';
import { Jwks, JwksKey } from '../utils/types';

interface JwksDisplayProps {
  jwks: Jwks;
  jwksUri: string;
}

export function JwksDisplay({ jwks, jwksUri }: JwksDisplayProps) {
  const [view, setView] = useState<'formatted' | 'raw'>('formatted');
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    jwks.keys.length > 0 ? jwks.keys[0].kid : null
  );
  const { copy, copied } = useClipboard();

  // Get the selected key
  const selectedKey = jwks.keys.find(key => key.kid === selectedKeyId) || null;

  const getKeyTypeLabel = (kty: string) => {
    switch(kty) {
      case 'RSA': return 'RSA';
      case 'EC': return 'Elliptic Curve';
      case 'OKP': return 'Octet Key Pair';
      case 'oct': return 'Symmetric';
      default: return kty;
    }
  };
  
  const getAlgorithmDescription = (alg: string) => {
    if (!alg) return 'Not specified';
    
    // This is a simplified description
    if (alg.startsWith('RS')) return 'RSASSA-PKCS1-v1_5';
    if (alg.startsWith('PS')) return 'RSASSA-PSS';
    if (alg.startsWith('ES')) return 'ECDSA';
    if (alg.startsWith('HS')) return 'HMAC with SHA';
    if (alg === 'EdDSA') return 'Edwards-curve Digital Signature';
    
    return alg;
  };

  const formatFingerprint = (value: string) => {
    return value.replace(/(.{2})/g, '$1:').slice(0, -1);
  };

  // Renders a single key parameter
  const renderKeyParameter = (key: string, value: any) => {
    // Skip the kid and kty as they're shown elsewhere
    if (key === 'kid' || key === 'kty') return null;
    
    let displayValue = '';
    let description = '';
    
    switch(key) {
      case 'use':
        displayValue = value === 'sig' ? 'Signature' : value === 'enc' ? 'Encryption' : value;
        description = 'Intended use for the key';
        break;
      case 'alg': 
        displayValue = value;
        description = getAlgorithmDescription(value);
        break;
      case 'n':
        displayValue = `${value.substring(0, 20)}...`;
        description = 'RSA modulus (base64url encoded)';
        break;
      case 'e':
        displayValue = value;
        description = 'RSA exponent (base64url encoded)';
        break;
      case 'x5c':
        displayValue = `${Array.isArray(value) ? value.length : 0} certificate(s)`;
        description = 'X.509 certificate chain';
        break;
      case 'x5t':
        displayValue = formatFingerprint(value);
        description = 'X.509 certificate SHA-1 thumbprint';
        break;
      case 'x5t#S256':
        displayValue = formatFingerprint(value);
        description = 'X.509 certificate SHA-256 thumbprint';
        break;
      case 'crv':
        displayValue = value;
        description = 'Curve for EC keys';
        break;
      case 'x':
        displayValue = `${value.substring(0, 20)}...`;
        description = 'X coordinate for EC key';
        break;
      case 'y':
        displayValue = `${value.substring(0, 20)}...`;
        description = 'Y coordinate for EC key';
        break;
      default:
        displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        description = 'Additional key parameter';
    }
    
    return (
      <tr key={key}>
        <td className="w-1/4 font-medium">{key}</td>
        <td className="w-2/5 break-all"><code>{displayValue}</code></td>
        <td className="w-2/5">{description}</td>
      </tr>
    );
  };

  const renderKeyDetails = (key: JwksKey) => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="h-5 w-5" />
              <span>Key Details</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Detailed view of the selected key with ID: <code className="bg-muted px-1">{key.kid}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copy(JSON.stringify(key, null, 2))}
            >
              {copied ? 'Copied!' : 'Copy Key JSON'}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Key Properties</h4>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-1/3 font-medium">Key ID</td>
                  <td>
                    <code className="break-all">{key.kid}</code>
                  </td>
                </tr>
                <tr>
                  <td className="w-1/3 font-medium">Key Type</td>
                  <td>
                    <Badge variant="outline" className="bg-primary/10">
                      {getKeyTypeLabel(key.kty)}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <td className="w-1/3 font-medium">Usage</td>
                  <td>
                    {key.use ? (
                      <Badge variant={key.use === 'sig' ? 'default' : 'secondary'}>
                        {key.use === 'sig' ? 'Signature' : 'Encryption'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="w-1/3 font-medium">Algorithm</td>
                  <td>
                    {key.alg ? (
                      <Badge variant="outline">{key.alg}</Badge>
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Key Format</h4>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Info className="h-4 w-4 text-blue-500" />
                <p className="text-sm">
                  This is a JWK (JSON Web Key) as defined in 
                  <a 
                    href="https://tools.ietf.org/html/rfc7517" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:underline"
                  >
                    RFC 7517
                  </a>
                </p>
              </div>
              
              {key.kty === 'RSA' && (
                <div className="flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This is an RSA key. For security reasons, only the public parts (modulus and exponent) are included.
                  </p>
                </div>
              )}
              
              {key.kty === 'EC' && (
                <div className="flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This is an Elliptic Curve key on curve {key.crv}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-2">All Key Parameters</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-2">Parameter</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(key).map(([k, v]) => renderKeyParameter(k, v))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>JSON Web Key Set (JWKS)</CardTitle>
        <CardDescription>
          Fetched from: <code className="text-xs">{jwksUri}</code>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as 'formatted' | 'raw')} className="w-full">
          <div className="flex justify-start mb-4">
            <TabsList className="grid w-full md:w-[300px] grid-cols-2">
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="formatted">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Keys ({jwks.keys.length})</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Key ID (kid)</TableHead>
                    <TableHead className="w-1/4">Type</TableHead> {/* Adjusted width */}
                    <TableHead className="w-1/4">Usage</TableHead> {/* Adjusted width */}
                    <TableHead className="w-1/4">Algorithm</TableHead> {/* Adjusted width */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jwks.keys.map((key) => (
                    <TableRow 
                      key={key.kid} 
                      className={`cursor-pointer hover:bg-muted/30 ${key.kid === selectedKeyId ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelectedKeyId(key.kid)}
                    >
                      <TableCell className="font-mono text-sm">{key.kid}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{key.kty}</Badge>
                      </TableCell>
                      <TableCell>
                        {key.use ? (
                          <Badge variant={key.use === 'sig' ? 'default' : 'secondary'} className="px-2 py-0 text-xs">
                            {key.use === 'sig' ? 'Signature' : key.use}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {key.alg ? (
                          <code className="text-xs">{key.alg}</code>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <Separator />
            
            {selectedKey && renderKeyDetails(selectedKey)}
          </div>
        </TabsContent>
        
        <TabsContent value="raw">
          <CodeBlock
            code={JSON.stringify(jwks, null, 2)}
            language="json"
            className="max-h-[70vh] overflow-auto"
          />
        </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t pt-6">
        <div className="text-xs text-muted-foreground">
          <p>A JSON Web Key Set (JWKS) contains the public keys that can be used to verify tokens issued by the identity provider.</p>
          <p className="mt-1">These keys are used for signature validation and encryption/decryption operations in OAuth 2.0 and OpenID Connect.</p>
        </div>
      </CardFooter>
    </Card>
  );
}
