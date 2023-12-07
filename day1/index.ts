import { open } from "node:fs/promises";
import path from "node:path";

const map = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

(async () => {
  const file = await open(path.join(__dirname, ".", "input.txt"));

  let sum = 0;
  for await (const line of file.readLines()) {
    console.log(line);
    const matches = line.matchAll(
      new RegExp(`(?=(\\d{1}|(${Object.keys(map).join("|")})))`, "g")
    );

    const arr: string[] = Array.from(matches).map((match) => match[1]);

    console.log(arr);
    const first = map[arr.at(0)] ?? arr.at(0);
    const last = map[arr.at(-1)] ?? arr.at(-1);

    const result = `${first}${last}`;
    sum += Number.parseInt(result);
    console.log(result, sum);
  }
})();
