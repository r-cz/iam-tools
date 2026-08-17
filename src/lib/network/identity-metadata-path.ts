/** Classifies identity metadata paths without making transport or network-safety decisions. */
export function isIdentityMetadataPath(pathname: string): boolean {
  const upper = pathname.toUpperCase()
  const lower = pathname.toLowerCase()

  const isWellKnown = pathname.includes('/.well-known/')
  const isJwks =
    upper.includes('/JWKS') ||
    upper.includes('/JWK') ||
    pathname.includes('/keys') ||
    pathname.includes('/oauth2/v1/certs') ||
    (pathname.endsWith('.json') && upper.includes('JWK'))
  const isSamlMetadata =
    lower.endsWith('/federationmetadata/2007-06/federationmetadata.xml') ||
    lower.includes('/saml/metadata') ||
    (lower.endsWith('.xml') && (lower.includes('saml') || lower.includes('metadata')))

  return isWellKnown || isJwks || isSamlMetadata
}
