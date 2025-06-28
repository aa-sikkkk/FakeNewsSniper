import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import { BoltAttribution } from "@/components/BoltAttribution";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fake News Sniper',
  description: 'AI-powered fact checking and evidence retrieval',
};

// Force dynamic rendering to handle Supabase auth cookies
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Check auth status
  const { data: { session } } = await supabase.auth.getSession();

  // Only show auth-related UI elements if user is logged in
  const isAuthenticated = !!session;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem
        >
          <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center py-4">
                <Link href="/" className="font-bold text-lg flex items-center">
                  <span className="mr-1 text-primary">Fake News Sniper</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">2.0</span>
                </Link>
                
                <div className="flex items-center space-x-4">
                  {isAuthenticated && (
                    <nav className="hidden md:flex items-center space-x-4">
                      <Link href="/" className="text-sm font-medium hover:text-primary">
                        Home
                      </Link>
                      <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
                        Dashboard
                      </Link>
                      <Link href="/lab" className="text-sm font-medium hover:text-primary">
                        AI Lab
                      </Link>
                      <Link href="/about" className="text-sm font-medium hover:text-primary">
                        About
                      </Link>
                    </nav>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <ThemeToggle />
                    {isAuthenticated && (
                      <form action="/auth/signout" method="post">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          type="submit"
                        >
                          <LogOut className="h-5 w-5" />
                          <span className="sr-only">Sign out</span>
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          <main>
            {children}
          </main>
          
          <footer className="border-t border-border/40 py-6 mt-12">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} Fake News Sniper 2.0
                </p>
                <div className="flex items-center space-x-4 mt-4 md:mt-0">
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                    About
                  </Link>
                  <Link href="/challenge" className="text-sm text-muted-foreground hover:text-primary">
                    Challenge Mode
                  </Link>
                  {!isAuthenticated && (
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </footer>
          
          <Toaster />
          <BoltAttribution />
        </ThemeProvider>
      </body>
    </html>
  );
}