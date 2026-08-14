import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useClientProfile, getAdminPreviewPlan, setAdminPreviewPlan } from '@/hooks/useClientProfile';
import { useMyMemberships } from '@/hooks/useTrustMembers';
import { NotificationBell } from '@/components/heirway/dashboard/NotificationBell';
import ReferralDialog from '@/components/heirway/ReferralDialog';
import OnboardingTips from '@/components/heirway/OnboardingTips';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset } from
'@/components/ui/sidebar';
import {
  LayoutDashboard, BookOpen, FileText, Building2, LogOut, Loader2, Menu, User, Lock, Settings, Shield, Users, ArrowLeftRight, X, RefreshCw, Gift, Search, HelpCircle, Vault, Mail } from
'lucide-react';
import { toast } from 'sonner';
import { useUpgradeRoute } from '@/hooks/useUpgradeRoute';

interface HeirwayLayoutProps {
  children: ReactNode;
}

function HeirwaySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tier, user, client, clientId, loading: profileLoading } = useClientProfile();
  const goToUpgrade = useUpgradeRoute();
  const { memberships } = useMyMemberships();
  const hasMemberships = memberships.length > 0;
  const [isAdmin, setIsAdmin] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    supabase.rpc('get_current_user_role').then(({ data }) => {
      setIsAdmin(data === 'admin' || data === 'super_admin');
    });
  }, []);

  // Auto-show tips on first login
  useEffect(() => {
    if (user && !profileLoading) {
      const tipsKey = `heirway_tips_shown_${user.id}`;
      if (!localStorage.getItem(tipsKey)) {
        localStorage.setItem(tipsKey, 'true');
        setTipsOpen(true);
      }
    }
  }, [user, profileLoading]);

  const effectiveTier = profileLoading ? null : tier;

  const navigation = [
  { name: 'Dashboard', href: '/heirway/dashboard', icon: LayoutDashboard, tiers: ['free', 'education', 'trust'] },
  { name: 'Messages', href: '/heirway/messages', icon: Mail, tiers: ['free', 'education', 'trust'] },
  { name: 'Learning', href: '/heirway/learning', icon: BookOpen, tiers: ['free', 'education', 'trust'] },
  { name: 'Knowledge Base', href: '/heirway/knowledgebase', icon: Search, tiers: ['free', 'education', 'trust'] },
  { name: 'Documents', href: '/heirway/documents', icon: FileText, tiers: ['free', 'education', 'trust'] },
  { name: 'Successor Vault', href: '/heirway/successor-vault', icon: Vault, tiers: ['free', 'education', 'trust'] },
  { name: 'Trust Vault', href: '/heirway/trust-map', icon: Building2, tiers: ['free', 'education', 'trust'], lockedBelow: 'trust' as const },
  { name: 'Family Governance', href: '/heirway/family-governance', icon: Users, tiers: ['free', 'education', 'trust'], lockedBelow: 'trust' as const },
  ...(hasMemberships ? [{ name: 'My Trusts', href: '/heirway/member-portal', icon: Shield, tiers: ['free', 'education', 'trust'] }] : []),
  ].filter((item) => !effectiveTier || item.tiers.includes(effectiveTier));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out');
    navigate('/heirway');
  };

  // Avatar URL from client record
  const avatarUrl = client?.avatar_url;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

      <SidebarHeader className="border-b border-sidebar-border p-3 md:p-4 relative z-10">
        <Link to="/heirway/dashboard" className="flex flex-col items-center group-data-[state=collapsed]:items-center">
          <img src={heirwayLogo} alt="Heirway" className="h-20 md:h-28 w-auto flex-shrink-0 group-data-[state=collapsed]:hidden" />
          <img alt="Heirway" className="h-12 w-auto object-contain flex-shrink-0 hidden group-data-[state=collapsed]:block my-1" src="/lovable-uploads/6a08243c-0736-431c-a3c4-0ffdc33ec2c1.png" />
          <p className="text-xs text-sidebar-foreground/50 group-data-[state=collapsed]:hidden mt-1">Estate Portal</p>
        </Link>
      </SidebarHeader>

      <SidebarContent className="relative z-10 p-2">
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const tierOrder = ['free', 'education', 'trust'];
            const userTierIdx = tierOrder.indexOf(effectiveTier || 'free');
            const requiredTierIdx = item.lockedBelow ? tierOrder.indexOf(item.lockedBelow) : 0;
            const isLocked = effectiveTier !== null && item.lockedBelow && userTierIdx < requiredTierIdx;
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild={!isLocked}
                  isActive={isActive}
                  tooltip={isLocked ? `${item.name} (Foundation+ plan required)` : item.name}
                  className={isLocked ?
                  'opacity-50 cursor-not-allowed text-sidebar-foreground/40' :
                  isActive ?
                  'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20' :
                  'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                  onClick={isLocked ? (e: any) => e.preventDefault() : undefined}>
                  
                  {isLocked ?
                  <div className="flex items-center gap-2 w-full">
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto h-5 px-1.5 text-[10px] border-primary/30 text-primary hover:bg-primary/10 group-data-[state=collapsed]:hidden"
                        onClick={(e) => { e.stopPropagation(); goToUpgrade(); }}
                      >
                        Upgrade
                      </Button>
                      <Lock className="w-3 h-3 hidden group-data-[state=collapsed]:block" />
                    </div> :

                  <Link to={item.href}>
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                      <span>{item.name}</span>
                    </Link>
                  }
                </SidebarMenuButton>
              </SidebarMenuItem>);

          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 md:p-4 relative z-10">
        {/* Expanded state */}
        <div className="group-data-[state=collapsed]:hidden">
          {/* Profile section — clickable to open referral */}
          <button
            onClick={() => setReferralOpen(true)}
            className="flex items-center gap-3 mb-3 w-full text-left rounded-lg p-1.5 -m-1.5 hover:bg-sidebar-accent transition-colors"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{effectiveTier === 'trust' ? 'Trust Client' : effectiveTier === 'education' ? 'Education' : effectiveTier ? 'Free' : ''}</p>
            </div>
          </button>

          {/* Refer Someone */}
          <Button
            onClick={() => setReferralOpen(true)}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80 mb-1"
          >
            <Gift className="w-4 h-4 mr-2" />
            Refer Someone
          </Button>

          <Button onClick={() => setTipsOpen(true)} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80 mb-1">
            <HelpCircle className="w-4 h-4 mr-2" />
            App Guide
          </Button>
          <Button onClick={() => navigate('/heirway/settings')} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80 mb-1">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          {isAdmin && (
            <Button onClick={() => navigate('/admin/heirway')} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80 mb-1">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Switch to Admin View
            </Button>
          )}
          <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        {/* Collapsed state */}
        <div className="hidden group-data-[state=collapsed]:flex flex-col items-center gap-1">
          {avatarUrl ? (
            <button onClick={() => setReferralOpen(true)} className="rounded-full overflow-hidden w-8 h-8 hover:ring-2 ring-primary transition-all">
              <img src={avatarUrl} alt="Profile" className="w-8 h-8 object-cover" />
            </button>
          ) : (
            <Button onClick={() => setReferralOpen(true)} variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80" title="Refer Someone">
              <User className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => setReferralOpen(true)} variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80" title="Refer Someone">
            <Gift className="w-4 h-4" />
          </Button>
           <Button onClick={() => setTipsOpen(true)} variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80" title="App Guide">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigate('/heirway/settings')} variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80" title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <Button onClick={() => navigate('/admin/heirway')} variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80" title="Switch to Admin View">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleSignOut} variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-primary-foreground hover:bg-primary/80" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>

      {/* Referral Dialog */}
      {user && clientId && (
        <ReferralDialog open={referralOpen} onOpenChange={setReferralOpen} userId={user.id} clientId={clientId} />
      )}
      {/* Onboarding Tips */}
      <OnboardingTips open={tipsOpen} onOpenChange={setTipsOpen} />
    </Sidebar>);
}

function LayoutNotificationBell() {
  const { user, clientId, client } = useClientProfile();
  if (!user || !clientId) return null;
  return <NotificationBell userId={user.id} clientId={clientId} clientPlan={client?.selected_plan || null} />;
}

export function HeirwayLayout({ children }: HeirwayLayoutProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) navigate('/login');
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);
  }

  if (!user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
        <HeirwaySidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur px-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <img src={heirwayLogo} alt="Heirway" className="h-16 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <LayoutNotificationBell />
              <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <div className="hidden md:flex items-center h-14 px-4 border-b border-border bg-background/50">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </div>
          {getAdminPreviewPlan() && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                👁 Admin Preview — Viewing as <span className="font-bold capitalize">{getAdminPreviewPlan()?.replace('_', ' ')}</span> user
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                onClick={() => {
                  setAdminPreviewPlan(null);
                  navigate('/admin/heirway');
                }}
              >
                <X className="w-3 h-3 mr-1" /> Exit Preview
              </Button>
            </div>
          )}
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>);
}
