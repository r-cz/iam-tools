import * as React from "react"
import {
  LifeBuoy,
  KeyRound,
  Send,
  Fingerprint,
} from "lucide-react"

import { NavMain } from "@/components/navigation/nav-main"
import { NavSecondary } from "@/components/navigation/nav-secondary"
import { NavUser } from "@/components/navigation/nav-user"
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
  user: {
    name: "Ryan Cruz",
    email: "tools@ryancruz.com",
    avatar: "/avatars/ryan.jpg",
  },
  navMain: [
    {
      title: "Token Tools",
      url: "#",
      icon: KeyRound,
      items: [
        {
          title: "Token Inspector",
          url: "/token-inspector",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
      items: [
        {
          title: "GitHub Issues",
          url: "https://github.com/r-cz/iam-tools/issues/new",
        }
      ]
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
      items: [
        {
          title: "Email",
          url: "mailto:mail@ryancruz.com",
        }
      ]
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Fingerprint className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">iam.tools</span>
                  <span className="truncate text-xs">Home</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
