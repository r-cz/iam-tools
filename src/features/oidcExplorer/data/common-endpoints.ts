import { EndpointDescription } from '../utils/types'

export const endpointDescriptions: { [key: string]: EndpointDescription } = {
  issuer: {
    name: 'Issuer',
    description:
      'The identifier for the OIDC provider. This is a URL that the provider asserts as its identifier.',
    required: true,
    specification: 'OpenID Connect Core 1.0, Section 3.1.2.2',
  },
  authorization_endpoint: {
    name: 'Authorization Endpoint',
    description:
      "The URL of the authorization server's authorization endpoint. Used to authenticate the end-user.",
    required: true,
    specification: 'OpenID Connect Core 1.0, Section 3.1.2.1',
  },
  token_endpoint: {
    name: 'Token Endpoint',
    description:
      "The URL of the authorization server's token endpoint. Used to exchange authorization codes for tokens.",
    required: true,
    specification: 'OpenID Connect Core 1.0, Section 3.1.3.1',
  },
  userinfo_endpoint: {
    name: 'UserInfo Endpoint',
    description:
      "The URL of the authorization server's UserInfo endpoint. Used to obtain claims about the authenticated user.",
    required: false,
    specification: 'OpenID Connect Core 1.0, Section 5.3',
  },
  jwks_uri: {
    name: 'JWKS URI',
    description:
      "The URL of the authorization server's JSON Web Key Set. Contains the public keys used to verify tokens.",
    required: true,
    specification: 'OpenID Connect Core 1.0, Section 10.1.1',
  },
  registration_endpoint: {
    name: 'Registration Endpoint',
    description: "The URL of the authorization server's Dynamic Client Registration endpoint.",
    required: false,
    specification: 'OpenID Connect Dynamic Client Registration 1.0, Section 3',
  },
  scopes_supported: {
    name: 'Scopes Supported',
    description: 'List of OAuth 2.0 scope values that the authorization server supports.',
    required: false,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  response_types_supported: {
    name: 'Response Types Supported',
    description: 'List of OAuth 2.0 response_type values that the authorization server supports.',
    required: true,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  response_modes_supported: {
    name: 'Response Modes Supported',
    description: 'List of OAuth 2.0 response_mode values that the authorization server supports.',
    required: false,
    specification: 'OAuth 2.0 Multiple Response Type Encoding Practices, Section 2.1',
  },
  grant_types_supported: {
    name: 'Grant Types Supported',
    description: 'List of OAuth 2.0 grant_type values that the authorization server supports.',
    required: false,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  token_endpoint_auth_methods_supported: {
    name: 'Token Endpoint Auth Methods',
    description: 'List of client authentication methods supported by the token endpoint.',
    required: false,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  subject_types_supported: {
    name: 'Subject Types Supported',
    description: 'List of subject identifier types that the authorization server supports.',
    required: true,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  id_token_signing_alg_values_supported: {
    name: 'ID Token Signing Algorithms',
    description: 'List of JWS signing algorithms supported for the ID Token.',
    required: true,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  revocation_endpoint: {
    name: 'Revocation Endpoint',
    description:
      "The URL of the authorization server's revocation endpoint. Used to revoke access tokens and refresh tokens.",
    required: false,
    specification: 'OAuth 2.0 Token Revocation, RFC 7009',
  },
  introspection_endpoint: {
    name: 'Introspection Endpoint',
    description:
      "The URL of the authorization server's introspection endpoint. Used to query the state of an access or refresh token.",
    required: false,
    specification: 'OAuth 2.0 Token Introspection, RFC 7662',
  },
  code_challenge_methods_supported: {
    name: 'PKCE Challenge Methods',
    description: 'List of PKCE code challenge methods supported by the authorization server.',
    required: false,
    specification: 'PKCE, RFC 7636',
  },
  claims_supported: {
    name: 'Claims Supported',
    description: 'List of claims that the authorization server MAY be able to supply values for.',
    required: false,
    specification: 'OpenID Connect Discovery 1.0, Section 3',
  },
  request_parameter_supported: {
    name: 'Request Parameter Supported',
    description:
      'Boolean value indicating whether the authorization server supports the use of the request parameter.',
    required: false,
    specification: 'OpenID Connect Core 1.0, Section 6',
  },
  request_uri_parameter_supported: {
    name: 'Request URI Parameter Supported',
    description:
      'Boolean value indicating whether the authorization server supports the use of the request_uri parameter.',
    required: false,
    specification: 'OpenID Connect Core 1.0, Section 6',
  },
}
