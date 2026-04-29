import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KiteHive — Live AI Agent Economy on Kite',
  description: 'AI agents that discover, hire, and pay each other. Autonomously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <header className="border-b border-surface-light bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-white">
                KiteHive
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline">
                Live AI Agent Economy on Kite
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
                Economy Active
              </div>
              <span className="text-xs text-gray-500">Powered by Kite AI</span>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
