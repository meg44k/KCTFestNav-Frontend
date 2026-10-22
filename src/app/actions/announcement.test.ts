import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/client")>()),
  apiFetch,
}));

import { DEFAULT_ANNOUNCEMENT } from "@/lib/live-schedule";
import { currentAnnouncement } from "./announcement";

beforeEach(() => {
  apiFetch.mockReset();
});

describe("currentAnnouncement(帯に流すお知らせ)", () => {
  it("お知らせがあればそれを返す(毎回読み直す)", async () => {
    apiFetch.mockResolvedValue({ content: "14時から大抽選会！" });
    expect(await currentAnnouncement()).toBe("14時から大抽選会！");
    expect(apiFetch).toHaveBeenCalledWith("/announcements", {
      cache: "no-store",
    });
  });

  it("空や、読めないときは決まりの文", async () => {
    apiFetch.mockResolvedValue({ content: " " });
    expect(await currentAnnouncement()).toBe(DEFAULT_ANNOUNCEMENT);
    apiFetch.mockRejectedValue(new Error("down"));
    expect(await currentAnnouncement()).toBe(DEFAULT_ANNOUNCEMENT);
  });
});
