import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import type { RedirectSigAlg } from '@/features/saml/utils/redirect-signing'

interface LaunchTabProps {
  binding: 'HTTP-Redirect' | 'HTTP-POST'
  redirectUrl: string
  postEncoded: string
  relayState: string
  isDestinationValid: boolean
  destinationForForm: string | undefined
  enableSigning: boolean
  sigAlg: RedirectSigAlg
  privateKeyPem: string
  signedRedirectUrl: string
  onEnableSigningChange: (value: boolean) => void
  onSigAlgChange: (value: RedirectSigAlg) => void
  onPrivateKeyPemChange: (value: string) => void
  onSignRedirect: () => Promise<void>
  onCopy: (text: string, label?: string) => Promise<void>
}

export function LaunchTab({
  binding,
  redirectUrl,
  postEncoded,
  relayState,
  isDestinationValid,
  destinationForForm,
  enableSigning,
  sigAlg,
  privateKeyPem,
  signedRedirectUrl,
  onEnableSigningChange,
  onSigAlgChange,
  onPrivateKeyPemChange,
  onSignRedirect,
  onCopy,
}: LaunchTabProps) {
  return (
    <div className="grid gap-3 min-w-0">
      <div className="text-sm text-muted-foreground">Launch AuthnRequest</div>
      {binding === 'HTTP-Redirect' ? (
        <div className="grid gap-2">
          <div className="min-w-0">
            <JsonDisplay data={redirectUrl} language="text" maxHeight="120px" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.open(redirectUrl, '_blank')} disabled={!redirectUrl}>
              Open Redirect URL
            </Button>
            <Button
              variant="outline"
              onClick={() => onCopy(redirectUrl, 'URL copied')}
              disabled={!redirectUrl}
            >
              Copy URL
            </Button>
          </div>

          <div className="mt-4 border-t pt-4 grid gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={enableSigning} onCheckedChange={onEnableSigningChange} />
              <span className="text-sm">Sign Redirect (adds Signature)</span>
            </div>
            {enableSigning && (
              <>
                <div className="grid md:grid-cols-2 gap-2 items-center">
                  <div className="grid gap-1">
                    <label className="text-sm">SigAlg</label>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={sigAlg}
                      onChange={(e) => onSigAlgChange(e.target.value as RedirectSigAlg)}
                    >
                      <option value="rsa-sha256">RSA-SHA256</option>
                      {/* Future: ecdsa-sha256 */}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 min-w-0">
                  <label className="text-sm">Private Key (PKCS8 PEM)</label>
                  <Textarea
                    value={privateKeyPem}
                    onChange={(e) => onPrivateKeyPemChange(e.target.value)}
                    rows={8}
                    placeholder={'-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----'}
                    className="font-mono w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={onSignRedirect} disabled={!redirectUrl}>
                    Sign URL
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onCopy(privateKeyPem, 'Key copied')}
                    disabled={!privateKeyPem.trim()}
                  >
                    Copy Key
                  </Button>
                </div>
                <div className="grid gap-2 min-w-0">
                  <label className="text-sm">Signed Redirect URL</label>
                  <JsonDisplay data={signedRedirectUrl} language="text" maxHeight="120px" />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(signedRedirectUrl, '_blank')}
                      disabled={!signedRedirectUrl}
                    >
                      Open Signed URL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onCopy(signedRedirectUrl, 'Signed URL copied')}
                      disabled={!signedRedirectUrl}
                    >
                      Copy Signed URL
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <form
          method="post"
          action={destinationForForm}
          onSubmit={(e) => {
            if (!isDestinationValid) {
              e.preventDefault()
            }
          }}
          target="_blank"
          className="grid gap-2 min-w-0"
        >
          <input type="hidden" name="SAMLRequest" value={postEncoded} />
          {relayState && <input type="hidden" name="RelayState" value={relayState} />}
          <div className="text-xs text-muted-foreground">Submits via HTTP-POST to the IdP</div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!isDestinationValid}>
              Submit POST to IdP
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => onCopy(postEncoded, 'SAMLRequest copied')}
            >
              Copy POST SAMLRequest
              {!isDestinationValid && (
                <div className="text-xs text-red-600 mt-1">
                  Invalid Destination URL. Please enter a valid https:// or http:// URL.
                </div>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
