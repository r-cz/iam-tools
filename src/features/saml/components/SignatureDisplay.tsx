import { DecodedSamlResponse } from '../utils/saml-decoder'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { verifySamlResponseSignatures } from '../utils/signature-verify'

interface SignatureDisplayProps {
  response: DecodedSamlResponse
}

export function SignatureDisplay({ response }: SignatureDisplayProps) {
  const [certPem, setCertPem] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{
    response?: { present: boolean; valid: boolean | null; error?: string }
    assertions?: Array<{ id?: string; present: boolean; valid: boolean | null; error?: string }>
  } | null>(null)

  const onVerify = async () => {
    try {
      setVerifying(true)
      const r = await verifySamlResponseSignatures(response.xml, certPem)
      setResult({
        response: r.response,
        assertions: r.assertions.map((a) => ({ id: a.id, ...a.result })),
      })
    } catch (e: any) {
      setResult({ response: { present: true, valid: false, error: e?.message } })
    } finally {
      setVerifying(false)
    }
  }

  const hasAnySignature = response.hasSignature || response.assertions.some((a) => a.hasSignature)

  if (!hasAnySignature) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>This SAML Response and its assertions are not signed.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <div className="text-sm font-medium">IdP Certificate (PEM or base64)</div>
        <Textarea
          rows={6}
          placeholder={'-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----'}
          value={certPem}
          onChange={(e) => setCertPem(e.target.value)}
          className="font-mono"
        />
        <div>
          <Button onClick={onVerify} disabled={!certPem.trim() || verifying}>
            {verifying ? 'Verifying…' : 'Verify Signatures'}
          </Button>
        </div>
      </div>
      {/* Response Signature */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <h4 className="text-sm font-medium">Response Signature</h4>
        </div>
        <div className="ml-6">
          {response.hasSignature ? (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
              Response is signed
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-500/20 text-gray-700">
              Response is not signed
            </Badge>
          )}
        </div>
      </div>

      {/* Assertion Signatures */}
      {response.assertions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Assertion Signatures</h4>
          <div className="ml-6 space-y-2">
            {response.assertions.map((assertion, index) => (
              <div key={assertion.id} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Assertion #{index + 1}:</span>
                {assertion.hasSignature ? (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                    Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/20 text-gray-700">
                    Not signed
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Verification Results</div>
          <div className="text-sm">Response: {formatResult(result.response)}</div>
          {result.assertions?.map((a, i) => (
            <div key={i} className="text-sm">
              Assertion {a.id ? `(${a.id})` : `#${i + 1}`}: {formatResult(a)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatResult(r?: { present?: boolean; valid?: boolean | null; error?: string }) {
  if (!r) return '—'
  if (!r.present) return 'No signature'
  if (r.valid === true) return 'Valid'
  if (r.valid === false) return `Invalid${r.error ? ` — ${r.error}` : ''}`
  return 'Unknown'
}
