import fs from "node:fs/promises";
import path from "node:path";

const logsDir = path.join(process.cwd(), "logs");
const today = new Date().toISOString().slice(0, 10);
const logFilePath = path.join(logsDir, `${today}.log`);

export async function log(scope: string, message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${scope}] ${message}`;

  console.log(formattedMessage);

  await writeLogToFile(formattedMessage);
}

export async function logError(scope: string, error: unknown): Promise<void> {
  const timestamp = new Date().toISOString();

  const errorMessage =
    error instanceof Error
      ? `${error.message}\n${error.stack ?? ""}`
      : JSON.stringify(error, null, 2);

  const formattedMessage = `[${timestamp}] [${scope}] ${errorMessage}`;

  console.error(formattedMessage);

  await writeLogToFile(formattedMessage);
}

async function writeLogToFile(message: string): Promise<void> {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(logFilePath, `${message}\n`, "utf-8");
}
