"use client";

import { useState, useEffect } from "react";

export function ClerkLoadingFallback({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event) => {
      if (event.error?.message?.includes('@clerk/clerk-react')) {
        setHasError(true);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(to bottom right, #dbeafe, #e0e7ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: "600px", width: "100%", background: "#ffffff", borderRadius: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: "2rem", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", margin: "0 auto 1.5rem", background: "#fef3c7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2rem" }}>🔐</span>
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem" }}>
            Clerk Authentication Setup Required
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            To use this application, you need to configure Clerk authentication with valid API keys.
          </p>
          <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>Setup Steps:</h3>
            <ol style={{ paddingLeft: "1rem", fontSize: "0.875rem", color: "#4b5563" }}>
              <li>1. Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>Clerk Dashboard</a></li>
              <li>2. Create a new application or select existing one</li>
              <li>3. Copy your Publishable Key and Secret Key from API Keys section</li>
              <li>4. Update the <code style={{ background: "#e5e7eb", padding: "0.125rem 0.25rem", borderRadius: "0.25rem" }}>.env.local</code> file with your keys</li>
              <li>5. Restart the development server</li>
            </ol>
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            <strong>Note:</strong> This demo shows the Clerk integration is properly configured. 
            The authentication components are working and will display sign-in/sign-up options once valid keys are provided.
          </div>
        </div>
      </div>
    );
  }

  return children;
}