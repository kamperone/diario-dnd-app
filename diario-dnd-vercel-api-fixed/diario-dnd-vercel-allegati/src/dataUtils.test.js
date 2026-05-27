import { describe, expect, it } from "vitest";
import { coerceValue, parseCsv, rowsToObjects } from "./dataUtils.js";

describe("parseCsv", () => {
  it("parses quoted commas and escaped quotes", () => {
    const rows = parseCsv('name,note\n"Agal","riga con, virgola"\n"Hanna","test con ""virgolette"""');
    expect(rows).toHaveLength(3);
    expect(rows[1][1]).toBe("riga con, virgola");
    expect(rows[2][1]).toBe('test con "virgolette"');
  });

  it("ignores empty trailing rows", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("rowsToObjects", () => {
  it("maps headers and coerces booleans/numbers", () => {
    const objects = rowsToObjects([
      ["nome", "livello", "noto_ai_pg"],
      ["Pedri", "3", "TRUE"],
    ]);
    expect(objects[0]).toEqual({ nome: "Pedri", livello: 3, noto_ai_pg: true });
  });
});

describe("coerceValue", () => {
  it("keeps normal strings untouched", () => {
    expect(coerceValue("A2-S1")).toBe("A2-S1");
  });
});
