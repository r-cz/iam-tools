import * as React from "react"
import {
  BookOpen,
  Command,
  LifeBuoy,
  KeyRound,
  Send,
  Settings2,
  GitBranch,
  Fingerprint,
  ShieldCheck,
  Terminal,
  Lock,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
        {
          title: "JWKS Resolver",
          url: "#",
        },
        {
          title: "JWT Validator",
          url: "#",
        },
      ],
    },
    {
      title: "Diagram Tools",
      url: "#",
      icon: GitBranch,
      items: [
        {
          title: "Mermaid Editor",
          url: "/mermaid-editor",
        },
        {
          title: "Sequence Diagrams",
          url: "#",
        },
        {
          title: "Flow Charts",
          url: "#",
        },
      ],
    },
    {
      title: "Development",
      url: "#",
      icon: Terminal,
      items: [
        {
          title: "Code Playground",
          url: "#",
        },
        {
          title: "HTTP Client",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Getting Started",
          url: "#",
        },
        {
          title: "API References",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Preferences",
          url: "#",
        },
        {
          title: "Theme",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Authentication",
      url: "#",
      icon: Lock,
    },
    {
      name: "Identity",
      url: "#",
      icon: Fingerprint,
    },
    {
      name: "Security",
      url: "#",
      icon: ShieldCheck,
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
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
