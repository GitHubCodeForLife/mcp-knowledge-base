import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const RawConfigSchema = z.object({
  version: z.string(),
  project: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  server: z.object({
    type: z.string(),
    runtime: z.string(),
    port: z.number().optional(),
  }),
  knowledge_base: z.object({
    sources: z.array(
      z.object({
        type: z.literal("local_files"),
        name: z.string(),
        config: z.object({
          path: z.string(),
          file_types: z.array(z.string()),
        }),
      }),
    ),
    ingestion: z.object({
      chunk_size: z.number(),
      chunk_overlap: z.number(),
      encoding: z.string(),
    }),
  }),
  retrieval: z.object({
    top_k: z.number(),
    method: z.enum(["semantic"]),
  }),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      input_schema: z.unknown(),
    }),
  ),
  models: z
    .object({
      default: z.string(),
      temperature: z.number(),
    })
    .optional(),
  logging: z.object({
    level: z.string(),
  }),
  deployment: z
    .object({
      environment: z.string(),
    })
    .optional(),
});

export type AppConfig = z.infer<typeof RawConfigSchema> & {
  configPath: string;
  projectRoot: string;
  resolvedSources: Array<{
    name: string;
    absolutePath: string;
    fileTypes: Set<string>;
  }>;
};

function resolveConfigPath(projectRoot: string): string {
  const override = process.env.LOCAL_DOC_AI_CONFIG;
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.resolve(projectRoot, override);
  }
  return path.join(projectRoot, "build", "config.yaml");
}

export function loadConfig(projectRoot: string = process.cwd()): AppConfig {
  const configPath = resolveConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const raw = parseYaml(fs.readFileSync(configPath, "utf8"));
  const parsed = RawConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid config (${configPath}): ${parsed.error.flatten().formErrors.join(", ")}`,
    );
  }
  const data = parsed.data;
  const resolvedSources = data.knowledge_base.sources.map((s) => {
    const rel = s.config.path;
    const absolutePath = path.resolve(projectRoot, rel);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(
        `Knowledge source "${s.name}" path does not exist: ${absolutePath} (from ${rel})`,
      );
    }
    if (!fs.statSync(absolutePath).isDirectory()) {
      throw new Error(
        `Knowledge source "${s.name}" is not a directory: ${absolutePath}`,
      );
    }
    return {
      name: s.name,
      absolutePath,
      fileTypes: new Set(s.config.file_types.map((t) => t.toLowerCase())),
    };
  });

  return {
    ...data,
    configPath,
    projectRoot: path.resolve(projectRoot),
    resolvedSources,
  };
}
