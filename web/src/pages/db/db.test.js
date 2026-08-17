import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import db, { escapeLike } from "./db.js";

describe("escapeLike", () => {
  it("escapes LIKE wildcards and backslash", () => {
    expect(escapeLike("100%_ok")).toBe("100\\%\\_ok");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
    expect(escapeLike("plain")).toBe("plain");
  });
});

describe("db.notes.searchByName", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      api: { dbQuery: vi.fn().mockResolvedValue([{ id: "1", name: "root" }]) },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("queries name with escaped wildcards and LIMIT 100", async () => {
    const result = await db.notes.searchByName("x%");
    expect(window.api.dbQuery).toHaveBeenCalledWith(
      "SELECT id, name FROM notes WHERE name LIKE ? ESCAPE '\\' LIMIT 100",
      ["%x\\%%"],
    );
    expect(result).toEqual([{ id: "1", name: "root" }]);
  });
});

describe("db.notes.search", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      api: {
        searchNotes: vi.fn().mockResolvedValue([
          { id: "1", name: "root", content: "hello <mark>world</mark> end" },
        ]),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("calls searchNotes and adds snippets", async () => {
    const result = await db.notes.search("world");
    expect(window.api.searchNotes).toHaveBeenCalledWith("world");
    expect(result[0]).toHaveProperty("snippets");
    expect(result[0].snippets).toContain("<mark>world</mark>");
  });
});
