import type { Metadata } from "next";
import { Inter, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/main-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif",
});

export const metadata: Metadata = {
  title: "闻思修·智创平台",
  description: "AI驱动的内容创作与发布平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${notoSerifSC.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container flex h-16 items-center px-6 md:px-8 lg:px-12">
              <div className="mr-8 flex items-center space-x-2">
                <span className="font-serif font-bold text-2xl tracking-tight text-primary">闻思修·智创平台</span>
              </div>
              <MainNav />
            </div>
          </header>
          <main className="container py-8 px-6 md:px-8 lg:px-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
