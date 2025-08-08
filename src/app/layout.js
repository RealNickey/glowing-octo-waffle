// import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
// import "./globals.css"; // Temporarily disabled for testing

// Temporarily disabled Google Fonts for testing
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata = {
  title: "Photo Dashboard with Clerk Auth",
  description: "Photo dashboard with Clerk authentication",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className="antialiased"
        >
          <header style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "1rem 1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937" }}>Photo Dashboard</h1>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: "500", color: "#374151", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "0.375rem", cursor: "pointer" }}>
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: "500", color: "#ffffff", background: "#2563eb", border: "1px solid transparent", borderRadius: "0.375rem", cursor: "pointer" }}>
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
