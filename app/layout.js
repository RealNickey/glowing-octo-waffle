import "./globals.css";

export const metadata = {
  title: "Photo Gallery",
  description: "Convert photos to videos and videos back to photos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
