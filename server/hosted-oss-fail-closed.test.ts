// Security invariant: a server configured for hosted sign-in but missing its enterprise layer must refuse remote
// access instead of falling back to local sign-in. The open-source edition ships with no such layer.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SessionRegistry } from "./sessions.ts";
import { removeTempDir, waitForExit } from "./testing/cleanup.ts";
import { freePortBlock } from "./testing/ports.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "acme.example.test";
const EMAIL = "member@example.test";
const INSTANCES = { claude: { driver: "claudeAgent", config: { cli: join(ROOT, "server/testing/fake-claude-cli.ts") } } };
let PORT: number;
let home: string;
let child: ChildProcess;
let log = "";
let pairedToken: string;

function call(path: string, options: { method?: string; local?: boolean; token?: string; body?: unknown } = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port: PORT, path, method: options.method ?? "GET", headers: {
      ...(options.local ? {} : { host: HOST, "x-forwarded-for": "203.0.113.8", "x-forwarded-proto": "https" }),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    } }, (res) => {
      let raw = ""; res.on("data", (chunk) => raw += chunk);
      res.on("end", () => { let body: unknown = raw; try { body = JSON.parse(raw); } catch {} resolve({ status: res.statusCode!, body }); });
    });
    req.on("error", reject); req.end(options.body === undefined ? undefined : JSON.stringify(options.body));
  });
}

beforeAll(async () => {
  PORT = await freePortBlock([0, 1], 35_000, 5_000);
  home = mkdtempSync(join(tmpdir(), "acgs-hosted-oss-"));
  const data = join(home, ".openmausbot");
  mkdirSync(data, { recursive: true });
  mkdirSync(join(home, "static"));
  writeFileSync(join(home, "static", "index.html"), "<!doctype html><title>Fixture workspace</title>");
  // A device paired before the deployment lost its layer: its admin token must not survive the switch to hosted.
  pairedToken = new SessionRegistry({ file: join(data, "sessions.json") }).issue({ label: "Pre-existing QR device", scopes: ["admin", "client"] }).token;
  writeFileSync(join(data, "config.json"), JSON.stringify({ signIn: { admins: [EMAIL] }, instances: INSTANCES }));
  child = spawn(process.execPath, [join(ROOT, "server/index.ts")], { cwd: ROOT, env: {
    ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    HOME: home, USERPROFILE: home, OMB_PORT: String(PORT), OMB_WEBHOOK_PORT: String(PORT + 1),
    OMB_STATIC_DIR: join(home, "static"), OMB_BROWSER_CONNECTION: join(home, "browser-connection.json"),
    OMB_ENTERPRISE_DIR: join(home, "absent-layer"), OMB_LICENSE_KEY: "fixture-only",
    OMB_ADMIN_URL: "https://admin.example.test", OMB_ADMIN_WORKSPACE: "acme", OMB_ADMIN_MEMBERSHIP: "portal",
    OMB_PUBLIC_URL: `https://${HOST}`, OMB_SHARED_WORKSPACE_FULL_ACCESS: "1", OMB_LOOPBACK_TRUST: "owner",
  }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.on("data", (chunk) => log += chunk); child.stderr?.on("data", (chunk) => log += chunk);
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try { if ((await call("/api/health", { local: true })).status === 200) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Hosted fixture without an enterprise layer failed to start:\n${log}`);
}, 30_000);

afterAll(async () => {
  if (child) await waitForExit(child, { signal: "SIGTERM" });
  if (home) await removeTempDir(home);
});

describe("hosted configuration without the enterprise layer", () => {
  it("reports the open-source edition", async () => {
    const edition = await call("/api/edition", { local: true });
    expect(edition.status).toBe(200);
    expect(edition.body.edition).toBe("oss");
  });

  it("fails closed for remote callers, a previously paired admin token included, and keeps local owner access", async () => {
    expect((await call("/api/health/hosted")).status).toBe(503);
    expect((await call("/api/auth/hosted/start")).status).toBe(503);
    expect((await call("/")).status).toBe(503);
    expect((await call("/pair")).status).toBe(503);
    expect((await call("/api/auth/session", { token: pairedToken })).status).toBe(503);
    expect((await call("/api/bots", { token: pairedToken })).status).toBe(503);
    expect((await call("/api/auth/email/verify", { method: "POST" })).status).toBe(403);
    expect((await call("/api/auth/session", { local: true })).body.kind).toBe("loopback");
  }, 25_000);

  it("never turns on the shared Full-access policy, so a Full task is refused", async () => {
    const health = await call("/api/health", { local: true });
    expect(health.status).toBe(200);
    expect(health.body.capabilities.guardedFullAccess).toBe(1);
    expect(health.body.capabilities.sharedWorkspaceFullAccess).toBeUndefined();
    const catalog = await call("/api/instances", { local: true });
    const provider = catalog.body.instances.find((instance: any) => instance.instanceId === "claude");
    const created = await call("/api/bots", { method: "POST", local: true, body: {
      name: "Policy fixture", requireAvailableModel: true, modelSelection: { instanceId: "claude", model: provider.models.default },
    } });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.bot.approvalMode).toBe("ask");
    const denied = await call(`/api/bots/${created.body.bot.id}/tasks`, { method: "POST", local: true,
      body: { title: "Must not become Full", approvalMode: "full" } });
    expect(denied.status, JSON.stringify(denied.body)).toBe(403);
  }, 25_000);
});
