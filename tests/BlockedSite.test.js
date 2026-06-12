import { BlockedSite } from "../shared/BlockedSite.js";

describe("BlockedSite.from", () => {
  test("crea desde string con defaults", () => {
    const s = BlockedSite.from("reddit.com");
    expect(s.domain).toBe("reddit.com");
    expect(s.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(s.timerMinutes).toBe(0);
  });

  test("crea desde objeto parcial", () => {
    const s = BlockedSite.from({ domain: "twitter.com", days: [1, 2, 3] });
    expect(s.domain).toBe("twitter.com");
    expect(s.days).toEqual([1, 2, 3]);
    expect(s.timerMinutes).toBe(0);
  });

  test("crea desde objeto completo", () => {
    const s = BlockedSite.from({ domain: "fb.com", days: [0], timerMinutes: 30 });
    expect(s.timerMinutes).toBe(30);
  });

  test("normaliza www del dominio", () => {
    const s = BlockedSite.from("www.reddit.com");
    expect(s.domain).toBe("reddit.com");
  });
});

describe("BlockedSite.toJSON", () => {
  test("serializa correctamente", () => {
    const s = new BlockedSite({ domain: "reddit.com", days: [1, 2], timerMinutes: 15 });
    expect(s.toJSON()).toEqual({ domain: "reddit.com", days: [1, 2], timerMinutes: 15, exceptions: [] });
  });

  test("round-trip from -> toJSON", () => {
    const orig = { domain: "twitter.com", days: [0, 6], timerMinutes: 5, exceptions: [] };
    expect(BlockedSite.from(orig).toJSON()).toEqual(orig);
  });
});

describe("BlockedSite.matches", () => {
  const s = BlockedSite.from("reddit.com");

  test("dominio exacto", () => expect(s.matches("reddit.com")).toBe(true));
  test("con www", () => expect(s.matches("www.reddit.com")).toBe(true));
  test("subdominio", () => expect(s.matches("old.reddit.com")).toBe(true));
  test("otro dominio", () => expect(s.matches("twitter.com")).toBe(false));
  test("dominio con sufijo similar", () => expect(s.matches("myreddit.com")).toBe(false));
});

describe("BlockedSite.isActiveToday", () => {
  test("retorna true si hoy está en days", () => {
    const s = new BlockedSite({ domain: "x.com", days: [0, 1, 2, 3, 4, 5, 6] });
    expect(s.isActiveToday()).toBe(true);
  });

  test("retorna false si hoy no está en days", () => {
    const s = new BlockedSite({ domain: "x.com", days: [] });
    expect(s.isActiveToday()).toBe(false);
  });
});

describe("BlockedSite.shouldAutoStart", () => {
  const today = new Date().toISOString().slice(0, 10);

  test("retorna true si timerMinutes > 0 y no se usó hoy", () => {
    const s = new BlockedSite({ domain: "x.com", days: [], timerMinutes: 30 });
    expect(s.shouldAutoStart({}, today)).toBe(true);
  });

  test("retorna false si ya se usó hoy", () => {
    const s = new BlockedSite({ domain: "x.com", days: [], timerMinutes: 30 });
    expect(s.shouldAutoStart({ "x.com": today }, today)).toBe(false);
  });

  test("retorna false si timerMinutes es 0", () => {
    const s = new BlockedSite({ domain: "x.com", days: [], timerMinutes: 0 });
    expect(s.shouldAutoStart({}, today)).toBe(false);
  });

  test("retorna true si la fecha guardada es de ayer", () => {
    const s = new BlockedSite({ domain: "x.com", days: [], timerMinutes: 10 });
    expect(s.shouldAutoStart({ "x.com": "2000-01-01" }, today)).toBe(true);
  });
});

describe("BlockedSite.findMatch", () => {
  const sites = [
    BlockedSite.from("reddit.com"),
    BlockedSite.from("twitter.com"),
  ];

  test("encuentra por dominio exacto", () => {
    expect(BlockedSite.findMatch("reddit.com", sites)?.domain).toBe("reddit.com");
  });

  test("encuentra por subdominio", () => {
    expect(BlockedSite.findMatch("old.reddit.com", sites)?.domain).toBe("reddit.com");
  });

  test("retorna null si no hay match", () => {
    expect(BlockedSite.findMatch("github.com", sites)).toBeNull();
  });

  test("normaliza www al buscar", () => {
    expect(BlockedSite.findMatch("www.twitter.com", sites)?.domain).toBe("twitter.com");
  });
});
