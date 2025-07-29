import "./globals.css";
import { Providers } from "@/components/Providers";
import ConditionalNavbar from "@/components/ConditionalNavbar";

export const metadata = {
  title: "ClearPoint Security",
  description: "Your Security, Crystal Clear.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ConditionalNavbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
