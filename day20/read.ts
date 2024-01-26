import { open } from 'node:fs/promises';
import path from 'node:path';

export async function read(filePath: string): Promise<string[]> {
  const file = await open(path.join(__dirname, filePath));

  const lines: string[] = [];
  for await (const line of file.readLines()) {
    lines.push(line);
  }

  return lines;
}
