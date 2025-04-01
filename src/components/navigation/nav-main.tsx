"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// Define recursive types for nested menu items
interface SubMenuItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: SubMenuItem[];
}

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: SubMenuItem[];
}

interface NavMainProps {
  items: MenuItem[];
}

// Recursive submenu component
function SubMenu({ items }: { items: SubMenuItem[] }) {
  return (
    <SidebarMenuSub>
      {items.map((subItem) => (
        <SidebarMenuSubItem key={subItem.title}>
          {subItem.items && subItem.items.length > 0 ? (
            // If it has children, render as a collapsible
            <Collapsible
              asChild
              className="group/subcollapsible w-full"
            >
              <>
                <CollapsibleTrigger asChild>
                  <SidebarMenuSubButton className="w-full">
                    {subItem.icon && <subItem.icon className="mr-2 size-4 flex-shrink-0" />}
                    <span className="truncate">{subItem.title}</span>
                    <ChevronRight className="ml-auto flex-shrink-0 transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
                  </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-4">
                    <SubMenu items={subItem.items} />
                  </div>
                </CollapsibleContent>
              </>
            </Collapsible>
          ) : (
            // If no children, render as a link
            <SidebarMenuSubButton asChild>
              <Link to={subItem.url} className="flex items-center w-full">
                {subItem.icon && <subItem.icon className="mr-2 size-4 flex-shrink-0" />}
                <span className="truncate">{subItem.title}</span>
              </Link>
            </SidebarMenuSubButton>
          )}
        </SidebarMenuSubItem>
      ))}
    </SidebarMenuSub>
  );
}

export function NavMain({ items }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tools</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  <item.icon className="flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                  <ChevronRight className="ml-auto flex-shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {item.items && <SubMenu items={item.items} />}
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}