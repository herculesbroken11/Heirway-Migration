import { HeirwayLayout } from '@/components/heirway/HeirwayLayout';
import MessagesCenter from '@/components/heirway/MessagesCenter';

export default function HeirwayMessages() {
  return (
    <HeirwayLayout>
      <div className="min-h-[100dvh] gradient-bg overflow-hidden">
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Messages</h1>
            <p className="text-sm text-muted-foreground">View and respond to conversations with the Heirway team.</p>
          </div>
          <MessagesCenter />
        </div>
      </div>
    </HeirwayLayout>
  );
}
