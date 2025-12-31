import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/main-nav";

export const metadata: Metadata = {
  title: "内容工厂 Agent",
  description: "AI驱动的内容创作与发布平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center px-6 md:px-8 lg:px-12">
              <div className="mr-8 flex items-center space-x-2">
                <span className="font-bold text-xl">内容工厂 Agent</span>
              </div>
              <MainNav />
            </div>
          </header>
          <main className="container py-6 px-6 md:px-8 lg:px-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
