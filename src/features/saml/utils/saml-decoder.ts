export interface DecodedSamlResponse {
  raw: string
  xml: string
  responseId: string
  issuer: string
  status: string
  statusMessage?: string
  issueInstant: string
  destination?: string
  inResponseTo?: string
  hasSignature: boolean
  assertions: SamlAssertion[]
}

export interface SamlAssertion {
  id: string
  issuer: string
  issueInstant: string
  subject?: {
    nameId?: string
    nameIdFormat?: string
    confirmations?: {
      method: string
      notOnOrAfter?: string
      recipient?: string
      inResponseTo?: string
    }[]
  }
  conditions?: {
    notBefore?: string
    notOnOrAfter?: string
    audiences?: string[]
  }
  authnStatement?: {
    authnInstant: string
    sessionIndex?: string
    authnContext?: string
  }
  attributes: {
    name: string
    nameFormat?: string
    values: string[]
  }[]
  hasSignature: boolean
}

export type SamlValidationStatus = 'pass' | 'warning' | 'fail'

export interface SamlValidationCheck {
  id: string
  label: string
  status: SamlValidationStatus
  message: string
}

export interface SamlValidationResult {
  overall: SamlValidationStatus
  responseChecks: SamlValidationCheck[]
  assertionChecks: Array<{ id: string; checks: SamlValidationCheck[] }>
}

export function decodeSamlResponse(base64Input: string): DecodedSamlResponse {
  // Remove any whitespace
  const cleanInput = base64Input.replace(/\s/g, '')

  let decodedXml: string
  try {
    // Decode from base64
    decodedXml = atob(cleanInput)
  } catch {
    throw new Error('Invalid base64 encoding')
  }

  // Parse XML
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(decodedXml, 'text/xml')

  // Check for XML parsing errors
  const parserError = xmlDoc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Invalid XML format')
  }

  // Get root element
  const responseElement = xmlDoc.documentElement
  if (
    !responseElement ||
    (responseElement.localName !== 'Response' && !responseElement.nodeName.endsWith(':Response'))
  ) {
    throw new Error('Not a valid SAML Response')
  }

  // Extract response data
  const response: DecodedSamlResponse = {
    raw: cleanInput,
    xml: decodedXml,
    responseId: responseElement.getAttribute('ID') || '',
    issuer: extractIssuer(responseElement),
    status: extractStatus(responseElement),
    issueInstant: responseElement.getAttribute('IssueInstant') || '',
    destination: responseElement.getAttribute('Destination') || undefined,
    inResponseTo: responseElement.getAttribute('InResponseTo') || undefined,
    hasSignature: hasSignature(responseElement),
    assertions: extractAssertions(responseElement),
  }

  // Extract status message if present
  const statusMessage = extractStatusMessage(responseElement)
  if (statusMessage) {
    response.statusMessage = statusMessage
  }

  return response
}

function extractIssuer(element: Element): string {
  const issuerElement = findElement(element, 'Issuer')
  return issuerElement?.textContent?.trim() || ''
}

function extractStatus(element: Element): string {
  const statusCodeElement = findElement(element, 'StatusCode')
  const statusValue = statusCodeElement?.getAttribute('Value') || ''

  // Extract the status type from the URN
  const match = statusValue.match(/:([^:]+)$/)
  return match ? match[1] : statusValue
}

function extractStatusMessage(element: Element): string | undefined {
  const statusMessageElement = findElement(element, 'StatusMessage')
  return statusMessageElement?.textContent?.trim()
}

function hasSignature(element: Element): boolean {
  return !!findElement(element, 'Signature', true)
}

function extractAssertions(responseElement: Element): SamlAssertion[] {
  const assertionElements = findElements(responseElement, 'Assertion')
  return assertionElements.map(extractAssertion)
}

function extractAssertion(assertionElement: Element): SamlAssertion {
  const assertion: SamlAssertion = {
    id: assertionElement.getAttribute('ID') || '',
    issuer: extractIssuer(assertionElement),
    issueInstant: assertionElement.getAttribute('IssueInstant') || '',
    attributes: extractAttributes(assertionElement),
    hasSignature: hasSignature(assertionElement),
  }

  // Extract subject
  const subjectElement = findElement(assertionElement, 'Subject')
  if (subjectElement) {
    assertion.subject = extractSubject(subjectElement)
  }

  // Extract conditions
  const conditionsElement = findElement(assertionElement, 'Conditions')
  if (conditionsElement) {
    assertion.conditions = extractConditions(conditionsElement)
  }

  // Extract authentication statement
  const authnStatementElement = findElement(assertionElement, 'AuthnStatement')
  if (authnStatementElement) {
    assertion.authnStatement = extractAuthnStatement(authnStatementElement)
  }

  return assertion
}

