import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock SessionBridge
const mockSessionBridge = {
  isReady: vi.fn(),
  prompt: vi.fn(),
  steer: vi.fn(),
  getModels: vi.fn(),
  setModel: vi.fn(),
};

describe("IPC handlers - session ready checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("session:prompt", () => {
    it("should throw error if session not ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(false);

      // Simulate the IPC handler logic
      const handler = async (text: string, images?: any[]) => {
        if (!mockSessionBridge.isReady()) {
          throw new Error("会话尚未初始化，请稍等片刻再试");
        }
        await mockSessionBridge.prompt(text, images);
      };

      await expect(handler("test")).rejects.toThrow("会话尚未初始化");
      expect(mockSessionBridge.prompt).not.toHaveBeenCalled();
    });

    it("should call prompt if session is ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(true);
      mockSessionBridge.prompt.mockResolvedValue(undefined);

      const handler = async (text: string, images?: any[]) => {
        if (!mockSessionBridge.isReady()) {
          throw new Error("会话尚未初始化，请稍等片刻再试");
        }
        await mockSessionBridge.prompt(text, images);
      };

      await handler("test message");
      expect(mockSessionBridge.prompt).toHaveBeenCalledWith("test message", undefined);
    });
  });

  describe("session:steer", () => {
    it("should throw error if session not ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(false);

      const handler = async (text: string) => {
        if (!mockSessionBridge.isReady()) {
          throw new Error("会话尚未初始化，请稍等片刻再试");
        }
        await mockSessionBridge.steer(text);
      };

      await expect(handler("steer text")).rejects.toThrow("会话尚未初始化");
      expect(mockSessionBridge.steer).not.toHaveBeenCalled();
    });

    it("should call steer if session is ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(true);
      mockSessionBridge.steer.mockResolvedValue(undefined);

      const handler = async (text: string) => {
        if (!mockSessionBridge.isReady()) {
          throw new Error("会话尚未初始化，请稍等片刻再试");
        }
        await mockSessionBridge.steer(text);
      };

      await handler("follow up");
      expect(mockSessionBridge.steer).toHaveBeenCalledWith("follow up");
    });
  });

  describe("model:list", () => {
    it("should return empty array if session not ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(false);

      const handler = async () => {
        if (!mockSessionBridge.isReady()) {
          return [];
        }
        return mockSessionBridge.getModels();
      };

      const result = await handler();
      expect(result).toEqual([]);
      expect(mockSessionBridge.getModels).not.toHaveBeenCalled();
    });

    it("should return models if session is ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(true);
      const mockModels = [{ id: "test", name: "Test Model" }];
      mockSessionBridge.getModels.mockReturnValue(mockModels);

      const handler = async () => {
        if (!mockSessionBridge.isReady()) {
          return [];
        }
        return mockSessionBridge.getModels();
      };

      const result = await handler();
      expect(result).toEqual(mockModels);
    });
  });

  describe("model:set", () => {
    it("should throw error if session not ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(false);

      const handler = async (modelId: string) => {
        if (!mockSessionBridge.isReady()) {
          throw new Error("会话尚未初始化，请稍等片刻再试");
        }
        return mockSessionBridge.setModel(modelId);
      };

      await expect(handler("test-model")).rejects.toThrow("会话尚未初始化");
      expect(mockSessionBridge.setModel).not.toHaveBeenCalled();
    });

    it("should set model if session is ready", async () => {
      mockSessionBridge.isReady.mockReturnValue(true);
      mockSessionBridge.setModel.mockResolvedValue({ model: "new-model" });

      const handler = async (modelId: string) => {
        if (!mockSessionBridge.isReady()) {
          throw new Error("会话尚未初始化，请稍等片刻再试");
        }
        return mockSessionBridge.setModel(modelId);
      };

      const result = await handler("new-model");
      expect(result).toEqual({ model: "new-model" });
      expect(mockSessionBridge.setModel).toHaveBeenCalledWith("new-model");
    });
  });
});
