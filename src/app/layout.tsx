import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuldeep Thakur — AI Engineer & Software Developer",
  description:
    "Kuldeep Thakur builds intelligent applications and AI-powered software through applied AI engineering, LLM applications, agentic workflows and modern software development.",
  openGraph: {
    title: "Kuldeep Thakur — AI Engineer & Software Developer",
    description: "Building Intelligent Systems. Engineering Real-World Solutions.",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
