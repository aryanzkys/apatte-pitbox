import { promises as fs } from "node:fs";
import path from "node:path";
import { log } from "../lib/logger";

export type DeadLetterEntry = {
  received_at: string;
  topic: string;
  payload_text: string;
  error_code: string;
  error_message: string;
  issues?: Array<{ path: string; message: string }>;
  truncated?: boolean;
};

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

export const writeDeadLetter = async (
  entry: DeadLetterEntry,
  opts: { path: string; maxBytes: number }
): Promise<void> => {
  const maxChars = Math.max(0, Math.floor(opts.maxBytes));
  let payloadText = entry.payload_text;
  let truncated = false;

  if (payloadText.length > maxChars) {
    payloadText = payloadText.slice(0, maxChars);
    truncated = true;
  }

  const record: DeadLetterEntry = {
    ...entry,
    payload_text: payloadText,
    truncated
  };

  try {
    await ensureDir(opts.path);
    await fs.appendFile(opts.path, `${JSON.stringify(record)}\n`, "utf-8");
  } catch (error) {
    log("error", "deadletter_write_failed", {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  log("warn", "dead_letter", {
    topic: record.topic,
    error_code: record.error_code,
    error_message: record.error_message
  });
};
