import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { setAdminPreviewPlan } from '@/hooks/useClientProfile';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { SettingsDropdown } from '@/components/layout/SettingsDropdown';
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut,
  Plus,
  Loader2,
  Menu,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Assessment', href: '/assessment/new', icon: Plus },
  { name: 'Assessments', href: '/assessments', icon: FileText },
  { name: 'Prospects', href: '/prospects', icon: Users },
  { name: 'Heirway Admin', href: '/admin/heirway', icon: Shield },
];

function AppSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasClientRecord, setHasClientRecord] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('heirway_clients')
        .select('id, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setHasClientRecord(!!data);
          setAvatarUrl((data as any)?.avatar_url || null);
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
      navigate('/login');
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
      {/* Subtle pattern texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(43 85% 55%) 0.5px, transparent 0.5px)`,
        backgroundSize: '24px 24px'
      }} />
      {/* Accent glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <SidebarHeader className="border-b border-sidebar-border p-3 md:p-4 relative z-10">
        <Link to="/dashboard" className="flex items-center gap-3 justify-center group-data-[state=collapsed]:justify-center">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg flex-shrink-0">
            <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
          </div>
          <div className="overflow-hidden group-data-[state=collapsed]:hidden">
            <h1 className="font-display font-semibold text-sidebar-foreground truncate text-sm md:text-base">Heirway Admin</h1>
            <p className="text-xs text-sidebar-foreground/50">Intelligence Console</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="relative z-10 p-2">
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive}
                  tooltip={item.name}
                  className={isActive 
                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                >
                  <Link to={item.href}>
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 md:p-4 relative z-10">
        {/* Expanded state */}
        <div className="group-data-[state=collapsed]:hidden">
          <div className="flex items-center gap-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/50">Administrator</p>
            </div>
          </div>
          {hasClientRecord && (
            <Button
              onClick={() => navigate('/heirway/dashboard')}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80 mb-1"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Switch to User View
            </Button>
          )}
          {/* Admin Plan Preview Buttons */}
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium mb-1.5 px-1">Preview Client Portal As</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { plan: 'free', label: 'Free' },
                { plan: 'education', label: 'Education' },
                { plan: 'foundation', label: 'Foundation' },
                { plan: 'business', label: 'Business' },
                { plan: 'wealth_builder', label: 'Wealth Builder' },
              ].map(({ plan, label }) => (
                <Button
                  key={plan}
                  onClick={() => {
                    setAdminPreviewPlan(plan);
                    navigate('/heirway/dashboard');
                  }}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-2 text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80 border-sidebar-border/40"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        {/* Collapsed state */}
        <div className="hidden group-data-[state=collapsed]:flex flex-col items-center gap-1">
          {hasClientRecord && (
            <Button
              onClick={() => navigate('/heirway/dashboard')}
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80"
              title="Switch to User View"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have admin access to this application. Please contact your administrator.
          </p>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Mobile header with trigger */}
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-semibold text-foreground">Heirway Admin</span>
              </div>
            </div>
            <SettingsDropdown />
          </header>
          
          {/* Desktop header with collapse trigger and settings */}
          <div className="hidden md:flex items-center justify-between h-14 px-4 border-b border-border bg-background/50">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <SettingsDropdown />
          </div>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
