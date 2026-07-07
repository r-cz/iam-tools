import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface RequestFormFieldsProps {
  issuer: string
  destination: string
  acsUrl: string
  nameIdFormat: string
  relayState: string
  binding: 'HTTP-Redirect' | 'HTTP-POST'
  requestId: string
  forceAuthn: boolean
  isPassive: 'unset' | 'true' | 'false'
  onIssuerChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onAcsUrlChange: (value: string) => void
  onNameIdFormatChange: (value: string) => void
  onRelayStateChange: (value: string) => void
  onBindingChange: (value: 'HTTP-Redirect' | 'HTTP-POST') => void
  onRequestIdChange: (value: string) => void
  onForceAuthnChange: (value: boolean) => void
  onIsPassiveChange: (value: 'unset' | 'true' | 'false') => void
  onRegenerateId: () => void
}

export function RequestFormFields({
  issuer,
  destination,
  acsUrl,
  nameIdFormat,
  relayState,
  binding,
  requestId,
  forceAuthn,
  isPassive,
  onIssuerChange,
  onDestinationChange,
  onAcsUrlChange,
  onNameIdFormatChange,
  onRelayStateChange,
  onBindingChange,
  onRequestIdChange,
  onForceAuthnChange,
  onIsPassiveChange,
  onRegenerateId,
}: RequestFormFieldsProps) {
  const relayStateInputId = 'saml-request-relay-state-input'
  const bindingSelectId = 'saml-request-binding-select'
  const requestIdInputId = 'saml-request-id-input'
  const isPassiveSelectId = 'saml-request-is-passive-select'
  const nameIdFormatSelectId = 'saml-request-name-id-format-select'
  const forceAuthnSwitchId = 'saml-request-force-authn-switch'

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 min-w-0">
      <div className="grid gap-2 min-w-0">
        <Label htmlFor="saml-request-issuer-input" className="text-sm">
          Issuer (entityID)
        </Label>
        <Input
          id="saml-request-issuer-input"
          data-testid="saml-request-issuer-input"
          value={issuer}
          onChange={(e) => onIssuerChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="grid gap-2 min-w-0">
        <Label htmlFor="saml-request-destination-input" className="text-sm">
          Destination (IdP SSO URL)
        </Label>
        <Input
          id="saml-request-destination-input"
          data-testid="saml-request-destination-input"
          value={destination}
          onChange={(e) => {
            // always allow user editing (so they can fix typos), but do no further processing here
            onDestinationChange(e.target.value)
          }}
          className="w-full"
        />
      </div>
      <div className="grid gap-2 min-w-0">
        <Label htmlFor="saml-request-acs-input" className="text-sm">
          AssertionConsumerServiceURL
        </Label>
        <Input
          id="saml-request-acs-input"
          data-testid="saml-request-acs-input"
          value={acsUrl}
          onChange={(e) => onAcsUrlChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="grid gap-2 min-w-0">
        <Label htmlFor={nameIdFormatSelectId} className="text-sm">
          NameIDFormat
        </Label>
        <Select value={nameIdFormat} onValueChange={onNameIdFormatChange}>
          <SelectTrigger id={nameIdFormatSelectId} className="w-full">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">
              unspecified
            </SelectItem>
            <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
              emailAddress
            </SelectItem>
            <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">
              persistent
            </SelectItem>
            <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">
              transient
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 min-w-0">
        <Label htmlFor={relayStateInputId} className="text-sm">
          RelayState (optional)
        </Label>
        <Input
          id={relayStateInputId}
          value={relayState}
          onChange={(e) => onRelayStateChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="grid gap-2 min-w-0">
        <Label htmlFor={bindingSelectId} className="text-sm">
          Binding
        </Label>
        <Select value={binding} onValueChange={onBindingChange}>
          <SelectTrigger id={bindingSelectId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HTTP-POST">HTTP-POST</SelectItem>
            <SelectItem value="HTTP-Redirect">HTTP-Redirect</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 min-w-0">
        <Label htmlFor={requestIdInputId} className="text-sm">
          Request ID
        </Label>
        <div className="flex gap-2">
          <Input
            id={requestIdInputId}
            value={requestId}
            onChange={(e) => onRequestIdChange(e.target.value)}
            className="w-full"
          />
          <Button variant="outline" onClick={onRegenerateId}>
            New
          </Button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 items-center">
        <div className="flex items-center gap-2">
          <Switch
            id={forceAuthnSwitchId}
            checked={forceAuthn}
            onCheckedChange={onForceAuthnChange}
          />
          <Label htmlFor={forceAuthnSwitchId} className="text-sm">
            ForceAuthn
          </Label>
        </div>
        <div className="grid gap-2 min-w-0">
          <Label htmlFor={isPassiveSelectId} className="text-sm">
            IsPassive
          </Label>
          <Select value={isPassive} onValueChange={onIsPassiveChange}>
            <SelectTrigger id={isPassiveSelectId} className="w-full">
              <SelectValue placeholder="Not included" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Not included</SelectItem>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
