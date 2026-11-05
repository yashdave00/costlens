#!/usr/bin/env node
import { Command } from "commander";
import { scan } from "./scanner.js";
import { renderReport } from "./reporter.js";
import chalk from "chalk";

const program = new Command();
program
  .name("costlens")
  .description("Scan a codebase for cloud/infra cost leaks (vibe-coded apps focus).")
  .version("0.1.0");

program
  .command("scan [path]")
  .description("Scan a project directory and print a cost-leak report.")
  .option("-o, --out <file>", "Write report to a file instead of stdout")
  .option("--json", "Output JSON instead of markdown")
  .action(async (targetPath, opts) => {
    const root = targetPath || process.cwd();
    try {
      const result = await scan(root);
      const out = opts.json ? JSON.stringify(result, null, 2) : renderReport(result);
      if (opts.out) {
        const fs = await import("node:fs/promises");
        await fs.writeFile(opts.out, out, "utf8");
        console.log(chalk.green(`Report written to ${opts.out}`));
      } else {
        console.log(out);
      }
    } catch (e) {
      console.error(chalk.red("Scan failed:"), e.message);
      process.exit(1);
    }
  });

program.parse();
