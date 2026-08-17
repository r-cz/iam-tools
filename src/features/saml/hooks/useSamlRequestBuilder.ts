import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  buildAuthnRequestXml,
  deflateRawToBase64,
  encodeBase64,
} from '@/features/saml/utils/saml-request'
import {
  buildRedirectUrl,
  parseRedirectDestination,
  signRedirectRequest,
  type RedirectSigAlg,
} from '@/features/saml/utils/redirect-signing'
import { copyTextToClipboard } from '@/hooks/use-clipboard'

type Binding = 'HTTP-Redirect' | 'HTTP-POST'
type IsPassiveValue = 'unset' | 'true' | 'false'
type RedirectEncodingStatus = 'pending' | 'ready' | 'error'

type RedirectArtifact =
  | { status: 'pending'; xml: string }
  | { status: 'ready'; xml: string; base64: string }
  | { status: 'error'; xml: string }

type SignedArtifact =
  | { status: 'idle' }
  | { status: 'pending'; key: string }
  | { status: 'ready'; key: string; url: string }
  | { status: 'error'; key: string }

export interface SamlRequestBuilderState {
  issuer: string
  destination: string
  acsUrl: string
  nameIdFormat: string
  forceAuthn: boolean
  relayState: string
  binding: Binding
  requestId: string
  isPassive: IsPassiveValue
  xml: string
  redirectBase64: string
  redirectEncodingStatus: RedirectEncodingStatus
  postEncoded: string
  redirectUrl: string
  isDestinationValid: boolean
  destinationForForm: string | undefined
  enableSigning: boolean
  sigAlg: RedirectSigAlg
  privateKeyPem: string
  signedRedirectUrl: string
  isSigning: boolean
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

export function useSamlRequestBuilder(): UseSamlRequestBuilderReturn {
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
  const [enableSigning, setEnableSigning] = useState(false)
  const [sigAlg, setSigAlg] = useState<RedirectSigAlg>('rsa-sha256')
  const [privateKeyPem, setPrivateKeyPem] = useState('')

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
  const postEncoded = useMemo(() => encodeBase64(xml), [xml])
  const [redirectArtifact, setRedirectArtifact] = useState<RedirectArtifact>({
    status: 'pending',
    xml,
  })

  useEffect(() => {
    let current = true
    setRedirectArtifact({ status: 'pending', xml })
    void deflateRawToBase64(xml).then(
      (base64) => {
        if (current) setRedirectArtifact({ status: 'ready', xml, base64 })
      },
      () => {
        if (current) setRedirectArtifact({ status: 'error', xml })
      }
    )
    return () => {
      current = false
    }
  }, [xml])

  const redirectBase64 =
    redirectArtifact.status === 'ready' && redirectArtifact.xml === xml
      ? redirectArtifact.base64
      : ''
  const redirectEncodingStatus: RedirectEncodingStatus =
    redirectArtifact.xml === xml ? redirectArtifact.status : 'pending'

  const isDestinationValid = useMemo(() => {
    try {
      parseRedirectDestination(destination)
      return true
    } catch {
      return false
    }
  }, [destination])
  const destinationForForm = isDestinationValid ? destination : undefined

  const redirectUrl = useMemo(() => {
    if (!redirectBase64) return ''
    try {
      return buildRedirectUrl({
        destination,
        samlRequest: redirectBase64,
        relayState: relayState || undefined,
      })
    } catch {
      return ''
    }
  }, [destination, redirectBase64, relayState])

  const signingKey = useMemo(
    () => JSON.stringify([destination, redirectBase64, relayState, sigAlg, privateKeyPem]),
    [destination, redirectBase64, relayState, sigAlg, privateKeyPem]
  )
  const signingGenerationRef = useRef(0)
  const [signedArtifact, setSignedArtifact] = useState<SignedArtifact>({ status: 'idle' })
  const signedRedirectUrl =
    signedArtifact.status === 'ready' && signedArtifact.key === signingKey ? signedArtifact.url : ''
  const isSigning = signedArtifact.status === 'pending' && signedArtifact.key === signingKey

  const copy = useCallback(async (text: string, label = 'Copied') => {
    const copied = await copyTextToClipboard(text)
    if (copied) toast.success(label)
    else toast.error('Copy failed')
  }, [])

  const regenerateId = useCallback(() => {
    setRequestId('_' + crypto.randomUUID())
  }, [])

  const handleSignRedirect = useCallback(async () => {
    if (!redirectBase64) {
      toast.error('No encoded Redirect SAMLRequest available')
      return
    }
    if (!privateKeyPem.trim()) {
      toast.error('Private key (PKCS8 PEM) is required to sign')
      return
    }

    const key = signingKey
    const generation = ++signingGenerationRef.current
    setSignedArtifact({ status: 'pending', key })
    try {
      const { url } = await signRedirectRequest({
        baseUrl: destination,
        samlRequest: redirectBase64,
        relayState: relayState || undefined,
        sigAlg,
        privateKeyPem,
      })
      if (signingGenerationRef.current !== generation) return
      setSignedArtifact({ status: 'ready', key, url })
      toast.success('Redirect URL signed')
    } catch (error) {
      if (signingGenerationRef.current !== generation) return
      if (import.meta.env.DEV) console.error(error)
      setSignedArtifact({ status: 'error', key })
      toast.error('Signing failed', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }, [destination, privateKeyPem, redirectBase64, relayState, sigAlg, signingKey])

  return {
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
    redirectBase64,
    redirectEncodingStatus,
    postEncoded,
    redirectUrl,
    isDestinationValid,
    destinationForForm,
    enableSigning,
    sigAlg,
    privateKeyPem,
    signedRedirectUrl,
    isSigning,
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
    regenerateId,
    copy,
    handleSignRedirect,
  }
}
