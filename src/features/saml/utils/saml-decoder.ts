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
