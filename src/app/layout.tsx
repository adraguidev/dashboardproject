import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastContainer } from "@/components/ui/toast";
import PostHogProvider from '@/components/providers/posthog-provider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UFSM Dashboard - Análisis Avanzado de Procesos",
  description: "Dashboard avanzado para análisis de KPIs, métricas y procesos de negocio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StackProvider app={stackServerApp}>
          <PostHogProvider>
            <QueryProvider>
              <StackTheme>
                <ErrorBoundary>
                  {children}
                  <ToastContainer />
                </ErrorBoundary>
              </StackTheme>
            </QueryProvider>
          </PostHogProvider>
        </StackProvider>
        <div id="modal-root"></div>
      </body>
    </html>
  );
}
