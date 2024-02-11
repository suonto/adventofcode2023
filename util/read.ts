import { open } from 'node:fs/promises';

export async function read(filePath: string): Promise<string[]> {
  const file = await open(filePath);

  const lines: string[] = [];
  for await (const line of file.readLines()) {
    lines.push(line);
  }

  return lines;
}
