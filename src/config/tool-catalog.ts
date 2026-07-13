import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Clock3,
  Database,
  FileCog,
  FileJson,
  FilePlus2,
  FileSearch,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Hammer,
  KeyRound,
  ListFilter,
  ListPlus,
  Route,
  Search,
  SearchCheck,
  Server,
  Shield,
  UserCheck,
  UserRoundCheck,
  UserRoundSearch,
  UsersRound,
} from 'lucide-react'

export interface ToolCatalogItem {
  id: string
  title: string
  navigationTitle?: string
  routeTitle?: string
  description: string
  path: string
  icon: LucideIcon
  tags: string[]
  homeTestId?: string
  navigationTestId?: string
  showOnHome?: boolean
  children?: ToolCatalogItem[]
}

export interface ToolCatalogSection {
  id: string
  title: string
  navigationTitle: string
  description: string
  icon: LucideIcon
  tools: ToolCatalogItem[]
}

export const toolCatalog: ToolCatalogSection[] = [
  {
    id: 'oauth-oidc',
    title: 'OAuth/OIDC',
    navigationTitle: 'OAuth/OIDC Tools',
    description: 'Inspect tokens, provider metadata, redirects, and common OAuth flows.',
    icon: KeyRound,
    tools: [
      {
        id: 'token-inspector',
        title: 'Token Inspector',
        description: 'Decode JWTs, validate signatures, inspect claims, and load saved issuers.',
        path: '/token-inspector',
        icon: Search,
        tags: ['JWT', 'JWKS'],
        homeTestId: 'home-card-token-inspector',
        navigationTestId: 'sidebar-nav-token-inspector',
      },
      {
        id: 'token-comparison',
        title: 'Token Claims Diff',
        navigationTitle: 'Token Claims Diff',
        routeTitle: 'Token Claims Diff',
        description:
          'Compare two JWTs to isolate claim, scope, role, audience, and lifetime drift.',
        path: '/token-comparison',
        icon: GitCompareArrows,
        tags: ['JWT', 'Diff'],
        homeTestId: 'home-card-token-comparison',
        navigationTestId: 'sidebar-nav-token-comparison',
      },
      {
        id: 'oidc-explorer',
        title: 'OIDC Explorer',
        description: 'Fetch discovery documents, inspect provider metadata, and review keys.',
        path: '/oidc-explorer',
        icon: FileJson,
        tags: ['Discovery', 'Keys'],
        homeTestId: 'home-card-oidc-explorer',
        navigationTestId: 'sidebar-nav-oidc-explorer',
      },
      {
        id: 'redirect-uri-debugger',
        title: 'Redirect URI Debugger',
        description:
          'Compare registered and requested redirects with OAuth and native-app safety checks.',
        path: '/oauth/redirect-uri',
        icon: Route,
        tags: ['OAuth', 'Redirects'],
        homeTestId: 'home-card-redirect-uri-debugger',
        navigationTestId: 'sidebar-nav-redirect-uri-debugger',
      },
      {
        id: 'oauth-playground',
        title: 'OAuth Playground',
        description:
          'Exercise auth code with PKCE, client credentials, introspection, and UserInfo.',
        path: '/oauth-playground',
        icon: FlaskConical,
        tags: ['Flows', 'Demo IdP'],
        homeTestId: 'home-card-oauth-playground',
        navigationTestId: 'sidebar-nav-oauth-playground',
        children: [
          {
            id: 'oauth-auth-code',
            title: 'Authorization Code with PKCE',
            navigationTitle: 'Auth Code',
            routeTitle: 'Auth Code with PKCE',
            description: 'Build and exercise an Authorization Code flow with PKCE.',
            path: '/oauth-playground/auth-code-pkce',
            icon: UserRoundCheck,
            tags: ['OAuth', 'PKCE'],
            navigationTestId: 'sidebar-nav-oauth-auth-code',
            showOnHome: false,
          },
          {
            id: 'oauth-client-credentials',
            title: 'Client Credentials',
            description: 'Exercise a machine-to-machine Client Credentials flow.',
            path: '/oauth-playground/client-credentials',
            icon: Server,
            tags: ['OAuth', 'M2M'],
            navigationTestId: 'sidebar-nav-oauth-client-credentials',
            showOnHome: false,
          },
          {
            id: 'oauth-introspection',
            title: 'Token Introspection',
            navigationTitle: 'Introspection',
            routeTitle: 'Introspection',
            description: 'Inspect active token state through RFC 7662.',
            path: '/oauth-playground/introspection',
            icon: SearchCheck,
            tags: ['OAuth', 'RFC 7662'],
            navigationTestId: 'sidebar-nav-oauth-introspection',
            showOnHome: false,
          },
          {
            id: 'oauth-userinfo',
            title: 'UserInfo Endpoint',
            navigationTitle: 'UserInfo',
            routeTitle: 'UserInfo',
            description: 'Call an OpenID Connect UserInfo endpoint.',
            path: '/oauth-playground/userinfo',
            icon: UserRoundSearch,
            tags: ['OIDC', 'Claims'],
            navigationTestId: 'sidebar-nav-oauth-userinfo',
            showOnHome: false,
          },
        ],
      },
    ],
  },
  {
    id: 'scim',
    title: 'Provisioning / SCIM',
    navigationTitle: 'SCIM Tools',
    description: 'Validate lifecycle resources and build standards-aligned partial updates.',
    icon: UsersRound,
    tools: [
      {
        id: 'scim-resource-validator',
        title: 'SCIM Resource Validator',
        description: 'Validate SCIM User and Group JSON with precise, local-only diagnostics.',
        path: '/scim/resource-validator',
        icon: UserCheck,
        tags: ['SCIM 2.0', 'JSON'],
        homeTestId: 'home-card-scim-resource-validator',
        navigationTestId: 'sidebar-nav-scim-resource-validator',
      },
      {
        id: 'scim-patch-builder',
        title: 'SCIM PATCH Builder',
        description: 'Compose and validate add, remove, and replace PatchOp payloads.',
        path: '/scim/patch-builder',
        icon: ListPlus,
        tags: ['SCIM 2.0', 'PATCH'],
        homeTestId: 'home-card-scim-patch-builder',
        navigationTestId: 'sidebar-nav-scim-patch-builder',
      },
    ],
  },
  {
    id: 'mfa',
    title: 'MFA',
    navigationTitle: 'MFA Tools',
    description: 'Debug time-based one-time passwords without sending secrets anywhere.',
    icon: Clock3,
    tools: [
      {
        id: 'totp-debugger',
        title: 'TOTP Debugger',
        description: 'Parse otpauth URIs, generate test codes, and diagnose clock-window drift.',
        path: '/mfa/totp',
        icon: Clock3,
        tags: ['TOTP', 'Local only'],
        homeTestId: 'home-card-totp-debugger',
        navigationTestId: 'sidebar-nav-totp-debugger',
      },
    ],
  },
  {
    id: 'saml',
    title: 'SAML',
    navigationTitle: 'SAML Tools',
    description: 'Decode responses, build AuthnRequests, and work with service-provider metadata.',
    icon: Shield,
    tools: [
      {
        id: 'saml-response-decoder',
        title: 'Response Decoder',
        routeTitle: 'SAML Response Decoder',
        description: 'Decode SAML responses and inspect assertions, attributes, and status codes.',
        path: '/saml/response-decoder',
        icon: FileSearch,
        tags: ['Response', 'Assertions'],
        homeTestId: 'home-card-saml-response-decoder',
        navigationTestId: 'sidebar-nav-saml-response-decoder',
      },
      {
        id: 'saml-request-builder',
        title: 'AuthnRequest Builder',
        navigationTitle: 'Request Builder',
        routeTitle: 'SAML Request Builder',
        description: 'Craft HTTP-POST and HTTP-Redirect AuthnRequests with optional signing.',
        path: '/saml/request-builder',
        icon: Hammer,
        tags: ['Request', 'Redirect'],
        homeTestId: 'home-card-saml-request-builder',
        navigationTestId: 'sidebar-nav-saml-request-builder',
      },
      {
        id: 'saml-metadata-validator',
        title: 'Metadata Validator',
        routeTitle: 'SAML Metadata Validator',
        description: 'Fetch or paste metadata XML, review roles, endpoints, and signatures.',
        path: '/saml/metadata-validator',
        icon: BadgeCheck,
        tags: ['Metadata', 'Signatures'],
        homeTestId: 'home-card-saml-metadata-validator',
        navigationTestId: 'sidebar-nav-saml-metadata-validator',
      },
      {
        id: 'saml-sp-metadata',
        title: 'SP Metadata Generator',
        navigationTitle: 'SP Metadata',
        description: 'Generate SP metadata with ACS/SLO endpoints, NameID formats, and certs.',
        path: '/saml/sp-metadata',
        icon: FileCog,
        tags: ['SP', 'XML'],
        homeTestId: 'home-card-saml-sp-metadata',
        navigationTestId: 'sidebar-nav-saml-sp-metadata',
      },
    ],
  },
  {
    id: 'ldap',
    title: 'LDAP',
    navigationTitle: 'LDAP Tools',
    description: 'Parse schemas, validate LDIF, and understand LDAP search filters locally.',
    icon: Database,
    tools: [
      {
        id: 'ldap-schema-explorer',
        title: 'Schema Explorer',
        routeTitle: 'LDAP Schema Explorer',
        description: 'Paste attributeTypes/objectClasses LDIF and save schema snapshots.',
        path: '/ldap/schema-explorer',
        icon: FileText,
        tags: ['Schema', 'Offline'],
        homeTestId: 'home-card-ldap-schema-explorer',
        navigationTestId: 'sidebar-nav-ldap-schema-explorer',
      },
      {
        id: 'ldap-ldif-builder',
        title: 'LDIF Builder & Viewer',
        navigationTitle: 'LDIF Builder',
        routeTitle: 'LDIF Builder',
        description: 'Import or compose LDIF, apply templates, and validate entries.',
        path: '/ldap/ldif-builder',
        icon: FilePlus2,
        tags: ['LDIF', 'Validation'],
        homeTestId: 'home-card-ldap-ldif-builder',
        navigationTestId: 'sidebar-nav-ldap-ldif-builder',
      },
      {
        id: 'ldap-filter-studio',
        title: 'LDAP Filter Studio',
        description: 'Parse, format, explain, encode, and safely escape RFC 4515 filters.',
        path: '/ldap/filter-studio',
        icon: ListFilter,
        tags: ['RFC 4515', 'Filters'],
        homeTestId: 'home-card-ldap-filter-studio',
        navigationTestId: 'sidebar-nav-ldap-filter-studio',
      },
    ],
  },
]

function flattenTools(items: ToolCatalogItem[]): ToolCatalogItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenTools(item.children) : [])])
}

export const allTools = toolCatalog.flatMap((section) => flattenTools(section.tools))

export const routeTitles: Record<string, string> = Object.fromEntries(
  allTools.map((tool) => [tool.path, tool.routeTitle ?? tool.title])
)

export const featuredToolIds = [
  'scim-resource-validator',
  'token-comparison',
  'totp-debugger',
] as const

export function getToolById(id: string): ToolCatalogItem | undefined {
  return allTools.find((tool) => tool.id === id)
}
