import { Link } from 'react-router-dom'
import { PageContainer, PageHeader } from '@/components/page'
import { HomeIcon, Search, FileJson, KeyRound } from 'lucide-react'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'

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
              className="h-full border-none bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-blue-600/30 text-white shadow-lg hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2"
            >
              <Link to="/token-inspector" className="flex h-full w-full items-center gap-4 p-6">
                <ItemMedia variant="icon" className="bg-white/20 text-white">
                  <Search className="h-6 w-6" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-xl text-white">Token Inspector</ItemTitle>
                  <ItemDescription className="text-white/80">
                    Analyze JWT tokens, validate signatures, and inspect claims.
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>

            <Item
              asChild
              interactive
              className="h-full border-none bg-gradient-to-br from-indigo-600/20 via-purple-500/10 to-indigo-600/30 text-white shadow-lg hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2"
            >
              <Link to="/oidc-explorer" className="flex h-full w-full items-center gap-4 p-6">
                <ItemMedia variant="icon" className="bg-white/20 text-white">
                  <FileJson className="h-6 w-6" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-xl text-white">OIDC Explorer</ItemTitle>
                  <ItemDescription className="text-white/80">
                    Explore OpenID Connect discovery documents and JWKS endpoints quickly.
                  </ItemDescription>
                </ItemContent>
              </Link>
            </Item>

            <Item
              asChild
              interactive
              className="h-full border-none bg-gradient-to-br from-emerald-600/20 via-emerald-500/10 to-emerald-600/30 text-white shadow-lg hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2"
            >
              <Link to="/oauth-playground" className="flex h-full w-full items-center gap-4 p-6">
                <ItemMedia variant="icon" className="bg-white/20 text-white">
                  <KeyRound className="h-6 w-6" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-xl text-white">OAuth Playground</ItemTitle>
                  <ItemDescription className="text-white/80">
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