function extractSubject(subjectElement: Element): SamlAssertion['subject'] {
  const subject: SamlAssertion['subject'] = {}

  // Extract NameID
  const nameIdElement = findElement(subjectElement, 'NameID')
  if (nameIdElement) {
    subject.nameId = nameIdElement.textContent?.trim()
    subject.nameIdFormat = nameIdElement.getAttribute('Format') || undefined
  }

  // Extract SubjectConfirmations
  const confirmationElements = findElements(subjectElement, 'SubjectConfirmation')
  if (confirmationElements.length > 0) {
    subject.confirmations = confirmationElements.map((conf) => {
      const confirmation: any = {
        method: conf.getAttribute('Method') || '',
      }

      const dataElement = findElement(conf, 'SubjectConfirmationData')
      if (dataElement) {
        confirmation.notOnOrAfter = dataElement.getAttribute('NotOnOrAfter') || undefined
        confirmation.recipient = dataElement.getAttribute('Recipient') || undefined
        confirmation.inResponseTo = dataElement.getAttribute('InResponseTo') || undefined
      }

      return confirmation
    })
  }

  return subject
}

function extractConditions(conditionsElement: Element): SamlAssertion['conditions'] {
  const conditions: SamlAssertion['conditions'] = {
    notBefore: conditionsElement.getAttribute('NotBefore') || undefined,
    notOnOrAfter: conditionsElement.getAttribute('NotOnOrAfter') || undefined,
  }

  // Extract audiences
  const audienceElements = findElements(conditionsElement, 'Audience')
  if (audienceElements.length > 0) {
    conditions.audiences = audienceElements.map((aud) => aud.textContent?.trim() || '')
  }

  return conditions
}

function extractAuthnStatement(authnStatementElement: Element): SamlAssertion['authnStatement'] {
  const authnStatement: SamlAssertion['authnStatement'] = {
    authnInstant: authnStatementElement.getAttribute('AuthnInstant') || '',
    sessionIndex: authnStatementElement.getAttribute('SessionIndex') || undefined,
  }

  // Extract authentication context
  const authnContextClassRef = findElement(authnStatementElement, 'AuthnContextClassRef')
  if (authnContextClassRef) {
    authnStatement.authnContext = authnContextClassRef.textContent?.trim()
  }

  return authnStatement
}

function extractAttributes(assertionElement: Element): SamlAssertion['attributes'] {
  const attributeStatementElement = findElement(assertionElement, 'AttributeStatement')
  if (!attributeStatementElement) return []

  const attributeElements = findElements(attributeStatementElement, 'Attribute')
  return attributeElements.map((attr) => {
    const valueElements = findElements(attr, 'AttributeValue')
    return {
      name: attr.getAttribute('Name') || '',
      nameFormat: attr.getAttribute('NameFormat') || undefined,
      values: valueElements.map((val) => val.textContent?.trim() || ''),
    }
  })
}

// Helper functions to handle XML namespaces
function findElement(parent: Element, localName: string, directChild = false): Element | null {
  const elements = directChild
    ? Array.from(parent.children)
    : Array.from(parent.getElementsByTagName('*'))

  return (
    elements.find((el) => el.localName === localName || el.nodeName.endsWith(`:${localName}`)) ||
    null
  )
}

function findElements(parent: Element, localName: string): Element[] {
  const allElements = Array.from(parent.getElementsByTagName('*'))
  return allElements.filter(
    (el) => el.localName === localName || el.nodeName.endsWith(`:${localName}`)
  )
}

