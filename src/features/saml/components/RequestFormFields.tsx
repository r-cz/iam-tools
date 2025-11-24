import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 min-w-0">
      <div className="grid gap-2 min-w-0">
        <label className="text-sm">Issuer (entityID)</label>
        <Input value={issuer} onChange={(e) => onIssuerChange(e.target.value)} className="w-full" />
      </div>
      <div className="grid gap-2 min-w-0">
        <label className="text-sm">Destination (IdP SSO URL)</label>
        <Input
          value={destination}
          onChange={(e) => {
            // always allow user editing (so they can fix typos), but do no further processing here
            onDestinationChange(e.target.value)
          }}
          className="w-full"
        />
      </div>
      <div className="grid gap-2 min-w-0">
        <label className="text-sm">AssertionConsumerServiceURL</label>
        <Input value={acsUrl} onChange={(e) => onAcsUrlChange(e.target.value)} className="w-full" />
      </div>
      <div className="grid gap-2 min-w-0">
        <label className="text-sm">NameIDFormat</label>
        <Select value={nameIdFormat} onValueChange={onNameIdFormatChange}>
          <SelectTrigger className="w-full">
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
        <label className="text-sm">RelayState (optional)</label>
        <Input
          value={relayState}
          onChange={(e) => onRelayStateChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="grid gap-2 min-w-0">
        <label className="text-sm">Binding</label>
        <Select value={binding} onValueChange={onBindingChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HTTP-POST">HTTP-POST</SelectItem>
            <SelectItem value="HTTP-Redirect">HTTP-Redirect</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 min-w-0">
        <label className="text-sm">Request ID</label>
        <div className="flex gap-2">
          <Input
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
          <Switch checked={forceAuthn} onCheckedChange={onForceAuthnChange} />
          <span className="text-sm">ForceAuthn</span>
        </div>
        <div className="grid gap-2 min-w-0">
          <label className="text-sm">IsPassive</label>
          <Select value={isPassive} onValueChange={onIsPassiveChange}>
            <SelectTrigger className="w-full">
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
