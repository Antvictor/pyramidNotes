import { useCallback, useRef, useState } from "react";

import {
  type BuiltInEdge,
  useReactFlow,
  type Node,
} from "@xyflow/react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import db from "@/pages/db/db.js";
import { useTranslation } from "react-i18next";

// 节点搜索结果（轻量，无需完整 ReactFlow Node）
export interface NodeSearchResult {
  id: string;
  name: string;
}

// 全文搜索结果类型
export interface FullTextSearchResult {
  id: string;
  name: string;
  content: string;
  snippets: string;
}

function filterByScope<T extends { id: string }>(
  list: T[],
  scopeNodeIds?: Set<string>,
): T[] {
  return scopeNodeIds ? list.filter((r) => scopeNodeIds.has(r.id)) : list;
}

export interface NodeSearchProps {
  className?: string;
  // 若提供，两个 Tab 的搜索结果都只保留这些 id 对应的节点（聚焦模式子树过滤）
  scopeNodeIds?: Set<string>;
  // 节点名搜索；默认走 SQL searchByName 查全量
  onSearch?: (
    searchString: string,
  ) => NodeSearchResult[] | Promise<NodeSearchResult[]> | undefined;
  // 选中回调，接收轻量结果
  onSelectNode?: (result: NodeSearchResult) => void | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export function NodeSearchInternal({
  onSearch,
  onSelectNode,
  open,
  onOpenChange,
  scopeNodeIds,
}: NodeSearchProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"node" | "fulltext">("node");
  const [searchResults, setSearchResults] = useState<NodeSearchResult[]>([]);
  const [fullTextSearchResults, setFullTextSearchResults] = useState<FullTextSearchResult[]>([]);
  const [searchString, setSearchString] = useState<string>("");
  const { getNodes, fitView, setNodes } = useReactFlow<Node<BuiltInEdge>, BuiltInEdge>();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestSeqRef = useRef(0);

  const defaultOnSearch = useCallback(
    async (keyword: string): Promise<NodeSearchResult[]> => {
      const rows = (await db.notes.searchByName(keyword)) ?? [];
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
    [],
  );

  // 全文搜索
  const fullTextSearch = useCallback(
    async (keyword: string, seq: number) => {
      try {
        const results = await db.notes.search(keyword);
        if (seq === requestSeqRef.current) {
          setFullTextSearchResults(filterByScope((results || []) as FullTextSearchResult[], scopeNodeIds));
        }
      } catch (error) {
        console.error("Full text search error:", error);
        if (seq === requestSeqRef.current) setFullTextSearchResults([]);
      }
    },
    [scopeNodeIds],
  );

  const runSearch = useCallback(
    (keyword: string, tab: "node" | "fulltext") => {
      const seq = ++requestSeqRef.current;
      if (tab === "node") {
        Promise.resolve((onSearch || defaultOnSearch)(keyword))
          .then((res) => {
            if (seq === requestSeqRef.current) {
              setSearchResults(filterByScope(res ?? [], scopeNodeIds));
            }
          })
          .catch(() => {
            if (seq === requestSeqRef.current) setSearchResults([]);
          });
      } else {
        fullTextSearch(keyword, seq);
      }
    },
    [onSearch, defaultOnSearch, fullTextSearch, scopeNodeIds],
  );

  const onChange = useCallback(
    (value: string) => {
      setSearchString(value);
      const kw = value.trim();
      if (!kw) {
        requestSeqRef.current++;
        setSearchResults([]);
        setFullTextSearchResults([]);
        return;
      }
      onOpenChange?.(true);
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => runSearch(kw, activeTab), 300);
    },
    [runSearch, activeTab, onOpenChange],
  );

  // 切换 tab 后，如果有搜索词，重新执行对应类型的搜索
  const onTabChange = useCallback(
    (value: "node" | "fulltext") => {
      setActiveTab(value);
      const kw = searchString.trim();
      if (kw) runSearch(kw, value);
    },
    [searchString, runSearch],
  );

  const defaultOnSelectNode = useCallback(
    (result: NodeSearchResult) => {
      const node = getNodes().find((n) => n.id === result.id);
      if (!node) return;
      setNodes((nodes) =>
        nodes.map((n) => (n.id === node.id ? { ...n, selected: true } : n)),
      );
      fitView({ nodes: [node], duration: 500 });
    },
    [getNodes, fitView, setNodes],
  );

  const onSelect = useCallback(
    (result: NodeSearchResult) => {
      (onSelectNode || defaultOnSelectNode)?.(result);
      setSearchString("");
      onOpenChange?.(false);
    },
    [onSelectNode, defaultOnSelectNode, onOpenChange],
  );

  // 处理全文搜索结果的选择
  const onSelectFullTextResult = useCallback(
    (result: FullTextSearchResult) => {
      (onSelectNode || defaultOnSelectNode)?.({ id: result.id, name: result.name });
      setSearchString("");
      onOpenChange?.(false);
    },
    [onSelectNode, defaultOnSelectNode, onOpenChange],
  );

  return (
    <>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full border-0">
        <TabsList className="grid grid-cols-2 bg-background border p-0 rounded-md">
          <TabsTrigger value="node">{t("search.tabs.node")}</TabsTrigger>
          <TabsTrigger value="fulltext">{t("search.tabs.fullText")}</TabsTrigger>
        </TabsList>

        <TabsContent value="node" className="mt-2">
          <CommandInput
            placeholder={t("search.placeholders.node")}
            onValueChange={onChange}
            value={searchString}
            onFocus={() => onOpenChange?.(true)}
          />

          {open && (
            <CommandList>
              {!searchResults.length ? (
                <CommandEmpty>{t("search.noResults", { query: searchString })}</CommandEmpty>
              ) : (
                <CommandGroup heading={t("search.groups.nodes")}>
                  {searchResults.map((node) => {
                    return (
                      <CommandItem
                        key={node.id}
                        value={node.name}
                        onSelect={() => onSelect(node)}
                      >
                        <span>{node.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </TabsContent>

        <TabsContent value="fulltext" className="mt-2">
          <CommandInput
            placeholder={t("search.placeholders.fullText")}
            onValueChange={onChange}
            value={searchString}
            onFocus={() => onOpenChange?.(true)}
          />

          {open && (
            <CommandList>
              {!fullTextSearchResults.length ? (
                <CommandEmpty>{t("search.noResults", { query: searchString })}</CommandEmpty>
              ) : (
                <CommandGroup heading={t("search.groups.fullText")}>
                  {fullTextSearchResults.map((result) => {
                    const displayValue = result.name || result.id || t("search.unnamedNode");
                    return (
                      <CommandItem
                        key={result.id}
                        value={result.id}
                        keywords={[result.name, result.content]}
                        onSelect={() => onSelectFullTextResult(result)}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{displayValue}</span>
                          <span dangerouslySetInnerHTML={{ __html: result.snippets }} />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

export function NodeSearch({
  onSearch,
  onSelectNode,
  scopeNodeIds,
}: NodeSearchProps) {
  const [open, setOpen] = useState(false);
  return (
    <Command
      shouldFilter={false}
      className="rounded-lg border shadow-md md:min-w-[450px]"
    >
      <NodeSearchInternal
        onSearch={onSearch}
        onSelectNode={onSelectNode}
        scopeNodeIds={scopeNodeIds}
        open={open}
        onOpenChange={setOpen}
      />
    </Command>
  );
}

export interface NodeSearchDialogProps {
  onSearch?: (
    searchString: string,
  ) => NodeSearchResult[] | Promise<NodeSearchResult[]> | undefined;
  onSelectNode?: (result: NodeSearchResult) => void | undefined;
  scopeNodeIds?: Set<string> | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  title?: string;
}

export function NodeSearchDialog({
  onSearch,
  onSelectNode,
  scopeNodeIds,
  open,
  onOpenChange,
}: NodeSearchDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false}>
      <NodeSearchInternal
        onSearch={onSearch}
        onSelectNode={onSelectNode}
        scopeNodeIds={scopeNodeIds}
        open={open}
        onOpenChange={onOpenChange}
      />
    </CommandDialog>
  );
}
