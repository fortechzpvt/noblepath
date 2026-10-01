"use client";

/**
 * Shown when a page fails to render (D-41, L-4). Generic on purpose: never the
 * error's message or stack, only Next's digest, which matches the server log
 * line so support can find the details.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 12px" }}>Something went wrong</h1>
      <p style={{ margin: "0 0 20px", lineHeight: 1.6 }}>
        This page could not be loaded. Try again, and if it keeps happening, contact us and quote the code below.
      </p>
      <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid currentColor", background: "transparent", cursor: "pointer", font: "inherit" }}>
        Try again
      </button>
      {error.digest ? <p style={{ marginTop: 24, fontFamily: "ui-monospace, monospace", fontSize: 13, opacity: 0.7 }}>Error code: {error.digest}</p> : null}
    </main>
  );
}
