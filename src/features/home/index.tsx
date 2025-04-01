import { Link } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/page';
import { HomeIcon, Search, FileJson, KeyRound } from 'lucide-react';

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
          <div className="grid grid-cols-1 gap-4">
            <Link to="/token-inspector" className="aspect-video rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 flex flex-col items-center justify-center hover:from-blue-500/20 hover:to-blue-600/30 transition-colors p-6">
              <Search className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-medium">Token Inspector</h3>
              <p className="text-muted-foreground text-center mt-2">Analyze JWT tokens, validate signatures, and inspect claims</p>
            </Link>
            
            <Link to="/oidc-explorer" className="aspect-video rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-600/20 flex flex-col items-center justify-center hover:from-purple-500/20 hover:to-indigo-600/30 transition-colors p-6">
              <FileJson className="h-12 w-12 mb-4 text-indigo-600" />
              <h3 className="text-xl font-medium">OIDC Explorer</h3>
              <p className="text-muted-foreground text-center mt-2">Explore OpenID Connect provider configurations and JWKS endpoints</p>
            </Link>
            
            <Link to="/oauth-playground" className="aspect-video rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/20 flex flex-col items-center justify-center hover:from-green-500/20 hover:to-emerald-600/30 transition-colors p-6">
              <KeyRound className="h-12 w-12 mb-4 text-emerald-600" />
              <h3 className="text-xl font-medium">OAuth Playground</h3>
              <p className="text-muted-foreground text-center mt-2">Test and explore OAuth 2.0 flows interactively</p>
            </Link>
          </div>
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Latest Updates</h2>
          <div className="rounded-xl border p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-2">New Feature: OAuth Playground</h3>
            <p className="text-muted-foreground mb-4">
              Interactively explore OAuth 2.0 flows with our new OAuth Playground tool. Walk through authorization code with PKCE flows step by step, test with your own IdP, or use our demo mode.
            </p>
            <Link 
              to="/oauth-playground" 
              className="text-sm text-primary hover:underline"
            >
              Try it now →
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
