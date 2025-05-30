import { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/page';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, UserRoundCheck, Server, SearchCheck, UserRoundSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function OAuthPlaygroundPage() {
  const [flows] = useState([
    {
      id: 'auth-code-pkce',
      title: 'Authorization Code with PKCE',
      description: 'The most secure OAuth 2.0 flow for public clients like SPAs and mobile apps.',
      icon: UserRoundCheck,
      url: '/oauth-playground/auth-code-pkce',
      active: true,
    },
    {
      id: 'client-credentials',
      title: 'Client Credentials',
      description: 'OAuth 2.0 flow for server-to-server API access and machine-to-machine communication.',
      icon: Server,
      url: '/oauth-playground/client-credentials',
      active: true,
    },
    {
      id: 'introspection',
      title: 'Introspection',
      description: 'Verify the state and validity of OAuth tokens against an introspection endpoint.',
      icon: SearchCheck,
      url: '/oauth-playground/introspection',
      active: true,
    },
    {
      id: 'userinfo',
      title: 'UserInfo Endpoint',
      description: 'Access user profile information using an access token with proper scopes.',
      icon: UserRoundSearch,
      url: '/oauth-playground/userinfo',
      active: true,
    },
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="OAuth 2.0 Playground"
        description="Test and explore OAuth 2.0 flows interactively. Connect to your own Identity Provider or use demo mode for learning."
        icon={ExternalLink}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flows.map((flow) => (
          <Card key={flow.id} className={flow.active ? '' : 'opacity-60'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{flow.title}</CardTitle>
                <flow.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>{flow.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              {flow.active ? (
                <Button asChild className="w-full">
                  <Link to={flow.url}>Try It</Link>
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  Coming Soon
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

export default OAuthPlaygroundPage;
