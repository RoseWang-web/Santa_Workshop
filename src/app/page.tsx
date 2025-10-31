import { Gift } from 'lucide-react';
import { ChildrenDashboard } from '@/components/children/children-dashboard';
import Image from 'next/image';
import pixelSanta from '@/images/pixel-santa.png';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b bg-background/90 px-4 backdrop-blur md:px-6 candy-stripe">
        <div className="flex items-center gap-4">
          <div className="rounded-md p-1.5 bg-white/70 border pixelated">
            <Image src={pixelSanta} alt="Pixel Santa" width={40} height={40} className="pixelated" />
          </div>
          <div className="bg-primary text-primary-foreground rounded-lg p-2 shadow-md hidden sm:block">
            <Gift className="h-6 w-6" />
          </div>
          <h1 className="text-[14px] sm:text-base md:text-lg font-pixel-title tracking-tight">
            Santa's Workshop Tracker
          </h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 xmas-bg">
        <ChildrenDashboard />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        Helping Santa deliver joy, one gift at a time.
      </footer>
    </div>
  );
}
