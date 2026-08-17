import { DecodedSamlResponse } from '../utils/saml-decoder'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import {
  verifySamlResponseSignatures,
  type ResponseVerifyResult,
  type SignatureVerificationOutcome,
} from '../utils/signature-verify'

interface SignatureDisplayProps {
  response: DecodedSamlResponse
  verifySignatures?: typeof verifySamlResponseSignatures
}

export function SignatureDisplay({
  response,
  verifySignatures = verifySamlResponseSignatures,
}: SignatureDisplayProps) {
  const [certPem, setCertPem] = useState('')
  const [verification, setVerification] = useState<VerificationState>({ status: 'idle' })
  const requestIdRef = useRef(0)

  useEffect(() => {
    requestIdRef.current += 1
    setVerification({ status: 'idle' })
  }, [response.xml])

  const onVerify = async () => {
    const requestId = ++requestIdRef.current
    const submittedXml = response.xml
    const submittedCert = certPem
    setVerification({ status: 'running', requestId })
    try {
      const result = await verifySignatures(submittedXml, submittedCert)
      if (requestIdRef.current === requestId) {
        setVerification({ status: 'complete', requestId, result })
      }
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setVerification({
          status: 'failed',
          requestId,
          message: error instanceof Error ? error.message : 'Verification failed',
        })
      }
    }
  }

  const onCertificateChange = (value: string) => {
    requestIdRef.current += 1
    setCertPem(value)
    setVerification({ status: 'idle' })
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
          onChange={(e) => onCertificateChange(e.target.value)}
          className="font-mono"
        />
        <div>
          <Button
            onClick={onVerify}
            disabled={!certPem.trim() || verification.status === 'running'}
          >
            {verification.status === 'running' ? 'Verifying…' : 'Verify Signatures'}
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
      {verification.status === 'complete' && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Verification Results</div>
          <div className="text-sm">Response: {formatResult(verification.result.response)}</div>
          {verification.result.assertions.map((assertion, assertionIndex) => (
            <div key={assertion.id ?? `assertion-${assertionIndex + 1}`} className="text-sm">
              Assertion {assertion.id ? `(${assertion.id})` : `#${assertionIndex + 1}`}:{' '}
              {formatResult(assertion.result)}
            </div>
          ))}
        </div>
      )}
      {verification.status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{verification.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

type VerificationState =
  | { status: 'idle' }
  | { status: 'running'; requestId: number }
  | { status: 'complete'; requestId: number; result: ResponseVerifyResult }
  | { status: 'failed'; requestId: number; message: string }

function formatResult(result: SignatureVerificationOutcome) {
  switch (result.status) {
    case 'unsigned':
      return 'No signature'
    case 'valid':
      return 'Valid'
    case 'invalid':
      return 'Invalid'
    case 'error':
      return `Error — ${result.message}`
  }
}
