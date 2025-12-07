import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  buildAuthnRequestXml,
  deflateRawToBase64,
  encodeBase64,
} from '@/features/saml/utils/saml-request'
import { signRedirectRequest, type RedirectSigAlg } from '@/features/saml/utils/redirect-signing'

type Binding = 'HTTP-Redirect' | 'HTTP-POST'
type IsPassiveValue = 'unset' | 'true' | 'false'

export interface SamlRequestBuilderState {
  // Form fields
  issuer: string
  destination: string
  acsUrl: string
  nameIdFormat: string
  forceAuthn: boolean
  relayState: string
  binding: Binding
  requestId: string
  isPassive: IsPassiveValue

  // Computed values
  xml: string
  redirectEncoded: string
  postEncoded: string
  redirectUrl: string
  isDestinationValid: boolean
  destinationForForm: string | undefined

  // Signing
  enableSigning: boolean
  sigAlg: RedirectSigAlg
  privateKeyPem: string
  signedRedirectUrl: string
}

export interface UseSamlRequestBuilderReturn extends SamlRequestBuilderState {
  setIssuer: (value: string) => void
  setDestination: (value: string) => void
  setAcsUrl: (value: string) => void
  setNameIdFormat: (value: string) => void
  setForceAuthn: (value: boolean) => void
  setRelayState: (value: string) => void
  setBinding: (value: Binding) => void
  setRequestId: (value: string) => void
  setIsPassive: (value: IsPassiveValue) => void
  setEnableSigning: (value: boolean) => void
  setSigAlg: (value: RedirectSigAlg) => void
  setPrivateKeyPem: (value: string) => void
  regenerateId: () => void
  copy: (text: string, label?: string) => Promise<void>
  handleSignRedirect: () => Promise<void>
}

/**
 * Custom hook for managing SAML AuthnRequest builder state and logic
 */
export function useSamlRequestBuilder(): UseSamlRequestBuilderReturn {
  // Form fields
  const [issuer, setIssuer] = useState('https://sp.example.com')
  const [destination, setDestination] = useState('https://idp.example.com/sso')
  const [acsUrl, setAcsUrl] = useState('https://sp.example.com/saml/acs')
  const [nameIdFormat, setNameIdFormat] = useState(
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  )
  const [forceAuthn, setForceAuthn] = useState(false)
  const [relayState, setRelayState] = useState('')
  const [binding, setBinding] = useState<Binding>('HTTP-POST')
  const [requestId, setRequestId] = useState<string>('_' + crypto.randomUUID())
  const [isPassive, setIsPassive] = useState<IsPassiveValue>('unset')

  // Encoded values
  const [redirectEncoded, setRedirectEncoded] = useState<string>('')
  const [postEncoded, setPostEncoded] = useState<string>('')
  const [redirectUrl, setRedirectUrl] = useState('')

  // Signing
  const [enableSigning, setEnableSigning] = useState(false)
  const [sigAlg, setSigAlg] = useState<RedirectSigAlg>('rsa-sha256')
  const [privateKeyPem, setPrivateKeyPem] = useState('')
  const [signedRedirectUrl, setSignedRedirectUrl] = useState('')

  // Helper: returns true for valid http(s) URLs
  const isValidHttpUrl = useCallback((url: string) => {
    try {
      const u = new URL(url)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }, [])

  // Compute safe destination for use in form action and a validity flag
  const isDestinationValid = useMemo(
    () => isValidHttpUrl(destination),
    [isValidHttpUrl, destination]
  )
  const destinationForForm = useMemo(
    () => (isDestinationValid ? destination : undefined),
    [isDestinationValid, destination]
  )

  // Generate XML
  const xml = useMemo(
    () =>
      buildAuthnRequestXml({
        issuer,
        destination,
        acsUrl,
        nameIdFormat,
        forceAuthn,
        requestId,
        isPassive: isPassive === 'unset' ? undefined : isPassive === 'true',
      }),
    [issuer, destination, acsUrl, nameIdFormat, forceAuthn, requestId, isPassive]
  )

  // Encode for POST and Redirect bindings
  useEffect(() => {
    // POST binding: base64 of raw XML
    setPostEncoded(encodeBase64(xml))

    // Redirect binding: DEFLATE (raw) + base64 + URL encode
    ;(async () => {
      try {
        const deflated = await deflateRawToBase64(xml)
        setRedirectEncoded(encodeURIComponent(deflated))
      } catch {
        setRedirectEncoded('')
      }
    })()
  }, [xml])

  // Build redirect URL
  useEffect(() => {
    if (!redirectEncoded) {
      setRedirectUrl('')
      return
    }
    const url = new URL(destination, window.location.origin)
    url.searchParams.set('SAMLRequest', redirectEncoded)
    if (relayState) url.searchParams.set('RelayState', relayState)
    setRedirectUrl(url.toString())
    setSignedRedirectUrl('')
  }, [destination, redirectEncoded, relayState])

  // Copy to clipboard helper
  const copy = useCallback(async (text: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(label)
    } catch {
      toast.error('Copy failed')
    }
  }, [])

  // Regenerate request ID
  const regenerateId = useCallback(() => {
    setRequestId('_' + crypto.randomUUID())
  }, [])

  // Sign redirect URL
  const handleSignRedirect = useCallback(async () => {
    try {
      if (!redirectEncoded) {
        toast.error('No encoded Redirect SAMLRequest available')
        return
      }
      if (!privateKeyPem.trim()) {
        toast.error('Private key (PKCS8 PEM) is required to sign')
        return
      }
      const baseUrl = new URL(destination, window.location.origin)
      const { url } = await signRedirectRequest({
        baseUrl: baseUrl.toString(),
        samlRequest: redirectEncoded,
        relayState: relayState || undefined,
        sigAlg,
        privateKeyPem,
      })
      setSignedRedirectUrl(url)
      toast.success('Redirect URL signed')
    } catch (e: any) {
      if (import.meta?.env?.DEV) {
        console.error(e)
      }
      toast.error('Signing failed', { description: e?.message })
      setSignedRedirectUrl('')
    }
  }, [redirectEncoded, privateKeyPem, destination, relayState, sigAlg])

  return {
    // State
    issuer,
    destination,
    acsUrl,
    nameIdFormat,
    forceAuthn,
    relayState,
    binding,
    requestId,
    isPassive,
    xml,
    redirectEncoded,
    postEncoded,
    redirectUrl,
    isDestinationValid,
    destinationForForm,
    enableSigning,
    sigAlg,
    privateKeyPem,
    signedRedirectUrl,

    // Setters
    setIssuer,
    setDestination,
    setAcsUrl,
    setNameIdFormat,
    setForceAuthn,
    setRelayState,
    setBinding,
    setRequestId,
    setIsPassive,
    setEnableSigning,
    setSigAlg,
    setPrivateKeyPem,

    // Methods
    regenerateId,
    copy,
    handleSignRedirect,
  }
}
