import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Test the tool timeout logic pattern used in session-bridge.
 * Since SessionBridge requires Electron and pi-coding-agent SDK,
 * we test the timeout logic pattern in isolation.
 */

describe("Tool Timeout Logic", () => {
  let timers: Map<string, NodeJS.Timeout>;
  let abortCalled: boolean;
  let followUpMessage: string | null;

  const TIMEOUT_MS = 100; // Use short timeout for testing

  beforeEach(() => {
    vi.useFakeTimers();
    timers = new Map();
    abortCalled = false;
    followUpMessage = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
  });

  // Simulates the session-bridge timeout logic
  function startToolTimer(toolCallId: string, toolName: string) {
    if (timers.has(toolCallId)) {
      clearTimeout(timers.get(toolCallId));
    }

    const timer = setTimeout(async () => {
      timers.delete(toolCallId);
      // Simulate abort and retry
      abortCalled = true;
      followUpMessage = `Tool "${toolName}" timed out. Please try another approach.`;
    }, TIMEOUT_MS);

    timers.set(toolCallId, timer);
  }

  function completeToolTimer(toolCallId: string) {
    if (timers.has(toolCallId)) {
      clearTimeout(timers.get(toolCallId));
      timers.delete(toolCallId);
    }
  }

  function clearAllTimers() {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
  }

  it("triggers timeout callback when tool exceeds timeout", () => {
    startToolTimer("tool-1", "bash");

    expect(abortCalled).toBe(false);
    expect(followUpMessage).toBeNull();

    // Advance time past timeout
    vi.advanceTimersByTime(TIMEOUT_MS + 10);

    expect(abortCalled).toBe(true);
    expect(followUpMessage).toContain("bash");
    expect(followUpMessage).toContain("timed out");
  });

  it("does not trigger timeout if tool completes in time", () => {
    startToolTimer("tool-1", "bash");

    // Tool completes before timeout
    vi.advanceTimersByTime(TIMEOUT_MS - 50);
    completeToolTimer("tool-1");

    // Advance past original timeout
    vi.advanceTimersByTime(100);

    expect(abortCalled).toBe(false);
    expect(followUpMessage).toBeNull();
  });

  it("handles multiple concurrent tool timers", () => {
    startToolTimer("tool-1", "bash");
    startToolTimer("tool-2", "read");

    expect(timers.size).toBe(2);

    // Complete first tool
    completeToolTimer("tool-1");
    expect(timers.size).toBe(1);

    // Second tool times out
    vi.advanceTimersByTime(TIMEOUT_MS + 10);

    expect(abortCalled).toBe(true);
    expect(followUpMessage).toContain("read");
  });

  it("clears all timers on clearAllTimers", () => {
    startToolTimer("tool-1", "bash");
    startToolTimer("tool-2", "read");

    expect(timers.size).toBe(2);

    clearAllTimers();

    expect(timers.size).toBe(0);

    // Advance time - no timeout should trigger
    vi.advanceTimersByTime(TIMEOUT_MS + 100);
    expect(abortCalled).toBe(false);
  });

  it("resets timer if same tool starts again", () => {
    startToolTimer("tool-1", "bash");

    // Advance halfway
    vi.advanceTimersByTime(TIMEOUT_MS / 2);

    // Same tool starts again (reset)
    startToolTimer("tool-1", "bash");

    // Advance to original timeout time (shouldn't trigger)
    vi.advanceTimersByTime(TIMEOUT_MS / 2 + 10);
    expect(abortCalled).toBe(false);

    // Advance to new timeout time
    vi.advanceTimersByTime(TIMEOUT_MS / 2);
    expect(abortCalled).toBe(true);
  });
});

describe("Abort Button Async Handling", () => {
  it("abort returns a promise", async () => {
    const mockAbort = vi.fn().mockResolvedValue(undefined);

    const handleAbort = async () => {
      try {
        await mockAbort();
      } catch (err) {
        console.error("Abort failed:", err);
      }
    };

    await handleAbort();
    expect(mockAbort).toHaveBeenCalled();
  });

  it("abort handles errors gracefully", async () => {
    const mockAbort = vi.fn().mockRejectedValue(new Error("Abort failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handleAbort = async () => {
      try {
        await mockAbort();
      } catch (err) {
        console.error("Abort failed:", err);
      }
    };

    await handleAbort();
    expect(mockAbort).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
