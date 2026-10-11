import "./setup";
import { describe, expect, it } from "vitest";
import {
  filterConversations,
  groupConversations,
  groupLabel,
  generateConversationTitle,
} from "@/lib/conversations";
import type { Conversation } from "@/types/assistant";

const now = new Date("2026-10-09T12:00:00").getTime();
const DAY = 86_400_000;
const conv = (id: string, title: string, updatedAt: number, text = ""): Conversation => ({
  id,
  title,
  updatedAt,
  messages: text ? [{ id: id + "m", role: "user", content: text, createdAt: updatedAt }] : [],
});

describe("groupLabel", () => {
  it("groups by day buckets", () => {
    expect(groupLabel(now - 1000, now)).toBe("Today");
    expect(groupLabel(now - DAY, now)).toBe("Yesterday");
    expect(groupLabel(now - 4 * DAY, now)).toBe("Previous 7 days");
    expect(groupLabel(now - 30 * DAY, now)).toBe("Older");
  });
  it("omits empty groups and sorts newest first", () => {
    const g = groupConversations(
      [conv("a", "A", now - 30 * DAY), conv("b", "B", now - 10), conv("c", "C", now)],
      now,
    );
    expect(g.map((x) => x.label)).toEqual(["Today", "Older"]);
    expect(g[0]!.items.map((c) => c.id)).toEqual(["c", "b"]);
  });
});

describe("filterConversations", () => {
  const list = [conv("a", "Retention loops", now), conv("b", "Pricing", now, "usage-based tiers")];
  it("matches titles case-insensitively", () => {
    expect(filterConversations(list, "RETENTION").map((c) => c.id)).toEqual(["a"]);
  });
  it("matches message content", () => {
    expect(filterConversations(list, "usage-based").map((c) => c.id)).toEqual(["b"]);
  });
  it("returns all for empty query", () => {
    expect(filterConversations(list, "  ")).toHaveLength(2);
  });
});

describe("generateConversationTitle", () => {
  it("strips conversational prefixes and creates concise meaningful titles", () => {
    expect(generateConversationTitle("Can you please explain how to improve user retention?")).toBe(
      "Improve User Retention",
    );
    expect(generateConversationTitle("What is product market fit?")).toBe("Product Market Fit");
    expect(generateConversationTitle("How do we calculate net revenue retention?")).toBe(
      "Calculate Net Revenue Retention",
    );
    expect(generateConversationTitle("Tell me about pricing strategy for B2B SaaS")).toBe(
      "Pricing Strategy For B2B SaaS",
    );
  });

  it("handles empty or whitespace prompts safely", () => {
    expect(generateConversationTitle("")).toBe("New Chat");
    expect(generateConversationTitle("   ")).toBe("New Chat");
  });
});
