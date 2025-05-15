import * as React from "react"
import {
  Fingerprint,
  KeyRound,
  Search,
  SearchCheck,
  FileJson,
  ArrowRight,
  ChevronRight,
  FlaskConical
} from "lucide-react"
import { Link } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
} from "@/components/ui/sidebar"
import { NavSettings } from "@/components/navigation/nav-settings"

// Define tree structure for our menu
const menuTree = [
  {
    title: "OAuth/OIDC Tools",
    icon: KeyRound,
    items: [
      {
        title: "Token Inspector",
        url: "/token-inspector",
        icon: Search
      },
      {
        title: "OIDC Explorer",
        url: "/oidc-explorer",
        icon: FileJson
      },
      {
        title: "OAuth Playground",
        url: "/oauth-playground",
        icon: FlaskConical,
        items: [
          {
            title: "Auth Code",
            url: "/oauth-playground/auth-code-pkce",
            icon: ArrowRight
          },
          {
            title: "Client Credentials",
            url: "/oauth-playground/client-credentials",
            icon: KeyRound
          },
          {
            title: "Token Introspection",
            url: "/oauth-playground/introspection",
            icon: SearchCheck
          }
          // More flows will be added here later
        ]
      }
    ]
  }
];

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
            <SidebarMenuButton>
              <ChevronRight className="transition-transform" />
              <item.icon />
              <span className="truncate">{item.title}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((subItem: any, index: number) => (
                <React.Fragment key={index}>
                  {subItem.items && subItem.items.length ? (
                    <MenuTreeItem item={subItem} />
                  ) : (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link to={subItem.url}>
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
    );
  }

  // If it's a leaf node without subitems
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to={item.url}>
          <item.icon />
          <span className="truncate">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
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
        {menuTree.map((section, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item, itemIndex) => (
                  <MenuTreeItem key={itemIndex} item={item} />
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