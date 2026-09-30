import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Noble Path Admin", template: "%s · Noble Path Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-svh font-sans antialiased">{children}</body>
    </html>
  );
}
