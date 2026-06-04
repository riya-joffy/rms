import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import { ReportProvider } from "../context/ReportContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPulse RMS - Market Report System",
  description: "Simple market reporting and review dashboard with Firebase support.",
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
  <ToastContainer />
</ReportProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
