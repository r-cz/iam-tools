"use client"

import {
  ChevronsUpDown,
  Github,
  Mail,
  ExternalLink,
  Settings,
  Sun,
  Moon,
  Monitor,
  Trash,
  Save
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTheme } from "@/components/theme";
import { useSettings, useTokenHistory, useIssuerHistory } from "@/lib/state";
import { oidcConfigCache } from "@/lib/cache/oidc-config-cache";
import { toast } from "sonner";

export function NavSettings() {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { clearTokens } = useTokenHistory();
  const { clearIssuers } = useIssuerHistory();

  const handleClearAllHistory = () => {
    clearTokens();
    clearIssuers();
    oidcConfigCache.clear();
    toast.success("All data cleared", {
      description: "Token history, issuer history, and cache have been cleared."
    });
  };

  const handleMaxHistoryChange = (value: string) => {
    const maxItems = parseInt(value, 10);
    updateSettings({ maxHistoryItems: maxItems });
    toast.success("Settings updated", {
      description: `Maximum history items set to ${maxItems}.`
    });
  };

  const handleResetSettings = () => {
    resetSettings();
    toast.success("Settings reset", {
      description: "All settings have been reset to default values."
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Settings className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Settings</span>
                <span className="truncate text-xs">& Help</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Theme Settings */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                {theme === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
                  <DropdownMenuRadioItem value="light" className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark" className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            {/* Storage Settings */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                <span>History Size</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup 
                  value={settings.maxHistoryItems.toString()} 
                  onValueChange={handleMaxHistoryChange}
                >
                  <DropdownMenuRadioItem value="5">5 items</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="10">10 items</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="20">20 items</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="50">50 items</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            {/* Clear Data */}
            <DropdownMenuItem 
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onClick={handleClearAllHistory}
            >
              <Trash className="h-4 w-4" />
              <span>Clear All Data</span>
            </DropdownMenuItem>
            
            {/* Reset Settings */}
            <DropdownMenuItem 
              className="flex items-center gap-2"
              onClick={handleResetSettings}
            >
              <Settings className="h-4 w-4" />
              <span>Reset Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel>Help</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a 
                  href="https://github.com/r-cz/iam-tools/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  <span>GitHub Issues</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a 
                  href="mailto:mail@ryancruz.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}