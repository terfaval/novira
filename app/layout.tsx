import "./globals.css";

export const metadata = {
  title: "Novira",
  description: "A kurátori irodalmi műhely — blokk-alapú átirat és jegyzetelés.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
