import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Crimson_Pro, DM_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const barlow = Barlow({
  subsets: ["latin"], weight: ["400","500","600","700","800"],
  variable: "--font-barlow", display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"], weight: ["400","500","600","700","800"],
  variable: "--font-barlow-condensed", display: "swap",
});
const crimsonPro = Crimson_Pro({
  subsets: ["latin"], weight: ["300","400","600"],
  style: ["normal","italic"], variable: "--font-crimson", display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"], weight: ["300","400","500"],
  variable: "--font-dm-mono", display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EduCore RW", template: "%s | EduCore RW" },
  description: "Rwanda school management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${barlow.variable} ${barlowCondensed.variable} ${crimsonPro.variable} ${dmMono.variable} font-sans antialiased bg-gray-50 text-gray-900`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: "var(--font-barlow)", fontSize: "14px", borderRadius: "6px" },
              success: { iconTheme: { primary: "#1a3a2a", secondary: "#fff" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
