import * as React from 'react'
import { ChevronRight, Fingerprint } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { NavSettings } from '@/components/navigation/nav-settings'
import { toolCatalog, type ToolCatalogItem } from '@/config/tool-catalog'

function MenuTreeItem({ item }: { item: ToolCatalogItem }) {
  const label = item.navigationTitle ?? item.title

  if (item.children?.length) {
    return (
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible w-full [&[data-state=open]>button>svg:first-child]:rotate-90"
          defaultOpen
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton data-testid={item.navigationTestId}>
              <ChevronRight className="transition-transform" aria-hidden="true" />
              <item.icon aria-hidden="true" />
              <span className="truncate">{label}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <React.Fragment key={child.id}>
                  {child.children?.length ? (
                    <MenuTreeItem item={child} />
                  ) : (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link to={child.path} data-testid={child.navigationTestId}>
                          <child.icon className="mr-2" aria-hidden="true" />
                          <span className="truncate">{child.navigationTitle ?? child.title}</span>
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

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to={item.path} data-testid={item.navigationTestId}>
          <item.icon aria-hidden="true" />
          <span className="truncate">{label}</span>
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Fingerprint aria-hidden="true" />
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
        {toolCatalog.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.navigationTitle}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.tools.map((item) => (
                  <MenuTreeItem key={item.id} item={item} />
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
