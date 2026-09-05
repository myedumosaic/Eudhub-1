import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scholarly — School ERP for Teachers",
  description:
    "A modern multi-tenant school management platform for teachers: classes, students, gradebook, attendance and more.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f6f7fb] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
