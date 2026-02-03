import { describe, expect, test } from "bun:test";
import { iconMap } from "@/help/format";

describe("iconMap", () => {
  describe("PR status icons", () => {
    test("should return correct icon for draft", () => {
      expect(iconMap("draft")).toBe("📋");
    });

    test("should return correct icon for open", () => {
      expect(iconMap("open")).toBe("💚");
    });

    test("should return correct icon for closed", () => {
      expect(iconMap("closed")).toBe("🔴");
    });

    test("should return correct icon for merged", () => {
      expect(iconMap("merged")).toBe("💫");
    });

    test("should return correct icon for inReview", () => {
      expect(iconMap("inReview")).toBe("💚");
    });
  });

  describe("Linear status icons", () => {
    test("should return correct icon for unstarted", () => {
      expect(iconMap("unstarted")).toBe("🌟");
    });

    test("should return correct icon for started", () => {
      expect(iconMap("started")).toBe("🌊");
    });

    test("should return correct icon for completed", () => {
      expect(iconMap("completed")).toBe("🎯");
    });

    test("should return correct icon for canceled", () => {
      expect(iconMap("canceled")).toBe("🚫");
    });

    test("should return correct icon for backlog", () => {
      expect(iconMap("backlog")).toBe("📎");
    });

    test("should return correct icon for triage", () => {
      expect(iconMap("triage")).toBe("🔍");
    });
  });

  describe("Vercel status icons", () => {
    test("should return correct icon for vercel_ready", () => {
      expect(iconMap("vercel_ready")).toBe("✨");
    });

    test("should return correct icon for vercel_error", () => {
      expect(iconMap("vercel_error")).toBe("💥");
    });

    test("should return correct icon for vercel_building", () => {
      expect(iconMap("vercel_building")).toBe("🔨");
    });

    test("should return correct icon for vercel_queued", () => {
      expect(iconMap("vercel_queued")).toBe("⏳");
    });
  });

  describe("Mihomo icons", () => {
    test("should return correct icon for mihomo_rule", () => {
      expect(iconMap("mihomo_rule")).toBe("🔍");
    });

    test("should return correct icon for mihomo_direct", () => {
      expect(iconMap("mihomo_direct")).toBe("🚫");
    });

    test("should return correct icon for mihomo_global", () => {
      expect(iconMap("mihomo_global")).toBe("🌍");
    });

    test("should return correct icon for mihomo_delay_good", () => {
      expect(iconMap("mihomo_delay_good")).toBe("🟢");
    });

    test("should return correct icon for mihomo_delay_normal", () => {
      expect(iconMap("mihomo_delay_normal")).toBe("🟡");
    });

    test("should return correct icon for mihomo_delay_bad", () => {
      expect(iconMap("mihomo_delay_bad")).toBe("🔴");
    });
  });
});
