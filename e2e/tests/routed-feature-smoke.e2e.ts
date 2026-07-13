import { expect, test } from '@playwright/test'

const routedPages = [
  {
    path: '/token-comparison',
    heading: 'Token Claims Diff',
  },
  {
    path: '/oauth/redirect-uri',
    heading: 'Redirect URI Debugger',
  },
  {
    path: '/oauth-playground/client-credentials',
    heading: 'OAuth Client Credentials Flow',
  },
  {
    path: '/oauth-playground/introspection',
    heading: 'Introspection',
  },
  {
    path: '/oauth-playground/userinfo',
    heading: 'OAuth UserInfo Endpoint',
  },
  {
    path: '/saml/response-decoder',
    heading: 'SAML Response Decoder',
  },
  {
    path: '/saml/request-builder',
    heading: 'SAML AuthnRequest Builder',
  },
  {
    path: '/saml/metadata-validator',
    heading: 'SAML Metadata Validator',
  },
  {
    path: '/saml/sp-metadata',
    heading: 'SP Metadata Generator',
  },
  {
    path: '/ldap/schema-explorer',
    heading: 'LDAP Schema Explorer',
  },
  {
    path: '/ldap/ldif-builder',
    heading: 'LDIF Builder & Viewer',
  },
  {
    path: '/ldap/filter-studio',
    heading: 'LDAP Filter Studio',
  },
  {
    path: '/scim/resource-validator',
    heading: 'SCIM Resource Validator',
  },
  {
    path: '/scim/patch-builder',
    heading: 'SCIM PATCH Builder',
  },
  {
    path: '/mfa/totp',
    heading: 'TOTP Debugger',
  },
  {
    path: '/not-a-real-tool',
    heading: 'Page Not Found',
  },
] as const

test.describe('Routed feature smoke', () => {
  for (const route of routedPages) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path)

      await expect(page).toHaveURL(route.path)
      await expect(page.getByText(route.heading, { exact: true }).first()).toBeVisible()
    })
  }
})
