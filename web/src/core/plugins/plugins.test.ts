import { describe, expect, it } from "vitest";
import { isPluginEnabled, type PluginDescriptor } from "./types";

function descriptor(
  origin: "official" | "user",
  defaultEnabled: boolean,
): PluginDescriptor {
  return {
    id: "tasks",
    origin,
    manifest: {
      id: "tasks",
      version: "1.0.0",
      apiVersion: 1,
      main: "main.mjs",
      styles: [],
      defaultEnabled,
    },
    status: "ok",
  };
}

describe("isPluginEnabled", () => {
  it("uses manifest defaultEnabled for official plugins when no toggle exists", () => {
    expect(isPluginEnabled(descriptor("official", true))).toBe(true);
    expect(isPluginEnabled(descriptor("official", false))).toBe(false);
    expect(isPluginEnabled(descriptor("official", true), {})).toBe(true);
  });

  it("always disables user plugins unless explicitly enabled", () => {
    expect(isPluginEnabled(descriptor("user", true))).toBe(false);
    expect(isPluginEnabled(descriptor("user", true), {})).toBe(false);
    expect(isPluginEnabled(descriptor("user", false))).toBe(false);
  });

  it("lets an explicit toggle win for both origins", () => {
    expect(isPluginEnabled(descriptor("official", true), { tasks: false })).toBe(false);
    expect(isPluginEnabled(descriptor("official", false), { tasks: true })).toBe(true);
    expect(isPluginEnabled(descriptor("user", false), { tasks: true })).toBe(true);
    expect(isPluginEnabled(descriptor("user", true), { tasks: false })).toBe(false);
  });
});
