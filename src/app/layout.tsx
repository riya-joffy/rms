import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import { ReportProvider } from "../context/ReportContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPulse RMS - Market Report Management System",
  description: "Enterprise SaaS Platform for regional market intelligence analysis, reporting and review workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <AuthProvider>
          <ReportProvider>
            {children}
          </ReportProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
