import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check } from 'lucide-react';

interface EditableClientProfileProps {
  client: any;
  onSave: (updates: Record<string, any>) => Promise<void>;
}

export function EditableClientProfile({ client, onSave }: EditableClientProfileProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: client.full_name || '',
    email: client.email || '',
    phone: client.phone || '',
    state: client.state || '',
    is_married: client.is_married || false,
    has_children: client.has_children || false,
    owns_real_estate: client.owns_real_estate || false,
    over_1m_assets: client.over_1m_assets || false,
    business_ownership: client.business_ownership || 'none',
    employment_type: client.employment_type || 'w2',
  });

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3 mr-1" /> Edit Details
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Full Name', value: client.full_name || 'N/A' },
            { label: 'Email', value: client.email || 'N/A' },
            { label: 'Phone', value: client.phone || 'N/A' },
            { label: 'State', value: client.state },
            { label: 'Married', value: client.is_married ? 'Yes' : 'No' },
            { label: 'Children', value: client.has_children ? 'Yes' : 'No' },
            { label: 'Real Estate', value: client.owns_real_estate ? 'Yes' : 'No' },
            { label: 'Over $1M', value: client.over_1m_assets ? 'Yes' : 'No' },
            { label: 'Business', value: client.business_ownership === 'none' ? 'None' : client.business_ownership },
            { label: 'Employment', value: client.employment_type },
            { label: 'Joined', value: new Date(client.created_at).toLocaleDateString() },
          ].map((item, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-medium text-foreground capitalize">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Full Name</Label>
          <Input className="glass-input mt-1 h-8 text-xs" value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input className="glass-input mt-1 h-8 text-xs" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input className="glass-input mt-1 h-8 text-xs" value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Input className="glass-input mt-1 h-8 text-xs" value={form.state} maxLength={2}
            onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Employment Type</Label>
        <Select value={form.employment_type} onValueChange={val => setForm(p => ({ ...p, employment_type: val }))}>
          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="w2" className="text-xs">W-2 Employee</SelectItem>
            <SelectItem value="1099" className="text-xs">1099 / Self-Employed</SelectItem>
            <SelectItem value="business_owner" className="text-xs">Business Owner</SelectItem>
            <SelectItem value="retired" className="text-xs">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Business Ownership</Label>
        <Select value={form.business_ownership} onValueChange={val => setForm(p => ({ ...p, business_ownership: val }))}>
          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">None</SelectItem>
            <SelectItem value="sole_prop" className="text-xs">Sole Proprietorship</SelectItem>
            <SelectItem value="llc" className="text-xs">LLC</SelectItem>
            <SelectItem value="s_corp" className="text-xs">S-Corp</SelectItem>
            <SelectItem value="c_corp" className="text-xs">C-Corp</SelectItem>
            <SelectItem value="partnership" className="text-xs">Partnership</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'is_married', label: 'Married' },
          { key: 'has_children', label: 'Has Children' },
          { key: 'owns_real_estate', label: 'Owns Real Estate' },
          { key: 'over_1m_assets', label: 'Over $1M Assets' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
            <Label className="text-xs">{item.label}</Label>
            <Switch
              checked={(form as any)[item.key]}
              onCheckedChange={val => setForm(p => ({ ...p, [item.key]: val }))}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} className="flex-1">
          <Check className="w-3 h-3 mr-1" /> Save Changes
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}
