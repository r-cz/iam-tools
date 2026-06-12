import { describe, expect, test } from 'bun:test'

import * as features from '@/features'

describe('feature barrel exports', () => {
  test('exposes all routed feature entry points', () => {
    expect(features.HomePage).toBeFunction()
    expect(features.TokenInspectorPage).toBeFunction()
    expect(features.OidcExplorerPage).toBeFunction()
    expect(features.OAuthPlaygroundPage).toBeFunction()
    expect(features.OAuthCallbackPage).toBeFunction()
    expect(features.DemoAuthPage).toBeFunction()
    expect(features.AuthCodeWithPkcePage).toBeFunction()
    expect(features.ClientCredentialsPage).toBeFunction()
    expect(features.IntrospectionPage).toBeFunction()
    expect(features.UserInfoPage).toBeFunction()
    expect(features.SamlResponseDecoderPage).toBeFunction()
    expect(features.SamlRequestBuilderPage).toBeFunction()
    expect(features.SamlMetadataValidatorPage).toBeFunction()
    expect(features.SpMetadataGeneratorPage).toBeFunction()
    expect(features.LdapSchemaExplorerPage).toBeFunction()
    expect(features.LdifBuilderPage).toBeFunction()
    expect(features.NotFoundPage).toBeFunction()
  })
})
