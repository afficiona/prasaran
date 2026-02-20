import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prasaran - Multi-Platform Publisher",
  description: "Publish your content to Manch, Adda, and Samooh from one place",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: "Prasaran - Multi-Platform Publisher",
    description: "Publish your content to Manch, Adda, and Samooh from one place",
    url: "https://prasaran.vercel.app",
    siteName: "Prasaran",
    images: [
      {
        url: "https://prasaran.vercel.app/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Prasaran - Multi-Platform Publisher",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prasaran - Multi-Platform Publisher",
    description: "Publish your content to Manch, Adda, and Samooh from one place",
    images: ["https://prasaran.vercel.app/og-image.svg"],
  },
  metadataBase: new URL("https://prasaran.vercel.app"),
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
