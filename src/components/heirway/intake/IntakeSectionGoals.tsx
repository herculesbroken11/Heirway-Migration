import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface GoalsData {
  top_priorities: string[];
  other_priority: string;
  support_preference: string;
  biggest_fear: string;
}

interface Props {
  data: GoalsData;
  onChange: (data: Partial<GoalsData>) => void;
}

const PRIORITY_OPTIONS = [
  'Privacy', 'Asset Protection', 'Tax Reduction', 'Avoid Probate',
  'Generational Wealth', 'Lawsuit Protection', 'Business Exit Strategy',
  'Family Governance', 'Other',
];

export default function IntakeSectionGoals({ data, onChange }: Props) {
  const togglePriority = (val: string) => {
    const current = data.top_priorities;
    if (current.includes(val)) {
      onChange({ top_priorities: current.filter(v => v !== val) });
    } else if (current.length < 3) {
      onChange({ top_priorities: [...current, val] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">What are your top 3 priorities for this estate plan? (Choose 3)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PRIORITY_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-2 text-sm p-2 rounded-lg border transition-colors cursor-pointer ${data.top_priorities.includes(opt) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
              <Checkbox
                checked={data.top_priorities.includes(opt)}
                onCheckedChange={() => togglePriority(opt)}
                disabled={!data.top_priorities.includes(opt) && data.top_priorities.length >= 3}
              />
              {opt}
            </label>
          ))}
        </div>
        {data.top_priorities.includes('Other') && (
          <Input className="glass-input mt-2" placeholder="Describe your other priority" value={data.other_priority} onChange={e => onChange({ other_priority: e.target.value })} />
        )}
        <p className="text-xs text-muted-foreground mt-1">{data.top_priorities.length}/3 selected</p>
      </div>

      <div>
        <Label>What would make you feel most supported in this process?</Label>
        <Textarea className="glass-input mt-1" value={data.support_preference} onChange={e => onChange({ support_preference: e.target.value })} rows={3} />
      </div>

      <div>
        <Label>What is your biggest fear if nothing changes?</Label>
        <Textarea className="glass-input mt-1" value={data.biggest_fear} onChange={e => onChange({ biggest_fear: e.target.value })} rows={3} />
      </div>
    </div>
  );
}
