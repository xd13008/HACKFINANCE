import type { NextConfig } from "next";
import { applyPreviewEnv } from "./src/lib/preview-env.mjs";

// Site de test : la base de test (préfixe TEST) remplace la base de production avant que Next n'intègre
// les variables NEXT_PUBLIC_* au code. Sans effet en production.
const copied = applyPreviewEnv();
const inline = Object.fromEntries(copied.filter((k) => k.startsWith("NEXT_PUBLIC_")).map((k) => [k, process.env[k]!]));

const nextConfig: NextConfig = {
  ...(Object.keys(inline).length ? { env: inline } : {}),
};

export default nextConfig;
