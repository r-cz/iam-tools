import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  Database,
  FileCog,
  FileJson,
  FilePlus2,
  FileSearch,
  FileText,
  Hammer,
  HomeIcon,
  KeyRound,
  Search,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'

interface ToolDefinition {
  title: string
  description: string
  to: string
  icon: LucideIcon
  testId: string
  tags: string[]
}

interface ToolSection {
  title: string
  description: string
  icon: LucideIcon
  tools: ToolDefinition[]
}

const toolSections: ToolSection[] = [
  {
    title: 'OAuth/OIDC',
    description: 'Inspect tokens, discovery metadata, JWKS, and common OAuth flows.',
    icon: KeyRound,
    tools: [
      {
        title: 'Token Inspector',
        description: 'Decode JWTs, validate signatures, inspect claims, and load saved issuers.',
        to: '/token-inspector',
        icon: Search,
        testId: 'home-card-token-inspector',
        tags: ['JWT', 'JWKS'],
      },
      {
        title: 'OIDC Explorer',
        description: 'Fetch discovery documents, inspect provider metadata, and review keys.',
        to: '/oidc-explorer',
        icon: FileJson,
        testId: 'home-card-oidc-explorer',
        tags: ['Discovery', 'Keys'],
      },
      {
        title: 'OAuth Playground',
        description:
          'Exercise auth code with PKCE, client credentials, introspection, and UserInfo.',
        to: '/oauth-playground',
        icon: KeyRound,
        testId: 'home-card-oauth-playground',
        tags: ['Flows', 'Demo IdP'],
      },
    ],
  },
  {
    title: 'SAML',
    description: 'Decode responses, build AuthnRequests, and work with service-provider metadata.',
    icon: Shield,
    tools: [
      {
        title: 'Response Decoder',
        description: 'Decode SAML responses and inspect assertions, attributes, and status codes.',
        to: '/saml/response-decoder',
        icon: FileSearch,
        testId: 'home-card-saml-response-decoder',
        tags: ['Response', 'Assertions'],
      },
      {
        title: 'AuthnRequest Builder',
        description: 'Craft HTTP-POST and HTTP-Redirect AuthnRequests with optional signing.',
        to: '/saml/request-builder',
        icon: Hammer,
        testId: 'home-card-saml-request-builder',
        tags: ['Request', 'Redirect'],
      },
      {
        title: 'Metadata Validator',
        description: 'Fetch or paste metadata XML, review roles, endpoints, and signatures.',
        to: '/saml/metadata-validator',
        icon: BadgeCheck,
        testId: 'home-card-saml-metadata-validator',
        tags: ['Metadata', 'Signatures'],
      },
      {
        title: 'SP Metadata Generator',
        description: 'Generate SP metadata with ACS/SLO endpoints, NameID formats, and certs.',
        to: '/saml/sp-metadata',
        icon: FileCog,
        testId: 'home-card-saml-sp-metadata',
        tags: ['SP', 'XML'],
      },
    ],
  },
  {
    title: 'LDAP',
    description: 'Parse directory schemas and validate LDIF entries locally in the browser.',
    icon: Database,
    tools: [
      {
        title: 'Schema Explorer',
        description: 'Paste attributeTypes/objectClasses LDIF and save schema snapshots.',
        to: '/ldap/schema-explorer',
        icon: FileText,
        testId: 'home-card-ldap-schema-explorer',
        tags: ['Schema', 'Offline'],
      },
      {
        title: 'LDIF Builder & Viewer',
        description: 'Import or compose LDIF, apply templates, and validate entries.',
        to: '/ldap/ldif-builder',
        icon: FilePlus2,
        testId: 'home-card-ldap-ldif-builder',
        tags: ['LDIF', 'Validation'],
      },
    ],
  },
]

const featuredTools = [toolSections[0].tools[0], toolSections[0].tools[1], toolSections[2].tools[1]]

const totalToolCount = toolSections.reduce((count, section) => count + section.tools.length, 0)

function ToolCard({ tool, exposeTestId = true }: { tool: ToolDefinition; exposeTestId?: boolean }) {
  const Icon = tool.icon

  return (
    <Item asChild interactive className="h-full p-0">
      <Link
        to={tool.to}
        className="flex h-full w-full items-start gap-4 p-4"
        data-testid={exposeTestId ? tool.testId : undefined}
      >
        <ItemMedia variant="icon" className="bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <ItemTitle>{tool.title}</ItemTitle>
            <ItemDescription>{tool.description}</ItemDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </ItemContent>
      </Link>
    </Item>
  )
}

function SectionHeader({ section }: { section: ToolSection }) {
  const Icon = section.icon

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-normal">{section.title}</h2>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>
      <Badge variant="outline" className="w-fit">
        {section.tools.length} tool{section.tools.length === 1 ? '' : 's'}
      </Badge>
    </div>
  )
}

export default function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="IAM Tools"
        description="A focused workbench for Identity and Access Management development, debugging, and protocol inspection."
        icon={HomeIcon}
      />

      <div className="flex flex-col gap-8">
        <section className="grid gap-3 lg:grid-cols-4">
          <Item className="h-full">
            <ItemMedia variant="icon" className="bg-primary text-primary-foreground">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{totalToolCount} local-first tools</ItemTitle>
              <ItemDescription>
                Most workflows run in the browser, with proxy support only where identity endpoints
                need it.
              </ItemDescription>
            </ItemContent>
          </Item>

          <ItemGroup className="grid gap-3 sm:grid-cols-3 lg:col-span-3">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.to} tool={tool} exposeTestId={false} />
            ))}
          </ItemGroup>
        </section>

        {toolSections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <SectionHeader section={section} />
            <ItemGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {section.tools.map((tool) => (
                <ToolCard key={tool.to} tool={tool} />
              ))}
            </ItemGroup>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}

export { HomePage }
