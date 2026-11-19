import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createPluginRuntime,
  type PluginRuntimeInput,
  type PluginRuntimeSnapshot,
} from "./runtime";
import type { PluginDescriptor } from "./types";

export interface PluginsContextValue {
  descriptors: PluginDescriptor[];
  runtimeState: PluginRuntimeSnapshot["states"];
  extensions: PluginRuntimeSnapshot["extensions"];
  ready: boolean;
  warnings: string[];
}

const EMPTY_VALUE: PluginsContextValue = {
  descriptors: [],
  runtimeState: {},
  extensions: [],
  ready: false,
  warnings: [],
};

const PluginsContext = createContext<PluginsContextValue>(EMPTY_VALUE);

export const defaultPluginRuntime = createPluginRuntime({
  listPlugins: () => window.api.listPlugins(),
  readPlugin: (id) => window.api.readPlugin(id),
  doc: typeof document === "undefined" ? undefined : document,
});

interface PluginProviderProps {
  children: ReactNode;
  runtime?: ReturnType<typeof createPluginRuntime>;
}

export function PluginProvider({
  children,
  runtime = defaultPluginRuntime,
}: PluginProviderProps) {
  const [snapshot, setSnapshot] = useState<PluginRuntimeSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async (input: PluginRuntimeInput) => {
      try {
        const result = await runtime.load(input);
        if (!cancelled) setSnapshot(result);
      } catch (error) {
        if (!cancelled) {
          setSnapshot({
            descriptors: [],
            states: {},
            extensions: [],
            warnings: [error instanceof Error ? error.message : String(error)],
          });
        }
      }
    };

    const boot = async () => {
      try {
        const settings = await window.api.getSettings();
        await run({ storagePath: settings.storagePath, plugins: settings.plugins });
      } catch (error) {
        if (!cancelled) {
          setSnapshot({
            descriptors: [],
            states: {},
            extensions: [],
            warnings: [error instanceof Error ? error.message : String(error)],
          });
        }
      }
    };

    void boot();

    const unsubscribe = window.api?.onSettingsChanged?.((settings) => {
      void run({ storagePath: settings.storagePath, plugins: settings.plugins });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [runtime]);

  const value = useMemo<PluginsContextValue>(() => {
    if (!snapshot) return EMPTY_VALUE;
    return {
      descriptors: snapshot.descriptors,
      runtimeState: snapshot.states,
      extensions: snapshot.extensions,
      ready: true,
      warnings: snapshot.warnings,
    };
  }, [snapshot]);

  return <PluginsContext.Provider value={value}>{children}</PluginsContext.Provider>;
}

export function usePlugins(): PluginsContextValue {
  return useContext(PluginsContext);
}
