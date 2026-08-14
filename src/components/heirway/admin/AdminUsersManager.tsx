import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, Eye, Crown, Loader2, User } from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; description: string; details: string[]; color: string; icon: typeof Crown }> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full unrestricted access to the entire platform.',
    details: [
      'Manage all clients, trusts, and requests',
      'Add, remove, and promote admin users',
      'Receive email notifications for all requests',
      'Configure system settings and notifications',
      'Delete client records and cascade data',
    ],
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    icon: Crown,
  },
  admin: {
    label: 'Admin',
    description: 'Full operational access without user management.',
    details: [
      'View and manage all client profiles',
      'Approve or deny administrative requests',
      'Create and edit trusts, assets, and meeting minutes',
      'Manage learning content and notifications',
      'Cannot add or remove admin users',
    ],
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: Shield,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access for oversight purposes.',
    details: [
      'View all client data and trust progress',
      'View requests, notifications, and learning content',
      'Cannot edit, create, or delete any records',
      'Cannot approve or deny requests',
      'Ideal for auditors or observers',
    ],
    color: 'bg-muted text-muted-foreground border-border',
    icon: Eye,
  },
};

export default function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'admin' });
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [clients, setClients] = useState<{ id: string; user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => { loadUsers(); loadClients(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'list' },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Failed to load admin users');
        return;
      }
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('heirway_clients')
      .select('id, user_id, full_name, email')
      .order('full_name');
    setClients((data as any[]) || []);
  };

  const handlePromoteClient = async (clientUserId: string, clientEmail: string) => {
    setPromoting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'set_role', user_id: clientUserId, role: 'admin' },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Failed to promote user');
        return;
      }
      toast.success(`${clientEmail} promoted to Admin`);
      setPromoteOpen(false);
      setPromoteSearch('');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote user');
    } finally {
      setPromoting(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email) { toast.error('Email is required'); return; }
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'add_admin', ...newUser },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Failed to add user');
        return;
      }
      setInviteSent(true);
      if (data.existing_user) {
        toast.success(data.email_sent ? 'Existing user promoted + reset email sent' : 'Existing user promoted to admin');
      } else {
        toast.success('Invitation email sent!');
      }
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'set_role', user_id: userId, role },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Failed to update role');
        return;
      }
      toast.success('Role updated');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleRemoveUser = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'remove_user', user_id: userId },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Failed to remove user');
        return;
      }
      toast.success(`${email} removed`);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove user');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Card key={key} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <ul className="space-y-1 ml-1">
                  {config.details.map((detail, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={() => { setPromoteOpen(true); setPromoteSearch(''); }} size="sm" variant="outline">
          <Shield className="w-4 h-4 mr-1" /> Promote Existing User
        </Button>
        <Button onClick={() => { setAddOpen(true); setInviteSent(false); setNewUser({ email: '', full_name: '', role: 'admin' }); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Admin User
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {users.map((user) => {
          const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.viewer;
          return (
            <Card key={user.id} className="glass-card">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.last_sign_in && (
                      <p className="text-[10px] text-muted-foreground">
                        Last login: {new Date(user.last_sign_in).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={user.role} onValueChange={(val) => handleSetRole(user.user_id, val)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Admin User</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{user.email}</strong> and remove all their access. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveUser(user.user_id, user.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {users.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No admin users found.</p>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Admin User</DialogTitle>
          </DialogHeader>

          {inviteSent ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">An invitation email has been sent to <strong>{newUser.email}</strong>.</p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-xs text-muted-foreground">They will receive a link to set up their password and access the admin console.</p>
              </div>
              <Button onClick={() => setAddOpen(false)} className="w-full">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-name">Full Name</Label>
                <Input id="admin-name" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} placeholder="John Smith" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="admin-email">Email *</Label>
                <Input id="admin-email" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="admin@company.com" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="admin-role">Role</Label>
                <Select value={newUser.role} onValueChange={val => setNewUser(p => ({ ...p, role: val }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full" disabled={adding}>
                {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Admin User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote Existing User Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Promote Existing User to Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search by name or email..."
              value={promoteSearch}
              onChange={e => setPromoteSearch(e.target.value)}
              className="h-9 text-sm"
            />
            <div className="max-h-60 overflow-y-auto border border-border/40 rounded-md divide-y divide-border/40">
              {clients
                .filter(c => {
                  // Exclude users already in admin list
                  const adminUserIds = new Set(users.map(u => u.user_id));
                  if (adminUserIds.has(c.user_id)) return false;
                  const q = promoteSearch.toLowerCase();
                  return !q || (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                })
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-shrink-0 ml-2"
                      disabled={promoting}
                      onClick={() => handlePromoteClient(c.user_id, c.email || c.full_name || 'User')}
                    >
                      {promoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Shield className="w-3 h-3 mr-1" /> Make Admin</>}
                    </Button>
                  </div>
                ))}
              {clients.filter(c => {
                const adminUserIds = new Set(users.map(u => u.user_id));
                if (adminUserIds.has(c.user_id)) return false;
                const q = promoteSearch.toLowerCase();
                return !q || (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
              }).length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">No eligible users found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
