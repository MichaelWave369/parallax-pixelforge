import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

const candidates =
  process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
        { command: "python3", prefix: [] },
        { command: "python", prefix: [] },
      ];

for (const candidate of candidates) {
  const result = spawnSync(
    candidate.command,
    [...candidate.prefix, ...args],
    { stdio: "inherit" },
  );

  if (result.error?.code === "ENOENT") {
    continue;
  }

  if (result.error) {
    console.error(
      `Unable to launch ${candidate.command}: ${result.error.message}`,
    );
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

console.error(
  "Python 3 was not found. Install Python 3 or make python3/python/py available.",
);
process.exit(1);
