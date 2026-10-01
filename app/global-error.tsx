"use client";

/**
 * Last-resort error page, used when the root layout itself fails (D-41, L-4).
 * It replaces the whole document, so it carries its own <html> and <body>.
 * Generic text and the digest only, never error details.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ffffff", color: "#16211e" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 16px" }}>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 20px", lineHeight: 1.6 }}>This page could not be loaded. Please try again.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #16211e", background: "transparent", cursor: "pointer", font: "inherit" }}>
            Try again
          </button>
          {error.digest ? <p style={{ marginTop: 24, fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#53625d" }}>Error code: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
