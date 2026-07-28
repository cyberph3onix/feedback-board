import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anonymous Feedback Board",
  description:
    "A Midnight smart contract DApp where registered members submit feedback anonymously.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
