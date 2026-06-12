/**
 * tracing.ts — MUST be the first import in server.ts
 * Sets up Langfuse OTEL so every OpenAI call and manual span is traced.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const sdk = new NodeSDK({
  spanProcessors: [
    new LangfuseSpanProcessor({
      publicKey: process.env["LANGFUSE_PUBLIC_KEY"] ?? "",
      secretKey: process.env["LANGFUSE_SECRET_KEY"] ?? "",
      baseUrl: process.env["LANGFUSE_HOST"] ?? process.env["LANGFUSE_BASEURL"] ?? "https://cloud.langfuse.com",
    }),
  ],
});

sdk.start();

// Flush traces on shutdown.
process.on("beforeExit", async () => { await sdk.shutdown(); });
process.on("SIGTERM", async () => { await sdk.shutdown(); process.exit(0); });

export { sdk };
