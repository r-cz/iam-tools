import { describe, expect, test } from 'bun:test'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { SignatureDisplay } from '@/features/saml/components/SignatureDisplay'
import type { DecodedSamlResponse } from '@/features/saml/utils/saml-decoder'
import type { ResponseVerifyResult } from '@/features/saml/utils/signature-verify'

const response: DecodedSamlResponse = {
  raw: 'encoded',
  xml: '<Response/>',
  responseId: 'response-1',
  issuer: 'https://idp.example.com',
  status: 'Success',
  issueInstant: '2026-01-01T00:00:00Z',
  hasSignature: true,
  assertions: [],
}

describe('SignatureDisplay verification ownership', () => {
  test('ignores a verification result after the certificate changes', async () => {
    const pending = deferred<ResponseVerifyResult>()
    const view = render(
      <SignatureDisplay response={response} verifySignatures={() => pending.promise} />
    )
    const certificate = view.getByPlaceholderText(/BEGIN CERTIFICATE/)

    fireEvent.change(certificate, { target: { value: 'certificate-a' } })
    fireEvent.click(view.getByRole('button', { name: 'Verify Signatures' }))
    fireEvent.change(certificate, { target: { value: 'certificate-b' } })
    pending.resolve({ response: { status: 'valid' }, assertions: [] })

    await waitFor(() => expect(view.queryByText('Verification Results')).toBeNull())
    expect(view.getByRole('button', { name: 'Verify Signatures' })).toBeTruthy()
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}
