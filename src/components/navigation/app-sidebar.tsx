import * as React from 'react'
import {
  Fingerprint,
  KeyRound,
  Search,
  SearchCheck,
  FileJson,
  ChevronRight,
  FlaskConical,
  UserRoundSearch,
  Server,
  UserRoundCheck,
  Shield,
  FileSearch,
  Hammer,
  BadgeCheck,
  FileCog,
  Database,
  FileText,
  FilePlus2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { NavSettings } from '@/components/navigation/nav-settings'

// Define tree structure for our menu
const menuTree = [
  {
    title: 'OAuth/OIDC Tools',
    icon: KeyRound,
    items: [
      {
        title: 'Token Inspector',
        url: '/token-inspector',
        icon: Search,
      },
      {
        title: 'OIDC Explorer',
        url: '/oidc-explorer',
        icon: FileJson,
      },
      {
        title: 'OAuth Playground',
        url: '/oauth-playground',
        icon: FlaskConical,
        items: [
          {
            title: 'Auth Code',
            url: '/oauth-playground/auth-code-pkce',
            icon: UserRoundCheck,
          },
          {
            title: 'Client Credentials',
            url: '/oauth-playground/client-credentials',
            icon: Server,
          },
          {
            title: 'Introspection',
            url: '/oauth-playground/introspection',
            icon: SearchCheck,
          },
          {
            title: 'UserInfo',
            url: '/oauth-playground/userinfo',
            icon: UserRoundSearch,
          },
          // More flows will be added here later
        ],
      },
    ],
  },
  {
    title: 'SAML Tools',
    icon: Shield,
    items: [
      {
        title: 'Response Decoder',
        url: '/saml/response-decoder',
        icon: FileSearch,
      },
      {
        title: 'Request Builder',
        url: '/saml/request-builder',
        icon: Hammer,
      },
      {
        title: 'Metadata Validator',
        url: '/saml/metadata-validator',
        icon: BadgeCheck,
      },
      {
        title: 'SP Metadata',
        url: '/saml/sp-metadata',
        icon: FileCog,
      },
    ],
  },
  {
    title: 'LDAP Tools',
    icon: Database,
    items: [
      {
        title: 'Schema Explorer',
        url: '/ldap/schema-explorer',
        icon: FileText,
      },
      {
        title: 'LDIF Builder',
        url: '/ldap/ldif-builder',
        icon: FilePlus2,
      },
    ],
  },
]

function getSidebarItemTestId(url?: string): string | undefined {
  const mapping: Record<string, string> = {
    '/': 'sidebar-nav-home',
    '/token-inspector': 'sidebar-nav-token-inspector',
    '/oidc-explorer': 'sidebar-nav-oidc-explorer',
    '/oauth-playground': 'sidebar-nav-oauth-playground-root',
    '/oauth-playground/auth-code-pkce': 'sidebar-nav-oauth-auth-code',
    '/oauth-playground/client-credentials': 'sidebar-nav-oauth-client-credentials',
    '/oauth-playground/introspection': 'sidebar-nav-oauth-introspection',
    '/oauth-playground/userinfo': 'sidebar-nav-oauth-userinfo',
    '/saml/response-decoder': 'sidebar-nav-saml-response-decoder',
    '/saml/request-builder': 'sidebar-nav-saml-request-builder',
    '/saml/metadata-validator': 'sidebar-nav-saml-metadata-validator',
    '/saml/sp-metadata': 'sidebar-nav-saml-sp-metadata',
    '/ldap/schema-explorer': 'sidebar-nav-ldap-schema-explorer',
    '/ldap/ldif-builder': 'sidebar-nav-ldap-ldif-builder',
  }

  if (!url) return undefined
  return mapping[url]
}

// Recursive component to render menu items
function MenuTreeItem({ item }: { item: any }) {
  // If it has subitems, render as collapsible
  if (item.items && item.items.length) {
    return (
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible w-full [&[data-state=open]>button>svg:first-child]:rotate-90"
          defaultOpen={true}
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              data-testid={
                item.url === '/oauth-playground' ? 'sidebar-nav-oauth-playground' : undefined
              }
            >
              <ChevronRight className="transition-transform" />
              <item.icon />
              <span className="truncate">{item.title}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((subItem: any) => (
                <React.Fragment key={subItem.url ?? subItem.title}>
                  {subItem.items && subItem.items.length ? (
                    <MenuTreeItem item={subItem} />
                  ) : (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link to={subItem.url} data-testid={getSidebarItemTestId(subItem.url)}>
                          {subItem.icon && <subItem.icon className="mr-2 size-4" />}
                          <span className="truncate">{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </React.Fragment>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    )
  }

  // If it's a leaf node without subitems
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to={item.url} data-testid={getSidebarItemTestId(item.url)}>
          <item.icon />
          <span className="truncate">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" data-testid="sidebar-nav-home">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Fingerprint className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">iam.tools</span>
                  <span className="truncate text-xs">Home</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {menuTree.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <MenuTreeItem key={item.url ?? item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavSettings />
      </SidebarFooter>
    </Sidebar>
  )
}
