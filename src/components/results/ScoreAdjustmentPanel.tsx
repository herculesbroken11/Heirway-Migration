import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UNIVERSAL_QUESTIONS, 
  getProfileQuestions, 
  RED_FLAG_ITEMS,
  type OrientationCheckItem,
  type IndexKey,
} from '@/lib/orientationQuestions';
import { INDEX_METADATA, type ComputedScores, classifyProfile, type AssessmentResponses } from '@/lib/scoring';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Save,
  ChevronRight,
  MessageSquare,
  Flag,
  Users,
} from 'lucide-react';

interface ScoreAdjustmentPanelProps {
  originalScores: ComputedScores;
  primaryProfile: string | null;
  secondaryProfile: string | null;
  assessmentResponses: AssessmentResponses;
  onSaveAdjustments?: (adjustedScores: ComputedScores, newPrimaryProfile: string, newSecondaryProfile: string | null) => void;
}

export function ScoreAdjustmentPanel({ 
  originalScores, 
  primaryProfile,
  secondaryProfile,
  assessmentResponses,
  onSaveAdjustments,
}: ScoreAdjustmentPanelProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [adjustedScores, setAdjustedScores] = useState<ComputedScores>(originalScores);

  const calculateAdjustedScores = useCallback((checked: Set<string>) => {
    const adjustments: Partial<Record<IndexKey, number>> = {
      scs: 0, lai: 0, isi: 0, adi: 0, aeti: 0, csi: 0, pfi: 0,
    };

    // Gather all check items from all questions
    const allCheckItems: OrientationCheckItem[] = [
      ...UNIVERSAL_QUESTIONS.flatMap(q => q.checkItems),
      ...getProfileQuestions(primaryProfile || '').flatMap(q => q.checkItems),
      ...getProfileQuestions(secondaryProfile || '').flatMap(q => q.checkItems),
      ...RED_FLAG_ITEMS,
    ];

    // Sum adjustments for checked items
    allCheckItems.forEach(item => {
      if (checked.has(item.id)) {
        Object.entries(item.scoreAdjustments).forEach(([key, value]) => {
          adjustments[key as IndexKey] = (adjustments[key as IndexKey] || 0) + value;
        });
      }
    });

    // Apply adjustments to original scores (clamped to valid ranges)
    const newScores: ComputedScores = {
      scs: Math.max(0, Math.min(INDEX_METADATA.scs.maxScore, originalScores.scs + (adjustments.scs || 0))),
      lai: Math.max(0, Math.min(INDEX_METADATA.lai.maxScore, originalScores.lai + (adjustments.lai || 0))),
      isi: Math.max(0, Math.min(INDEX_METADATA.isi.maxScore, originalScores.isi + (adjustments.isi || 0))),
      adi: Math.max(0, Math.min(INDEX_METADATA.adi.maxScore, originalScores.adi + (adjustments.adi || 0))),
      aeti: Math.max(0, Math.min(INDEX_METADATA.aeti.maxScore, originalScores.aeti + (adjustments.aeti || 0))),
      csi: Math.max(0, Math.min(INDEX_METADATA.csi.maxScore, originalScores.csi + (adjustments.csi || 0))),
      pfi: Math.max(0, Math.min(INDEX_METADATA.pfi.maxScore, originalScores.pfi + (adjustments.pfi || 0))),
    };

    return newScores;
  }, [originalScores, primaryProfile, secondaryProfile]);

  const handleCheckItem = (itemId: string, checked: boolean) => {
    const newCheckedItems = new Set(checkedItems);
    if (checked) {
      newCheckedItems.add(itemId);
    } else {
      newCheckedItems.delete(itemId);
    }
    setCheckedItems(newCheckedItems);
    setAdjustedScores(calculateAdjustedScores(newCheckedItems));
  };

  const handleReset = () => {
    setCheckedItems(new Set());
    setAdjustedScores(originalScores);
  };

  const handleSave = () => {
    const newClassification = classifyProfile(adjustedScores, assessmentResponses);
    onSaveAdjustments?.(adjustedScores, newClassification.primary, newClassification.secondary);
  };

  const getScoreDelta = (key: keyof ComputedScores) => {
    return adjustedScores[key] - originalScores[key];
  };

  const renderDelta = (delta: number) => {
    if (delta === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (delta > 0) return <span className="flex items-center text-success"><TrendingUp className="w-4 h-4 mr-1" />+{delta}</span>;
    return <span className="flex items-center text-destructive"><TrendingDown className="w-4 h-4 mr-1" />{delta}</span>;
  };

  const renderCheckItems = (items: OrientationCheckItem[]) => (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
          <Checkbox 
            id={item.id}
            checked={checkedItems.has(item.id)}
            onCheckedChange={(checked) => handleCheckItem(item.id, checked === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <label htmlFor={item.id} className="text-sm font-medium cursor-pointer">
              {item.label}
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(item.scoreAdjustments).map(([key, value]) => (
                <Badge 
                  key={key} 
                  variant="outline" 
                  className="text-xs border-border/60 text-muted-foreground"
                >
                  {INDEX_METADATA[key as IndexKey].abbrev}: {value > 0 ? `+${value}` : value}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const universalQuestions = UNIVERSAL_QUESTIONS;
  const profileQuestions = [
    ...getProfileQuestions(primaryProfile || ''),
    ...getProfileQuestions(secondaryProfile || ''),
  ];
  
  // Deduplicate profile questions (in case primary === secondary)
  const uniqueProfileQuestions = profileQuestions.filter(
    (q, i, arr) => arr.findIndex(x => x.id === q.id) === i
  );

  // Calculate new profiles based on adjusted scores
  const newClassification = classifyProfile(adjustedScores, assessmentResponses);
  const profileChanged = newClassification.primary !== primaryProfile || newClassification.secondary !== secondaryProfile;

  return (
    <Card className="glass-panel overflow-hidden animate-fade-in">
      <div className="h-1.5 bg-gradient-to-r from-warning via-primary to-warning" />
      <CardHeader className="px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-warning/10 border border-warning/20">
                <MessageSquare className="w-5 h-5 text-warning" />
              </div>
              <span className="text-base md:text-lg">Orientation Calibration</span>
            </CardTitle>
            <CardDescription className="mt-1 text-xs md:text-sm">Adjust diagnostic indices based on Meeting 1 observations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />Reset
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-xl flex-1 sm:flex-none" disabled={!onSaveAdjustments}>
              <Save className="w-4 h-4 mr-2" />Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-4 md:px-6">
        {/* Score Summary Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {(Object.keys(originalScores) as Array<keyof ComputedScores>).map((key) => {
            const meta = INDEX_METADATA[key];
            const delta = getScoreDelta(key);
            return (
              <div 
                key={key} 
                className={`p-3 rounded-xl text-center transition-all ${
                  delta !== 0 ? 'ring-2 ring-border bg-muted/50' : 'bg-muted/30'
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground mb-1">{meta.abbrev}</div>
                <div className="text-lg font-bold text-foreground">
                  {adjustedScores[key]}
                  <span className="text-xs text-muted-foreground">/{meta.maxScore}</span>
                </div>
                <div className="text-xs mt-1">{renderDelta(delta)}</div>
              </div>
            );
          })}
        </div>

        {/* Profile Change Alert */}
        {profileChanged && (
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Profile Classification Change Detected</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="text-muted-foreground">{primaryProfile || 'None'}</span>
                <ChevronRight className="w-4 h-4" />
                <Badge variant="default" className="rounded-lg">{newClassification.primary}</Badge>
              </div>
              {(secondaryProfile || newClassification.secondary) && (
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-muted-foreground text-xs">Secondary:</span>
                  <span className="text-muted-foreground">{secondaryProfile || 'None'}</span>
                  <ChevronRight className="w-4 h-4" />
                  <Badge variant="secondary" className="rounded-lg">{newClassification.secondary || 'None'}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Tabs */}
        <Tabs defaultValue="universal" className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-xl h-auto p-1">
            <TabsTrigger value="universal" className="rounded-lg gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Users className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Universal</span><span className="sm:hidden">Uni</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg gap-1 md:gap-2 text-xs md:text-sm py-2">
              <MessageSquare className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Profile-Specific</span><span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="redflags" className="rounded-lg gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Flag className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">Red Flags</span><span className="sm:hidden">Flags</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="universal" className="mt-4 space-y-4">
            {universalQuestions.map(q => (
              <Card key={q.id} className="bg-muted/30 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">"{q.question}"</CardTitle>
                  <CardDescription className="text-xs">
                    Testing: {q.whatYouAreTesting}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderCheckItems(q.checkItems)}
                  <p className="text-xs text-muted-foreground mt-3 italic">{q.whatItTellsYou}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="profile" className="mt-4 space-y-4">
            {uniqueProfileQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No profile-specific questions available for this assessment.
              </p>
            ) : (
              uniqueProfileQuestions.map(q => (
                <Card key={q.id} className="bg-muted/30 border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs rounded-lg">{q.profile}</Badge>
                    </div>
                    <CardTitle className="text-sm font-medium mt-2">"{q.question}"</CardTitle>
                    <CardDescription className="text-xs">
                      Testing: {q.whatYouAreTesting}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderCheckItems(q.checkItems)}
                    <p className="text-xs text-muted-foreground mt-3 italic">{q.whatItTellsYou}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="redflags" className="mt-4">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Global Red Flags (All Profiles)
                </CardTitle>
                <CardDescription className="text-xs">
                  Slow down. Never sell harder.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderCheckItems(RED_FLAG_ITEMS)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
