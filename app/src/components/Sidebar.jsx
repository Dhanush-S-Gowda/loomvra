import { useState, useEffect } from 'react';
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
  PanelLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sun,
  Moon,
  Heart,
  Loader2,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getAllProjects, deleteProject } from '@/lib/api';
import { toast } from "sonner";

function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = () => {
    getAllProjects(1, 50)
      .then((res) => {
        // res might be an array or { projects: [...] }
        const list = Array.isArray(res) ? res : (res.projects || []);
        setProjects(list);
      })
      .catch(() => {
        // Silently fail — sidebar projects are non-critical
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, [location.pathname]); // re-fetch when navigating

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProject(id);
      toast.success(`Deleted "${name}"`);
      fetchProjects();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="gap-2 p-2">
        <div className="flex items-center gap-2 px-2 justify-between">
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
        <Button className="w-full gap-2 rounded-md border-2 shadow-none">
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
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No projects yet</p>
            ) : (
              <SidebarMenu>
                {projects.map((project) => {
                  const projectId = project.id || project.projectId;
                  const projectName = project.name || project.title || "Untitled";
                  const projectPath = `/dashboard/project/${projectId}`;
                  const isActive = location.pathname === projectPath;

                  return (
                    <SidebarMenuItem key={projectId} className="group/menu-item my-0.5">
                      <SidebarMenuButton
                        asChild
                        tooltip={projectName}
                        isActive={isActive}
                        className="overflow-visible"
                      >
                        <div className="flex items-center justify-between w-full">
                          <Link to={projectPath} className="flex-1 min-w-0">
                            <span className="truncate block">{projectName}</span>
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
                                <span className="sr-only">More options for {projectName}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                              <DropdownMenuItem>
                                <Pencil className="size-4 mr-2" />
                                <span>Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => handleDelete(e, projectId, projectName)}
                              >
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
            )}
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
        <Link to='/dashboard/settings'>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          size="sm"
        >
          <Settings className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Settings</span>
        </Button>
        </Link>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}

export default Sidebar;