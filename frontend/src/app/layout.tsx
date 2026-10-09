import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stayly | Find your next stay",
  description: "Photo-forward stays for every kind of escape.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
