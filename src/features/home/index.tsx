import { Link } from 'react-router-dom'
import { PageContainer, PageHeader } from '@/components/page'
import { HomeIcon, Search, FileJson, KeyRound } from 'lucide-react'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia } from '@/components/ui/item'

export default function HomePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Welcome to IAM Tools"
        description="A collection of specialized tools for Identity and Access Management (IAM) development and debugging."
        icon={HomeIcon}
      />

      <div className="grid auto-rows-min gap-6 md:grid-cols-2 mb-6">
        <div className="space-y-4">
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
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Latest Updates</h2>
          <div className="rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-2">New Feature: OAuth Playground</h3>
            <p className="text-muted-foreground mb-4">
              Interactively explore OAuth 2.0 flows with our new OAuth Playground tool. Walk through
              authorization code with PKCE flows step by step, test with your own IdP, or use our
              demo mode.
            </p>
            <Link to="/oauth-playground" className="text-sm text-primary hover:underline">
              Try it now →
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
