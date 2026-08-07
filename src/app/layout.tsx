import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VTripPlanner",
    template: "%s | VTripPlanner",
  },
  description:
    "Lập lịch trình du lịch và khám phá những chia sẻ, gợi ý theo mùa từ cộng đồng VTripPlanner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-950`}>
        {children}
      </body>
    </html>
  );
}
