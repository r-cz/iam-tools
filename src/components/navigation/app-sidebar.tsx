import * as React from 'react'
import { ChevronRight, Fingerprint } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

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
  useSidebar,
} from '@/components/ui/sidebar'
import { NavSettings } from '@/components/navigation/nav-settings'
import { toolCatalog, type ToolCatalogItem } from '@/config/tool-catalog'

function MenuTreeItem({
  item,
  pathname,
  onNavigate,
}: {
  item: ToolCatalogItem
  pathname: string
  onNavigate: React.MouseEventHandler<HTMLAnchorElement>
}) {
  const label = item.navigationTitle ?? item.title

  if (item.children?.length) {
    return (
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible w-full [&[data-state=open]>button>svg:first-child]:rotate-90"
          defaultOpen
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              data-testid={item.navigationTestId}
              isActive={pathname === item.path || pathname.startsWith(`${item.path}/`)}
            >
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
                    <MenuTreeItem item={child} pathname={pathname} onNavigate={onNavigate} />
                  ) : (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === child.path}>
                        <NavLink
                          end
                          to={child.path}
                          data-testid={child.navigationTestId}
                          onClick={onNavigate}
                        >
                          <child.icon className="mr-2" aria-hidden="true" />
                          <span className="truncate">{child.navigationTitle ?? child.title}</span>
                        </NavLink>
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
      <SidebarMenuButton asChild isActive={pathname === item.path}>
        <NavLink end to={item.path} data-testid={item.navigationTestId} onClick={onNavigate}>
          <item.icon aria-hidden="true" />
          <span className="truncate">{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const handleNavigate: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (
      isMobile &&
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive={pathname === '/'}>
              <NavLink end to="/" data-testid="sidebar-nav-home" onClick={handleNavigate}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Fingerprint aria-hidden="true" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">iam.tools</span>
                  <span className="truncate text-xs">Home</span>
                </div>
              </NavLink>
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
                  <MenuTreeItem
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    onNavigate={handleNavigate}
                  />
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
