import { ProviderInfo } from '../utils/types'

export const providerInfoData: { [key: string]: ProviderInfo } = {
  Auth0: {
    name: 'Auth0',
    description:
      'Auth0 is a flexible, drop-in solution to add authentication and authorization services to your applications.',
    documentationUrl: 'https://auth0.com/docs/api/authentication',
    specialFeatures: [
      'Custom domains support',
      'Advanced Rules engine for customizing authentication flows',
      'Multi-factor authentication',
      'Social connections',
    ],
  },
  Okta: {
    name: 'Okta',
    description: 'Okta is an enterprise-grade, identity management service, built for the cloud.',
    documentationUrl: 'https://developer.okta.com/docs/reference/',
    specialFeatures: [
      'Advanced group management',
      'Extensive API rate limits',
      'OAuth 2.0 token hooks',
      'Authorization servers for multi-tenant apps',
    ],
  },
  'Microsoft Entra ID (Azure AD)': {
    name: 'Microsoft Entra ID',
    description:
      "Microsoft Entra ID (formerly Azure Active Directory) is Microsoft's cloud-based identity and access management service.",
    documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/',
    specialFeatures: [
      'Microsoft Graph integration',
      'Conditional Access policies',
      'Seamless Microsoft 365 integration',
      'B2B and B2C capabilities',
    ],
  },
  Google: {
    name: 'Google',
    description: "Google's OAuth 2.0 and OpenID Connect implementation for Google Accounts.",
    documentationUrl: 'https://developers.google.com/identity/protocols/oauth2/openid-connect',
    specialFeatures: [
      'Google API integration',
      'One Tap sign-in',
      'Cross-device sign-in',
      'Advanced Security Program',
    ],
  },
  'AWS Cognito': {
    name: 'AWS Cognito',
    description:
      'Amazon Cognito provides authentication, authorization, and user management for web and mobile apps.',
    documentationUrl: 'https://docs.aws.amazon.com/cognito/',
    specialFeatures: [
      'AWS service integration',
      'Federated identities',
      'Customizable UI',
      'Advanced security features',
    ],
  },
  Salesforce: {
    name: 'Salesforce',
    description:
      'Salesforce Identity provides identity management tools for Salesforce customers and partners.',
    documentationUrl: 'https://help.salesforce.com/articleView?id=sf.identity_overview.htm',
    specialFeatures: [
      'Salesforce ecosystem integration',
      'Identity Connect for on-premises integration',
      'Customer Identity',
      'Single sign-on',
    ],
  },
  'Ping Identity': {
    name: 'Ping Identity',
    description:
      'Ping Identity (including PingFederate and PingOne) provides robust identity and access management solutions for secure enterprise authentication and authorization.',
    documentationUrl: 'https://docs.pingidentity.com/',
    specialFeatures: [
      'Session management capabilities',
      'Back-channel and front-channel logout',
      'PingAccess integration',
      'Custom authorization policies',
      'Advanced MFA options',
    ],
  },
  OneLogin: {
    name: 'OneLogin',
    description: 'OneLogin is a cloud-based identity and access management provider.',
    documentationUrl: 'https://developers.onelogin.com/',
    specialFeatures: [
      'SmartFactor Authentication',
      'Vigilance AI',
      'Visual workflow builder',
      'Risk-based authentication',
    ],
  },
  Keycloak: {
    name: 'Keycloak',
    description: 'Keycloak is an open source identity and access management solution.',
    documentationUrl: 'https://www.keycloak.org/documentation',
    specialFeatures: [
      'User Federation',
      'Identity Brokering',
      'Social Login',
      'Admin Console',
      'Open Source',
    ],
  },
  ForgeRock: {
    name: 'ForgeRock',
    description:
      'ForgeRock provides identity and access management solutions for Internet of Things and customer-facing applications.',
    documentationUrl: 'https://backstage.forgerock.com/docs',
    specialFeatures: [
      'Intelligent Authentication',
      'Identity Gateway',
      'Directory Services',
      'Identity Management',
      'ForgeRock AI',
    ],
  },
}
