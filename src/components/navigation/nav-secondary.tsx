import * as React from "react"
import { type LucideIcon, ChevronRight, Github, Mail, ExternalLink } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    items?: {
      title: string
      url: string
    }[]
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { isMobile } = useSidebar();
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.items ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="sm">
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "start" : "start"}
                    className="w-48"
                  >
                    {item.items.map((subItem) => (
                      <DropdownMenuItem key={subItem.title} asChild>
                        <a 
                          href={subItem.url} 
                          target={subItem.url.startsWith('http') || subItem.url.startsWith('mailto') ? "_blank" : undefined} 
                          rel={subItem.url.startsWith('http') ? "noopener noreferrer" : undefined}
                          className="flex items-center gap-2"
                        >
                          {/* GitHub icon for GitHub Issues */}
                          {subItem.url.includes('github') && <Github className="h-4 w-4" />}
                          {/* Mail icon for Email */}
                          {subItem.url.includes('mailto') && <Mail className="h-4 w-4" />}
                          <span>{subItem.title}</span>
                          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <SidebarMenuButton asChild size="sm">
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
