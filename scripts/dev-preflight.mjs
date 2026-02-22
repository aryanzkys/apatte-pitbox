import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webLockPath = path.join(root, "apps", "web-dashboard", ".next", "dev", "lock");

const run = command => {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    return (error?.stdout || "").toString().trim();
  }
};

const log = (msg, extra) => {
  if (extra) {
    console.log(`[dev-preflight] ${msg}`, extra);
    return;
  }
  console.log(`[dev-preflight] ${msg}`);
};

const uniqueInts = values =>
  [...new Set(values.map(v => Number.parseInt(v, 10)).filter(v => Number.isInteger(v) && v > 0))];

const splitLines = text =>
  text
    .split(/\r?\n/g)
    .map(line => line.trim())
    .filter(Boolean);

const cleanupWindows = () => {
  const dashboardPidOut = run(
    'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq \'node.exe\' -and $_.CommandLine -match \'apps\\\\web-dashboard\' -and $_.CommandLine -match \'next\\\\dist\\\\bin\\\\next\' } | Select-Object -ExpandProperty ProcessId"'
  );
  const dashboardPids = uniqueInts(splitLines(dashboardPidOut));

  if (dashboardPids.length > 0) {
    run(
      `powershell -NoProfile -Command "${dashboardPids
        .map(pid => `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`)
        .join("; ")}"`
    );
    log("terminated stale web-dashboard Next.js processes", dashboardPids);
  } else {
    log("no stale web-dashboard Next.js process found");
  }

  const telemetryPidOut = run(
    'powershell -NoProfile -Command "$owners = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($owners) { foreach ($pid in $owners) { $proc = Get-CimInstance Win32_Process -Filter \"ProcessId = $pid\" -ErrorAction SilentlyContinue; if ($proc -and $proc.CommandLine -match \"apps\\\\telemetry-ingestion\") { $pid } } }"'
  );
  const telemetryPids = uniqueInts(splitLines(telemetryPidOut));

  if (telemetryPids.length > 0) {
    run(
      `powershell -NoProfile -Command "${telemetryPids
        .map(pid => `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`)
        .join("; ")}"`
    );
    log("terminated stale telemetry-ingestion processes on port 8081", telemetryPids);
  } else {
    log("no stale telemetry-ingestion listener on port 8081 found");
  }
};

const cleanupPosix = () => {
  const dashboardPids = uniqueInts(splitLines(run("pgrep -f 'apps/web-dashboard.*next/dist/bin/next'")));
  if (dashboardPids.length > 0) {
    run(`kill -9 ${dashboardPids.join(" ")}`);
    log("terminated stale web-dashboard Next.js processes", dashboardPids);
  } else {
    log("no stale web-dashboard Next.js process found");
  }

  const telemetryPids = uniqueInts(splitLines(run("lsof -ti tcp:8081 -sTCP:LISTEN")));
  if (telemetryPids.length > 0) {
    run(`kill -9 ${telemetryPids.join(" ")}`);
    log("terminated stale listener on port 8081", telemetryPids);
  } else {
    log("no stale listener on port 8081 found");
  }
};

const removeStaleLock = () => {
  try {
    if (fs.existsSync(webLockPath)) {
      fs.rmSync(webLockPath, { force: true });
      log("removed stale web-dashboard lock file");
    } else {
      log("web-dashboard lock file not present");
    }
  } catch (error) {
    log("could not remove web-dashboard lock file (will continue)", error.message);
  }
};

if (process.platform === "win32") {
  cleanupWindows();
} else {
  cleanupPosix();
}

removeStaleLock();
log("preflight complete");
