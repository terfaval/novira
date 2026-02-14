import "./globals.css";
import { Spectral, Source_Serif_4 } from "next/font/google";

const fontDisplay = Spectral({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const fontBody = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-body",
});

export const metadata = {
  title: "Novira",
  description: "A kurátori irodalmi műhely — blokk-alapú átirat és jegyzetelés.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
