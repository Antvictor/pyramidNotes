import { useCallback, useState } from "react";

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

// 全文搜索结果类型
export interface FullTextSearchResult {
  id: string;
  name: string;
  content: string;
  snippets: string;
}

export interface NodeSearchProps {
  className?: string;
  // The function to search for nodes, should return an array of nodes that match the search string
  // By default, it will check for lowercase string inclusion.
  onSearch?: (searchString: string) => Node<BuiltInEdge>[] | undefined;
  // The function to select a node, should set the node as selected and fit the view to the node
  // By default, it will set the node as selected and fit the view to the node.
  onSelectNode?: (node: Node<BuiltInEdge>) => void | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export function NodeSearchInternal({
  onSearch,
  onSelectNode,
  open,
  onOpenChange,
}: NodeSearchProps) {
  const [activeTab, setActiveTab] = useState<"node" | "fulltext">("node");
  const [searchResults, setSearchResults] = useState<Node<BuiltInEdge>[]>([]);
  const [fullTextSearchResults, setFullTextSearchResults] = useState<FullTextSearchResult[]>([]);
  const [searchString, setSearchString] = useState<string>("");
  const { getNodes, fitView, setNodes } = useReactFlow<Node<BuiltInEdge>, BuiltInEdge>();

  const defaultOnSearch = useCallback(
    (searchString: string) => {
      const nodes = getNodes();
      const results = nodes.filter((node) =>
        (node.data.label as string)
          .toLowerCase()
          .includes(searchString.toLowerCase()),
      );
      return results;
    },
    [getNodes],
  );

  // 全文搜索方法
  const fullTextSearch = useCallback(
    async (keyword: string) => {
      if (!keyword || keyword.trim().length === 0) {
        setFullTextSearchResults([]);
        return;
      }
      try {
        const results = await db.notes.search(keyword.trim());
        setFullTextSearchResults((results || []) as FullTextSearchResult[]);
      } catch (error) {
        console.error("Full text search error:", error);
        setFullTextSearchResults([]);
      }
    },
    [],
  );

  const onChange = useCallback(
    (searchString: string) => {
      setSearchString(searchString);
      if (searchString.length > 0) {
        onOpenChange?.(true);
        // 根据当前激活的 tab 执行不同的搜索
        if (activeTab === "node") {
          const results = (onSearch || defaultOnSearch)(searchString) ?? [];
          setSearchResults(results);
        } else {
          fullTextSearch(searchString);
        }
      } else {
        setSearchResults([]);
        setFullTextSearchResults([]);
      }
    },
    [activeTab, onSearch, defaultOnSearch, fullTextSearch, onOpenChange],
  );

  // 当 tab 切换时，重新执行搜索
  const onTabChange = useCallback(
    (value: "node" | "fulltext") => {
      setActiveTab(value);
      // 切换 tab 后，如果有搜索词，重新执行对应类型的搜索
      if (searchString.length > 0) {
        if (value === "node") {
          const results = (onSearch || defaultOnSearch)(searchString) ?? [];
          setSearchResults(results);
        } else {
          fullTextSearch(searchString);
        }
      }
    },
    [searchString, onSearch, defaultOnSearch, fullTextSearch],
  );

  const defaultOnSelectNode = useCallback(
    (node: Node<BuiltInEdge>) => {
      setNodes((nodes) =>
        nodes.map((n) => (n.id === node.id ? { ...n, selected: true } : n)),
      );
      fitView({ nodes: [node], duration: 500 });
    },
    [fitView, setNodes],
  );

  const onSelect = useCallback(
    (node: Node<BuiltInEdge>) => {
      (onSelectNode || defaultOnSelectNode)?.(node);
      setSearchString("");
      onOpenChange?.(false);
    },
    [onSelectNode, defaultOnSelectNode, onOpenChange],
  );

  // 处理全文搜索结果的选择
  const onSelectFullTextResult = useCallback(
    (result: FullTextSearchResult) => {
      const nodes = getNodes();
      const node = nodes.find((n) => n.id === result.id);
      if (node) {
        (onSelectNode || defaultOnSelectNode)?.(node);
      }
      setSearchString("");
      onOpenChange?.(false);
    },
    [getNodes, onSelectNode, defaultOnSelectNode, onOpenChange],
  );

  return (
    <>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full border-0">
        <TabsList className="grid grid-cols-2 bg-white border border-gray-200 p-0 rounded-md">
          <TabsTrigger  value="node">节点搜索</TabsTrigger>
          <TabsTrigger value="fulltext">全文搜索</TabsTrigger>
        </TabsList>

        <TabsContent value="node" className="mt-2">
          <CommandInput
            placeholder="搜索节点名称..."
            onValueChange={onChange}
            value={searchString}
            onFocus={() => onOpenChange?.(true)}
          />

          {open && (
            <CommandList>
              {!searchResults.length ? (
                <CommandEmpty>未找到结果。{searchString}</CommandEmpty>
              ) : (
                <CommandGroup heading="节点">
                  {searchResults.map((node) => {
                    return (
                      <CommandItem
                        key={node.id}
                        value={node.data.label as string}
                        onSelect={() => onSelect(node)}
                      >
                        <span>{node.data.label as string}</span>
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
            placeholder="搜索节点内容..."
            onValueChange={onChange}
            value={searchString}
            onFocus={() => onOpenChange?.(true)}
          />

          {open && (
            <CommandList>
              {!fullTextSearchResults.length ? (
                <CommandEmpty>未找到结果。{searchString}</CommandEmpty>
              ) : (
                <CommandGroup heading="全文搜索结果">
                  {fullTextSearchResults.map((result) => {
                    const displayValue = result.name || result.id || "未命名节点";
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
        open={open}
        onOpenChange={setOpen}
      />
    </Command>
  );
}

export interface NodeSearchDialogProps {
  onSearch?: (searchString: string) => Node<BuiltInEdge>[] | undefined;
  onSelectNode?: (node: Node<BuiltInEdge>) => void | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  title?: string;
}

export function NodeSearchDialog({
  onSearch,
  onSelectNode,
  open,
  onOpenChange,
}: NodeSearchDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false}>
      <NodeSearchInternal
        onSearch={onSearch}
        onSelectNode={onSelectNode}
        open={open}
        onOpenChange={onOpenChange}
      />
    </CommandDialog>
  );
}
