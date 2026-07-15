import { Link, useLocation } from 'react-router';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Settings,
  FolderOpen,
  PanelLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sun,
  Moon,
  Heart,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const DUMMY_PROJECTS = [
  { id: 'proj-1', name: 'Q4 Marketing Deck' },
  { id: 'proj-2', name: 'Product Roadmap' },
  { id: 'proj-3', name: 'Investor Pitch' },
  { id: 'proj-4', name: 'Team Onboarding' },
  { id: 'proj-5', name: 'Yearly Review lore wifw wfb wfbwfiwfbfba' },
];

function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="gap-2 p-3">
        <div className="flex items-center gap-2 justify-between">
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            NextGen PPT
          </span>
          <SidebarTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <PanelLeft className="size-4" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </SidebarTrigger>
        </div>
        <Link to="/dashboard/">
        <Button className="w-full gap-2 rounded-lg shadow-none" size="sm">
          <Plus className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">New Project</span>
        </Button>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DUMMY_PROJECTS.map((project) => {
                const projectPath = `/dashboard/project/${project.id}`;
                const isActive = location.pathname === projectPath;

                return (
                  <SidebarMenuItem key={project.id} className="group/menu-item">
                    <SidebarMenuButton
                      asChild
                      tooltip={project.name}
                      isActive={isActive}
                      className="overflow-visible"
                    >
                      <div className="flex items-center justify-between w-full">
                        <Link to={projectPath} className="flex-1 min-w-0">
                          <span className="truncate block">{project.name}</span>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover/menu-item:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">More options for {project.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem>
                              <Pencil className="size-4 mr-2" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive">
                              <Trash2 className="size-4 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-3">
        <Separator className="bg-sidebar-border" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          size="sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="size-4 shrink-0" />
          ) : (
            <Moon className="size-4 shrink-0" />
          )}
          <span className="group-data-[collapsible=icon]:hidden">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          size="sm"
        >
          <Heart className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Like this project?</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          size="sm"
        >
          <Settings className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Settings</span>
        </Button>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}

export default Sidebar;
