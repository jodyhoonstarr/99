#!/usr/bin/env node

import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [modelSpec] = process.argv.slice(2);
if (!modelSpec) {
  throw new Error("A provider/model ID is required");
}

const packageRoot = process.env.PI_CODING_AGENT_PACKAGE;
if (!packageRoot) {
  throw new Error(
    "PI_CODING_AGENT_PACKAGE is required (the directory containing pi's package.json)"
  );
}

const separator = modelSpec.indexOf("/");
if (separator < 1 || separator === modelSpec.length - 1) {
  throw new Error(`Model must be in provider/model form: ${modelSpec}`);
}

const provider = modelSpec.slice(0, separator);
const modelId = modelSpec.slice(separator + 1);
const input = [];
for await (const chunk of process.stdin) input.push(chunk);
const prompt = Buffer.concat(input).toString("utf8");
const { ModelRuntime } = await import(
  pathToFileURL(join(packageRoot, "dist", "index.js")).href
);

// ModelRuntime reads Pi's existing auth.json, including the GitHub Copilot OAuth
// token, but does not start an agent session or load its tools/resources.
const runtime = await ModelRuntime.create({ allowModelNetwork: false });
const model = runtime.getModel(provider, modelId);
if (!model) {
  throw new Error(`Model is unavailable: ${modelSpec}`);
}

const response = await runtime.completeSimple(
  model,
  {
    systemPrompt:
      "Return only the requested replacement text. Do not use Markdown fences, explain your work, call tools, or modify files.",
    messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
  },
  {
    // Use maximum reasoning for higher-quality replacement requests.
    reasoning: "max",
  }
);

if (response.stopReason === "error" || response.stopReason === "aborted") {
  throw new Error(response.errorMessage || `Copilot request ${response.stopReason}`);
}

const text = response.content
  .filter((part) => part.type === "text")
  .map((part) => part.text)
  .join("");
process.stdout.write(text);
