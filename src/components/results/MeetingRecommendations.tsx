import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  type MeetingRecommendation,
  type AssetRecommendation,
} from '@/lib/scoring';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowRight,
  Layers,
  Target,
  Banknote,
  Route,
} from 'lucide-react';

interface MeetingRecommendationsProps {
  recommendation: MeetingRecommendation;
  assets: AssetRecommendation[];
}

export function MeetingRecommendations({ recommendation, assets }: MeetingRecommendationsProps) {
  const { flags, totalMeetings, meetingPath, meetings, structureTier, emphasis, pricingModel, implementationPath } = recommendation;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="glass-panel overflow-hidden animate-fade-in">
        <div className="h-1.5 bg-gradient-to-r from-primary via-warning to-primary" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Route className="w-5 h-5 text-primary" />
            </div>
            Meeting Path Overview
          </CardTitle>
          <CardDescription>Recommended engagement flow based on diagnostic scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl glass-option">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Total Meetings</span>
              </div>
              <span className="text-2xl font-bold text-primary">{totalMeetings}</span>
              <p className="text-xs text-muted-foreground mt-1">{meetingPath}</p>
            </div>
            
            <div className="p-4 rounded-xl glass-option">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Structure Tier</span>
              </div>
              <span className="text-lg font-bold text-foreground">{structureTier}</span>
            </div>
            
            <div className="p-4 rounded-xl glass-option">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-success" />
                <span className="text-sm font-medium">Pricing Model</span>
              </div>
              <span className="text-sm font-semibold text-success">{pricingModel}</span>
            </div>
            
            <div className="p-4 rounded-xl glass-option">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Implementation</span>
              </div>
              <span className="text-lg font-bold text-warning">{implementationPath}</span>
            </div>
          </div>

          {/* Diagnostic Flags */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Internal Flags
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={flags.authorityGate ? "destructive" : "secondary"}
                className="rounded-lg"
              >
                AUTHORITY_GATE: {flags.authorityGate ? 'YES' : 'NO'}
              </Badge>
              <Badge 
                variant={flags.highFear ? "destructive" : "secondary"}
                className="rounded-lg"
              >
                HIGH_FEAR: {flags.highFear ? 'YES' : 'NO'}
              </Badge>
              <Badge 
                variant={flags.irreversibilitySensitive ? "destructive" : "secondary"}
                className="rounded-lg"
              >
                IRREVERSIBILITY_SENSITIVE: {flags.irreversibilitySensitive ? 'YES' : 'NO'}
              </Badge>
              <Badge 
                variant={flags.complexBuild ? "destructive" : "secondary"}
                className="rounded-lg"
              >
                COMPLEX_BUILD: {flags.complexBuild ? 'YES' : 'NO'}
              </Badge>
            </div>
          </div>

          {/* Emphasis Points */}
          {emphasis.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Meeting Emphasis Based on Scores</h4>
              <ul className="space-y-2">
                {emphasis.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Flow */}
      <Card className="glass-panel overflow-hidden animate-fade-in">
        <div className="h-1.5 bg-gradient-to-r from-info via-primary to-info" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-info/10 border border-info/20">
              <Calendar className="w-5 h-5 text-info" />
            </div>
            Recommended Meeting Sequence
          </CardTitle>
          <CardDescription>Step-by-step engagement plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meetings.map((meeting, index) => (
            <div key={meeting.id} className="relative">
              {index < meetings.length - 1 && (
                <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border" />
              )}
              <div className="p-4 rounded-xl glass-option">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{meeting.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {meeting.duration}
                        {meeting.whoAttends && (
                          <>
                            <span className="mx-1">•</span>
                            <Users className="w-3 h-3" />
                            {meeting.whoAttends}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {meeting.gateCondition && (
                    <Badge variant="outline" className="rounded-lg text-xs border-warning text-warning">
                      {meeting.gateCondition}
                    </Badge>
                  )}
                </div>

                <div className="ml-15 space-y-3">
                  {/* Purpose */}
                  <div>
                    <span className="text-xs font-semibold text-success uppercase tracking-wide">Purpose</span>
                    <ul className="mt-1 space-y-1">
                      {meeting.purpose.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-3 h-3 mt-1 text-success flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Do NOT */}
                  {meeting.doNot && meeting.doNot.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Do NOT</span>
                      <ul className="mt-1 space-y-1">
                        {meeting.doNot.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-destructive/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Assets */}
                  {meeting.assets.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-info uppercase tracking-wide">Assets to Use</span>
                      <ul className="mt-1 space-y-1">
                        {meeting.assets.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <FileText className="w-3 h-3 mt-1 text-info flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Asset Recommendations */}
      <Card className="glass-panel overflow-hidden animate-fade-in">
        <div className="h-1.5 bg-gradient-to-r from-success via-primary to-success" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-success/10 border border-success/20">
              <FileText className="w-5 h-5 text-success" />
            </div>
            Asset Recommendations
          </CardTitle>
          <CardDescription>Materials mapped to meetings and psychological purpose</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Asset</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">First Allowed</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Purpose</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold hidden lg:table-cell">Psychological Job</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold hidden md:table-cell">Condition</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium text-sm">{asset.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="rounded-lg text-xs">
                        {asset.firstAllowedMeeting}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {asset.purpose}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden lg:table-cell italic">
                      {asset.psychologicalJob}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {asset.condition ? (
                        <Badge variant="secondary" className="rounded-lg text-xs">
                          {asset.condition}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Always</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Non-Negotiable Rule */}
      <Card className="glass-panel overflow-hidden animate-fade-in border-warning/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h4 className="font-bold text-warning mb-2">One Internal Rule (Non-Negotiable)</h4>
              <p className="text-sm text-muted-foreground">
                Never present final trust architecture until fear and authority are neutralized.
                If an asset increases excitement before safety, it's the wrong asset.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}