
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { ThemeToggle } from '@/components/theme';
import { ThemeMeta } from '@/components/theme';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';

export function Layout() {
  const location = useLocation();
  
  // Generate page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home';
    return path.substring(1).split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Generate breadcrumb items based on route
  const getBreadcrumbItems = () => {
    const path = location.pathname;
    if (path === '/') {
      return (
        <BreadcrumbItem>
          <BreadcrumbPage>Home</BreadcrumbPage>
        </BreadcrumbItem>
      );
    }
    
    return (
      <>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  };

  return (
    <SidebarProvider>
      <ThemeMeta />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full justify-between">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {getBreadcrumbItems()}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
