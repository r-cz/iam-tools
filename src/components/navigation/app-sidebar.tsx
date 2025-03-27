import * as React from "react"
import {
  Fingerprint,
  KeyRound,
  Search,
  FileJson,
} from "lucide-react"
import { Link } from 'react-router-dom'; // <-- Import Link

import { NavMain } from "@/components/navigation/nav-main"
import { NavHelp } from "@/components/navigation/nav-help"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "OAuth/OIDC Tools",
      url: "#", // This top-level item isn't a link, just a collapsible trigger
      icon: KeyRound,
      items: [
        {
          title: "Token Inspector",
          url: "/token-inspector", // Internal route path
          icon: Search,
        },
        {
          title: "OIDC Explorer",
          url: "/oidc-explorer", // Internal route path
          icon: FileJson,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Use asChild with Link */}
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavHelp />
      </SidebarFooter>
    </Sidebar>
  )
}