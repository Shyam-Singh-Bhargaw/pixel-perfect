import { CalendarDays, CheckSquare, Brain, Briefcase, Users, BarChart3, BookOpen, Calendar, Bot, Code, StickyNote } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useStreak } from '@/hooks/useStreak';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const items = [
  { title: 'Today', url: '/', icon: CalendarDays },
  { title: 'Calendar', url: '/calendar', icon: Calendar },
  { title: 'Revision Queue', url: '/revision', icon: Brain },
  { title: 'Study Plan', url: '/study-plan', icon: BookOpen },
  { title: 'Coding Practice', url: '/coding', icon: Code },
  { title: 'Study Notes', url: '/notes', icon: StickyNote },
  { title: 'Job Tracker', url: '/jobs', icon: Briefcase },
  { title: 'Network Log', url: '/network', icon: Users },
  { title: 'AI Coach', url: '/ai-coach', icon: Bot },
  { title: 'Progress', url: '/progress', icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { streak } = useStreak();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-heading font-bold text-primary">PrepOS</h1>
            <p className="text-xs text-muted-foreground">AI/ML Track</p>
          </div>
        )}
        {collapsed && <span className="text-primary font-heading font-bold text-lg">P</span>}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end className="hover:bg-secondary" activeClassName="bg-secondary text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && (
          <>
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
              <span className="text-lg">🔥</span>
              <span className="font-mono text-sm font-semibold text-foreground">{streak} day streak</span>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={signOut}>
              Sign Out
            </Button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
