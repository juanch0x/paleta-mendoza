import { format, resolveConfig } from "prettier";

/**
 * Serialises a value as JSON formatted with the repository's Prettier config,
 * so generated files pass `pnpm format:check` without a manual step.
 */
export async function formatJson(
  value: unknown,
  filePath: string
): Promise<string> {
  const config = (await resolveConfig(filePath)) ?? {};
  return format(JSON.stringify(value), {
    ...config,
    filepath: filePath,
    parser: "json",
  });
}
