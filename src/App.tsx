import './App.css'
import { AppSidebar } from './components/app-sidebar'
import { ThemeToggle } from './components/theme-toggle'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar'
import { Separator } from './components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './components/ui/breadcrumb'

function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full justify-between">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">IAM Tools</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
              <h3 className="text-xl font-medium">Token Inspector</h3>
            </div>
            <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
              <h3 className="text-xl font-medium">Mermaid Editor</h3>
            </div>
            <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
              <h3 className="text-xl font-medium">JWKS Tool</h3>
            </div>
          </div>
          <div className="min-h-[50vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome to IAM Tools</h2>
            <p className="mb-4">A collection of useful tools for identity and access management.</p>
            <p>Select a tool from the sidebar or one of the cards above to get started.</p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
