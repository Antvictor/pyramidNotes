declare module '@/pages/db/db.js' {
  interface FullTextSearchResult {
    id: string;
    name: string;
    content: string;
  }

  interface Table {
    insert(data: Record<string, unknown>): Promise<unknown>;
    select(whereClause?: string, orderBy?: string, limit?: string): Promise<unknown[]>;
    update(where: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown>;
    delete(where: Record<string, unknown>): Promise<unknown>;
    search(keyword: string): Promise<FullTextSearchResult[]>;
  }

  interface Database {
    notes: Table;
  }

  const db: Database;
  export default db;
}
