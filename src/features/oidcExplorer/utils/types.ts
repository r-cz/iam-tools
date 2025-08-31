export interface OidcConfiguration {
  issuer: string
  authorization_endpoint?: string
  token_endpoint?: string
  userinfo_endpoint?: string
  jwks_uri?: string
  registration_endpoint?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  response_modes_supported?: string[]
  grant_types_supported?: string[]
  token_endpoint_auth_methods_supported?: string[]
  token_endpoint_auth_signing_alg_values_supported?: string[]
  service_documentation?: string
  ui_locales_supported?: string[]
  op_policy_uri?: string
  op_tos_uri?: string
  revocation_endpoint?: string
  revocation_endpoint_auth_methods_supported?: string[]
  revocation_endpoint_auth_signing_alg_values_supported?: string[]
  introspection_endpoint?: string
  introspection_endpoint_auth_methods_supported?: string[]
  introspection_endpoint_auth_signing_alg_values_supported?: string[]
  code_challenge_methods_supported?: string[]
  subject_types_supported?: string[]
  id_token_signing_alg_values_supported?: string[]
  id_token_encryption_alg_values_supported?: string[]
  id_token_encryption_enc_values_supported?: string[]
  userinfo_signing_alg_values_supported?: string[]
  userinfo_encryption_alg_values_supported?: string[]
  userinfo_encryption_enc_values_supported?: string[]
  request_object_signing_alg_values_supported?: string[]
  request_object_encryption_alg_values_supported?: string[]
  request_object_encryption_enc_values_supported?: string[]
  claims_supported?: string[]
  claims_parameter_supported?: boolean
  request_parameter_supported?: boolean
  request_uri_parameter_supported?: boolean
  require_request_uri_registration?: boolean
  [key: string]: any // Allow any additional fields
}

export interface JwksKey {
  kty: string
  kid: string
  use?: string
  alg?: string
  n?: string
  e?: string
  x5c?: string[]
  x5t?: string
  [key: string]: any // Allow any additional fields
}

export interface Jwks {
  keys: JwksKey[]
}

export interface EndpointDescription {
  name: string
  description: string
  required: boolean
  url?: string
  specification?: string
}

export interface ProviderInfo {
  name: string
  logo?: string
  description: string
  documentationUrl: string
  specialFeatures?: string[]
}
