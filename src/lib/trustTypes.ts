export const TRUST_TYPES = [
  { value: 'beneficiary', label: 'Beneficiary Trust', color: '#DC2626', bgClass: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'operations', label: 'Operations Trust', color: '#1E3A5F', bgClass: 'bg-blue-900/10 text-blue-900 border-blue-900/20', hasBankAccount: true },
  { value: 'bridge', label: 'Bridge Trust', color: '#800020', bgClass: 'bg-rose-900/10 text-rose-900 border-rose-900/20' },
  { value: 'reserve', label: 'Reserve Trust', color: '#16A34A', bgClass: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'asset_holding', label: 'Asset Holding Trust', color: '#CA8A04', bgClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'revocable', label: 'Revocable Trust', color: '#EA580C', bgClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'investing', label: 'Investing Trust', color: '#7C3AED', bgClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20', hasBankAccount: true },
] as const;

export type TrustTypeValue = typeof TRUST_TYPES[number]['value'];

export const getTrustType = (value: string) => TRUST_TYPES.find(t => t.value === value);
export const getTrustLabel = (value: string) => getTrustType(value)?.label || value;
export const getTrustColor = (value: string) => getTrustType(value)?.color || '#888';
export const getTrustBgClass = (value: string) => getTrustType(value)?.bgClass || 'bg-muted text-muted-foreground border-border';
export const trustHasBankAccount = (value: string) => {
  const t = getTrustType(value);
  return !!(t && 'hasBankAccount' in t && t.hasBankAccount);
};
