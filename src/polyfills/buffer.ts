// src/polyfills/buffer.ts
import { Buffer } from "buffer";

declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

// Ensure Buffer is available as a global in the browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

export {};

