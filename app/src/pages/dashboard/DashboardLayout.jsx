import { Outlet } from "react-router";
import Sidebar from '@/components/Sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

function DashboardLayout() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardLayout;
