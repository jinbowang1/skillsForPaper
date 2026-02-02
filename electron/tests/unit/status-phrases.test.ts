import { describe, it, expect } from "vitest";
import {
  THINKING_PHRASES,
  IDLE_PHRASES,
  pickRandom,
} from "../../renderer/utils/status-phrases";

describe("THINKING_PHRASES", () => {
  it("has multiple phrases", () => {
    expect(THINKING_PHRASES.length).toBeGreaterThan(10);
  });

  it("all phrases end with …", () => {
    for (const p of THINKING_PHRASES) {
      expect(p.endsWith("…")).toBe(true);
    }
  });
});

describe("IDLE_PHRASES", () => {
  it("has multiple phrases", () => {
    expect(IDLE_PHRASES.length).toBeGreaterThan(5);
  });

  it("all phrases are non-empty strings", () => {
    for (const p of IDLE_PHRASES) {
      expect(p.length).toBeGreaterThan(0);
    }
  });
});

describe("pickRandom", () => {
  it("returns an element from the list", () => {
    const list = ["a", "b", "c"];
    const result = pickRandom(list);
    expect(list).toContain(result);
  });

  it("returns the only element for single-item list", () => {
    expect(pickRandom(["only"])).toBe("only");
  });

  it("avoids the excluded element", () => {
    const list = ["a", "b"];
    // With only 2 items and excluding "a", must return "b"
    for (let i = 0; i < 20; i++) {
      expect(pickRandom(list, "a")).toBe("b");
    }
  });

  it("works with number arrays", () => {
    const list = [1, 2, 3, 4, 5];
    const result = pickRandom(list);
    expect(list).toContain(result);
  });
});
