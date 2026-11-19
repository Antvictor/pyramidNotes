import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "./Settings";
import { renderWithLanguage } from "@/i18n/test-utils";

describe("Settings plugins", () => {
  beforeEach(() => {
    window.api = {
      getSettings: vi.fn().mockResolvedValue({
        theme: "system",
        storagePath: "",
        autoUpdate: true,
        language: "system",
        plugins: { tasks: true },
      }),
      saveSettings: vi.fn().mockResolvedValue(true),
      selectDirectory: vi.fn(),
      getVersion: vi.fn().mockReturnValue("1.0.0"),
    };
  });

  it("renders the plugin section and toggles the tasks plugin off", async () => {
    const user = userEvent.setup();
    await renderWithLanguage(<Settings />, "en");

    expect(await screen.findByText("Plugins")).toBeInTheDocument();
    expect(screen.getByText("Task list")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^disabled$/i }));

    expect(window.api.saveSettings).toHaveBeenCalledWith({ plugins: { tasks: false } });
  });
});
