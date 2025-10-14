import { Link } from 'react-router-dom'
import { PageContainer, PageHeader } from '@/components/page'
import {
  HomeIcon,
  Search,
  FileJson,
  KeyRound,
  Shield,
  FileSearch,
  Hammer,
  BadgeCheck,
  FileCog,
  Database,
  FileText,
  FilePlus2,
} from 'lucide-react'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia } from '@/components/ui/item'

export default function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Welcome to IAM Tools"
        description="A collection of specialized tools for Identity and Access Management (IAM) development and debugging."
        icon={HomeIcon}
      />

      <div className="space-y-10">
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <KeyRound className="h-6 w-6" />
            OAuth/OIDC Tools
          </h2>
          <ItemGroup className="grid grid-cols-1 gap-4">
            <Item
              asChild
              interactive
              className="h-full border border-blue-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-blue-600/20 dark:via-blue-500/10 dark:to-blue-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
            >
              <Link to="/token-inspector" className="flex h-full w-full items-center gap-4 p-6">
                <ItemMedia
                  variant="icon"
                  className="bg-blue-500/10 text-blue-600 dark:bg-white/20 dark:text-white"
                >
                  <Search className="h-6 w-6" />
                </ItemMedia>
                <ItemContent>
                  <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                    Token Inspector
                  </h3>
                  <ItemDescription className="text-muted-foreground dark:text-white/80">
                    Analyze JWT tokens, validate signatures, and inspect claims.
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>

            <Item
              asChild
              interactive
              className="h-full border border-indigo-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-indigo-600/20 dark:via-purple-500/10 dark:to-indigo-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
            >
              <Link to="/oidc-explorer" className="flex h-full w-full items-center gap-4 p-6">
                <ItemMedia
                  variant="icon"
                  className="bg-indigo-500/10 text-indigo-600 dark:bg-white/20 dark:text-white"
                >
                  <FileJson className="h-6 w-6" />
                </ItemMedia>
                <ItemContent>
                  <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                    OIDC Explorer
                  </h3>
                  <ItemDescription className="text-muted-foreground dark:text-white/80">
                    Explore OpenID Connect discovery documents and JWKS endpoints quickly.
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>

            <Item
              asChild
              interactive
              className="h-full border border-emerald-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-emerald-600/20 dark:via-emerald-500/10 dark:to-emerald-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
            >
              <Link to="/oauth-playground" className="flex h-full w-full items-center gap-4 p-6">
                <ItemMedia
                  variant="icon"
                  className="bg-emerald-500/10 text-emerald-600 dark:bg-white/20 dark:text-white"
                >
                  <KeyRound className="h-6 w-6" />
                </ItemMedia>
                <ItemContent>
                  <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                    OAuth Playground
                  </h3>
                  <ItemDescription className="text-muted-foreground dark:text-white/80">
                    Test and explore OAuth 2.0 flows with step-by-step guidance.
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>
          </ItemGroup>
        </section>

        <section className="grid auto-rows-min gap-6 md:grid-cols-2">
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              SAML Tools
            </h2>
            <ItemGroup className="grid grid-cols-1 gap-4">
              <Item
                asChild
                interactive
                className="h-full border border-purple-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-purple-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-purple-600/20 dark:via-purple-500/10 dark:to-purple-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
              >
                <Link
                  to="/saml/response-decoder"
                  className="flex h-full w-full items-center gap-4 p-6"
                >
                  <ItemMedia
                    variant="icon"
                    className="bg-purple-500/10 text-purple-600 dark:bg-white/20 dark:text-white"
                  >
                    <FileSearch className="h-6 w-6" />
                  </ItemMedia>
                  <ItemContent>
                    <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                      Response Decoder
                    </h3>
                    <ItemDescription className="text-muted-foreground dark:text-white/80">
                      Decode and inspect SAML Responses, assertions, and attributes quickly.
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>

              <Item
                asChild
                interactive
                className="h-full border border-amber-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-amber-600/20 dark:via-amber-500/10 dark:to-amber-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
              >
                <Link
                  to="/saml/request-builder"
                  className="flex h-full w-full items-center gap-4 p-6"
                >
                  <ItemMedia
                    variant="icon"
                    className="bg-amber-500/10 text-amber-600 dark:bg-white/20 dark:text-white"
                  >
                    <Hammer className="h-6 w-6" />
                  </ItemMedia>
                  <ItemContent>
                    <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                      AuthnRequest Builder
                    </h3>
                    <ItemDescription className="text-muted-foreground dark:text-white/80">
                      Craft HTTP-POST and HTTP-Redirect AuthnRequests with optional redirect
                      signing.
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>

              <Item
                asChild
                interactive
                className="h-full border border-emerald-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-emerald-600/20 dark:via-emerald-500/10 dark:to-emerald-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
              >
                <Link
                  to="/saml/metadata-validator"
                  className="flex h-full w-full items-center gap-4 p-6"
                >
                  <ItemMedia
                    variant="icon"
                    className="bg-emerald-500/10 text-emerald-600 dark:bg-white/20 dark:text-white"
                  >
                    <BadgeCheck className="h-6 w-6" />
                  </ItemMedia>
                  <ItemContent>
                    <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                      Metadata Validator
                    </h3>
                    <ItemDescription className="text-muted-foreground dark:text-white/80">
                      Fetch or paste metadata XML, view roles and endpoints, and verify signatures.
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>

              <Item
                asChild
                interactive
                className="h-full border border-sky-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-sky-600/20 dark:via-sky-500/10 dark:to-sky-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
              >
                <Link to="/saml/sp-metadata" className="flex h-full w-full items-center gap-4 p-6">
                  <ItemMedia
                    variant="icon"
                    className="bg-sky-500/10 text-sky-600 dark:bg-white/20 dark:text-white"
                  >
                    <FileCog className="h-6 w-6" />
                  </ItemMedia>
                  <ItemContent>
                    <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                      SP Metadata Generator
                    </h3>
                    <ItemDescription className="text-muted-foreground dark:text-white/80">
                      Generate SP metadata with ACS/SLO endpoints, NameID formats, and certs.
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            </ItemGroup>
          </div>

          <div className="space-y-8">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Database className="h-6 w-6" />
              LDAP Tools
            </h2>
            <ItemGroup className="grid grid-cols-1 gap-4">
              <Item
                asChild
                interactive
                className="h-full border border-teal-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-teal-600/20 dark:via-teal-500/10 dark:to-teal-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
              >
                <Link
                  to="/ldap/schema-explorer"
                  className="flex h-full w-full items-center gap-4 p-6"
                >
                  <ItemMedia
                    variant="icon"
                    className="bg-teal-500/10 text-teal-600 dark:bg-white/20 dark:text-white"
                  >
                    <FileText className="h-6 w-6" />
                  </ItemMedia>
                  <ItemContent>
                    <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                      Schema Explorer
                    </h3>
                    <ItemDescription className="text-muted-foreground dark:text-white/80">
                      Paste attributeTypes/objectClasses LDIF to visualize schema structures
                      offline.
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>

              <Item
                asChild
                interactive
                className="h-full border border-rose-100 bg-white text-slate-900 shadow-sm transition-colors hover:bg-rose-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-transparent dark:bg-gradient-to-br dark:from-rose-600/20 dark:via-rose-500/10 dark:to-rose-600/30 dark:text-white dark:shadow-lg dark:hover:bg-transparent dark:focus-visible:ring-white/60"
              >
                <Link to="/ldap/ldif-builder" className="flex h-full w-full items-center gap-4 p-6">
                  <ItemMedia
                    variant="icon"
                    className="bg-rose-500/10 text-rose-600 dark:bg-white/20 dark:text-white"
                  >
                    <FilePlus2 className="h-6 w-6" />
                  </ItemMedia>
                  <ItemContent>
                    <h3 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                      LDIF Builder &amp; Viewer
                    </h3>
                    <ItemDescription className="text-muted-foreground dark:text-white/80">
                      Import or compose LDIF, apply templates, and validate against saved schema
                      snapshots.
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            </ItemGroup>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
