export const XMLDSIG_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#'
export const SAML_ASSERTION_NAMESPACE = 'urn:oasis:names:tc:SAML:2.0:assertion'
export const SAML_METADATA_NAMESPACE = 'urn:oasis:names:tc:SAML:2.0:metadata'

export function findDirectXmlDsigSignature(owner: Element): Element | null {
  return (
    Array.from(owner.children).find(
      (child) => child.namespaceURI === XMLDSIG_NAMESPACE && child.localName === 'Signature'
    ) ?? null
  )
}

export function findSamlAssertionElements(response: Element): Element[] {
  return Array.from(response.getElementsByTagName('*')).filter(
    (element) =>
      element.namespaceURI === SAML_ASSERTION_NAMESPACE && element.localName === 'Assertion'
  )
}

export function findMetadataEntityDescriptor(document: Document): Element | null {
  const root = document.documentElement
  if (root?.namespaceURI === SAML_METADATA_NAMESPACE && root.localName === 'EntityDescriptor') {
    return root
  }
  return (
    Array.from(document.getElementsByTagName('*')).find(
      (element) =>
        element.namespaceURI === SAML_METADATA_NAMESPACE && element.localName === 'EntityDescriptor'
    ) ?? null
  )
}
