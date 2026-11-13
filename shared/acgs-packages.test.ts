import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { packageScanFindings, packageSecretFindings, parsePackageDocument } from "./package-format.ts";

const DIR = join(import.meta.dirname, "..", "packages", "acgs");

const TEAMS = [
  { file: "acgs-governance.v2.json", team: "ACGS Governance", leader: "constitutional-reviewer", agents: 3 },
  { file: "acgs-engineering.v2.json", team: "ACGS Engineering", leader: "architect", agents: 4 },
  { file: "acgs-go-to-market.v2.json", team: "ACGS Go-to-Market", leader: "gtm-lead", agents: 4 },
];

describe("ACGS team packages", () => {
  for (const { file, team, leader, agents } of TEAMS) {
    it(`${file} parses as ${team}`, () => {
      const document = parsePackageDocument(JSON.parse(readFileSync(join(DIR, file), "utf8")));
      const pkg = document.package;
      expect(pkg.team?.name).toBe(team);
      expect(pkg.team?.leader).toBe(leader);
      expect(pkg.agents).toHaveLength(agents);
      expect(pkg.agents.every((agent) => agent.approval === "ask")).toBe(true);
      expect(pkg.author).toEqual({ name: "ACGS", url: "https://acgs.ai" });
      expect(pkg.license).toBe("Apache-2.0");
      expect(packageSecretFindings(document)).toEqual([]);
      expect(packageScanFindings(document)).toEqual([]);
    });
  }
});
