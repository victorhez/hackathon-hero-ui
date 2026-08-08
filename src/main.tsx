import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter as _unusedCreateRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles.css";

const _routerUnusedRef = _unusedCreateRouter;

let bootPromise: Promise<ReturnType<typeof import("./router").getRouter>> | undefined;

async function boot() {
  const [{ getRouter }, { routeTree }] = await Promise.all([
    import("./router"),
    import("./routeTree.gen"),
  ]);
  const router = getRouter();
  void routeTree;
  return router;
}

function getBootPromise() {
  if (!bootPromise) bootPromise = boot();
  return bootPromise;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [router, setRouter] =
    React.useState<ReturnType<typeof boot> extends Promise<infer R> ? R | null : null>(null);

  React.useEffect(() => {
    void getBootPromise().then(setRouter);
  }, []);

  if (!router) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--background)",
          color: "var(--foreground)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundImage: "var(--gradient-brand)",
              margin: "0 auto 1.25rem",
              animation: "spin 1.4s linear infinite",
            }}
          />
          <p style={{ opacity: 0.8 }}>Loading ClearLend…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as any} />
    </QueryClientProvider>
  );
}

declare global {
  interface Window {
    __CLEARLEND_BOOTED__?: boolean;
  }
}

const rootEl = document.getElementById("root")!;
if (!window.__CLEARLEND_BOOTED__) {
  window.__CLEARLEND_BOOTED__ = true;
  ReactDOM.createRoot(rootEl).render(<App />);
}