export function validateSamlResponse(response: DecodedSamlResponse): SamlValidationResult {
  const responseChecks: SamlValidationCheck[] = []
  const assertionChecks: Array<{ id: string; checks: SamlValidationCheck[] }> = []
  const now = Date.now()
  const skewMs = 60 * 1000

  const pushCheck = (
    target: SamlValidationCheck[],
    id: string,
    label: string,
    status: SamlValidationStatus,
    message: string
  ) => {
    target.push({ id, label, status, message })
  }

  pushCheck(
    responseChecks,
    'status',
    'Status',
    response.status === 'Success' ? 'pass' : 'fail',
    response.status === 'Success' ? 'Response status is Success' : `Status is ${response.status}`
  )

  pushCheck(
    responseChecks,
    'destination',
    'Destination',
    response.destination ? 'pass' : 'warning',
    response.destination ? 'Destination is present' : 'Missing Destination in Response'
  )

  pushCheck(
    responseChecks,
    'in-response-to',
    'InResponseTo',
    response.inResponseTo ? 'pass' : 'warning',
    response.inResponseTo
      ? 'InResponseTo is present'
      : 'Missing InResponseTo (unsolicited responses may omit this)'
  )

  response.assertions.forEach((assertion, index) => {
    const checks: SamlValidationCheck[] = []
    const assertionId = assertion.id || `assertion-${index + 1}`

    const audiences = assertion.conditions?.audiences?.filter(Boolean) ?? []
    pushCheck(
      checks,
      'audience',
      'Audience',
      audiences.length > 0 ? 'pass' : 'warning',
      audiences.length > 0
        ? `Audience(s) present (${audiences.length})`
        : 'No AudienceRestriction/Audience found'
    )

    const notBeforeRaw = assertion.conditions?.notBefore
    if (notBeforeRaw) {
      const notBefore = new Date(notBeforeRaw)
      if (Number.isNaN(notBefore.getTime())) {
        pushCheck(checks, 'not-before', 'NotBefore', 'warning', 'NotBefore is not a valid date')
      } else if (now + skewMs < notBefore.getTime()) {
        pushCheck(checks, 'not-before', 'NotBefore', 'fail', 'Assertion is not yet valid')
      } else {
        pushCheck(checks, 'not-before', 'NotBefore', 'pass', 'NotBefore satisfied')
      }
    } else {
      pushCheck(checks, 'not-before', 'NotBefore', 'warning', 'No NotBefore value found')
    }

    const notOnOrAfterRaw = assertion.conditions?.notOnOrAfter
    if (notOnOrAfterRaw) {
      const notOnOrAfter = new Date(notOnOrAfterRaw)
      if (Number.isNaN(notOnOrAfter.getTime())) {
        pushCheck(
          checks,
          'not-on-or-after',
          'NotOnOrAfter',
          'warning',
          'NotOnOrAfter is not a valid date'
        )
      } else if (now - skewMs >= notOnOrAfter.getTime()) {
        pushCheck(checks, 'not-on-or-after', 'NotOnOrAfter', 'fail', 'Assertion has expired')
      } else {
        pushCheck(checks, 'not-on-or-after', 'NotOnOrAfter', 'pass', 'NotOnOrAfter satisfied')
      }
    } else {
      pushCheck(checks, 'not-on-or-after', 'NotOnOrAfter', 'warning', 'No NotOnOrAfter value found')
    }

    const confirmations = assertion.subject?.confirmations ?? []
    if (confirmations.length === 0) {
      pushCheck(
        checks,
        'subject-confirmation',
        'SubjectConfirmation',
        'warning',
        'No SubjectConfirmation data found'
      )
    } else {
      const recipients = confirmations.map((c) => c.recipient).filter(Boolean) as string[]
      if (!response.destination) {
        pushCheck(
          checks,
          'recipient',
          'Recipient',
          'warning',
          'Cannot validate Recipient without Response Destination'
        )
      } else if (recipients.length === 0) {
        pushCheck(
          checks,
          'recipient',
          'Recipient',
          'warning',
          'No Recipient values found in SubjectConfirmationData'
        )
      } else if (recipients.some((r) => r !== response.destination)) {
        pushCheck(
          checks,
          'recipient',
          'Recipient',
          'warning',
          'Recipient does not match Response Destination'
        )
      } else {
        pushCheck(checks, 'recipient', 'Recipient', 'pass', 'Recipient matches Destination')
      }

      const inResponseToValues = confirmations
        .map((c) => c.inResponseTo)
        .filter(Boolean) as string[]
      if (!response.inResponseTo) {
        pushCheck(
          checks,
          'confirmation-in-response-to',
          'InResponseTo',
          'warning',
          'Response InResponseTo missing; unable to compare'
        )
      } else if (inResponseToValues.length === 0) {
        pushCheck(
          checks,
          'confirmation-in-response-to',
          'InResponseTo',
          'warning',
          'No InResponseTo values found in SubjectConfirmationData'
        )
      } else if (inResponseToValues.some((value) => value !== response.inResponseTo)) {
        pushCheck(
          checks,
          'confirmation-in-response-to',
          'InResponseTo',
          'warning',
          'SubjectConfirmation InResponseTo does not match Response'
        )
      } else {
        pushCheck(
          checks,
          'confirmation-in-response-to',
          'InResponseTo',
          'pass',
          'SubjectConfirmation InResponseTo matches Response'
        )
      }

      const confirmationNotOnOrAfter = confirmations
        .map((c) => c.notOnOrAfter)
        .filter(Boolean) as string[]
      if (confirmationNotOnOrAfter.length === 0) {
        pushCheck(
          checks,
          'confirmation-expiry',
          'Confirmation Expiry',
          'warning',
          'No SubjectConfirmationData NotOnOrAfter value found'
        )
      } else {
        const parsed = confirmationNotOnOrAfter.map((value) => new Date(value))
        if (parsed.some((date) => Number.isNaN(date.getTime()))) {
          pushCheck(
            checks,
            'confirmation-expiry',
            'Confirmation Expiry',
            'warning',
            'Invalid NotOnOrAfter value in SubjectConfirmationData'
          )
        } else if (parsed.some((date) => now - skewMs >= date.getTime())) {
          pushCheck(
            checks,
            'confirmation-expiry',
            'Confirmation Expiry',
            'fail',
            'SubjectConfirmationData has expired'
          )
        } else {
          pushCheck(
            checks,
            'confirmation-expiry',
            'Confirmation Expiry',
            'pass',
            'SubjectConfirmationData is within validity window'
          )
        }
      }
    }

    assertionChecks.push({ id: assertionId, checks })
  })

  const allChecks = [...responseChecks, ...assertionChecks.flatMap((entry) => entry.checks)]
  const overall: SamlValidationStatus = allChecks.some((check) => check.status === 'fail')
    ? 'fail'
    : allChecks.some((check) => check.status === 'warning')
      ? 'warning'
      : 'pass'

  return {
    overall,
    responseChecks,
    assertionChecks,
  }
}
