import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "./globals.css";
import { InstallApp } from "@/components/install-app";
import { PwaRegister } from "@/components/pwa-register";
import { ProtoProvider } from "@/mess/store";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
});

export const metadata: Metadata = {
  title: "MessMate",
  description: "Daily meals, guests, and mess money for a hostel.",
  applicationName: "MessMate",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "MessMate", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${hind.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('hmm-preview')&&JSON.parse(localStorage.getItem('hmm-preview')).theme==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full bg-bg text-ink">
        <PwaRegister />
        <InstallApp />
        <ProtoProvider>{children}</ProtoProvider>
      </body>
    </html>
  );
}
