import "../../../src/app/globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", margin: 24 }}>
        {children}
      </body>
    </html>
  );
}
