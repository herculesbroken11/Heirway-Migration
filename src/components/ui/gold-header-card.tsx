import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GoldHeaderCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export function GoldHeaderCard({ 
  title, 
  description, 
  icon, 
  children, 
  className,
  headerAction 
}: GoldHeaderCardProps) {
  return (
    <Card className={cn("glass-panel overflow-hidden", className)}>
      {/* Gold gradient header bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon && (
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                {icon}
              </div>
            )}
            {title}
          </CardTitle>
          {headerAction}
        </div>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
