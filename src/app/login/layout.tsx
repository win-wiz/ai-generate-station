import "@/styles/globals.css";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}