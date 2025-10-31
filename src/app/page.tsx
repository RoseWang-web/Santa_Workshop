import { Gift } from 'lucide-react';
import { ChildrenDashboard } from '@/components/children/children-dashboard';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-lg p-2 shadow-md">
            <Gift className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold font-headline tracking-tight sm:text-2xl">
            Santa's Workshop Tracker
          </h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <ChildrenDashboard />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        Helping Santa deliver joy, one gift at a time.
      </footer>
    </div>
  );
}
