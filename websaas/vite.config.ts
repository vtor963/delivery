// @lovable.dev/vite-tanstack-config already includes the Vite, React, Tailwind,
// TanStack Start and Nitro plugins. Do not register them a second time.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

export default defineConfig({
  tanstackStart: {
    // Use the project's SSR error wrapper as the TanStack Start server entry.
    server: { entry: "server" },
  },
  // The Lovable config defaults Nitro to Cloudflare. Select Vercel's output
  // when this project is built by Vercel, while keeping the Lovable preview path.
  nitro: isVercel ? { preset: "vercel" } : true,
});
