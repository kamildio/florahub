import type { Metadata } from "next";
import "./globals.css";
import "./market.css";
import "./inventory.css";
import "./business.css";
import "./home.css";
import "./market-details.css";
import "./refinement.css";

export const metadata: Metadata = {
  title: "MaXiFlora — Цветы объединяют бизнес",
  description: "B2B-платформа для цветочного бизнеса Казахстана. Каталог, предзаказы, заказы и склад.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kk">
      <body className="antialiased">{children}</body>
    </html>
  );
}
