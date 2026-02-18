import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prasaran - Multi-Platform Publisher",
  description: "Publish to multiple platforms at once",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
