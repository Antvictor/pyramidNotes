class Table {
    constructor(tableName) {
        this.tableName = tableName;
    }


    async insert(data) {
        const keys = Object.keys(data).join(", ");
        const placeholders = Object.keys(data).map(() => "?").join(", ");
        const values = Object.values(data);
        const sql = `INSERT INTO ${this.tableName} (${keys}) VALUES (${placeholders})`;
        return await window.api.dbQuery(sql, values);
    }

    async select(whereClause = "", orderBy = "", limit = "") {
        let sql = `SELECT * FROM ${this.tableName}`;
        let values = [];
        if (whereClause) {
            const conditions = Object.keys(whereClause)
                .map(k => `${k} = ?`)
                .join(" AND ");

            sql += ` WHERE ${conditions}`;
            values.push(...Object.values(whereClause));
        }
        if (orderBy) sql += ` ORDER BY ${orderBy}`;
        if (limit) sql += ` LIMIT ${limit}`;
        return await window.api.dbQuery(sql, values);
    }

    async update(where, data) {
        const setKeys = Object.keys(data).map(k => `${k} = ?`).join(',');
        const setValues = Object.values(data);

        const whereKeys = Object.keys(where).map(k => `${k} = ?`).join(' AND ');
        const whereValues = Object.values(where);

        const sql = `UPDATE ${this.tableName} SET ${setKeys} WHERE ${whereKeys}`;
        return await window.api.dbQuery(sql, [...setValues, ...whereValues]);
    }

    async delete(where) {
        const whereKeys = Object.keys(where).map(k => `${k} = ?`).join(' AND ');
        const whereValues = Object.values(where);
        const sql = `DELETE FROM ${this.tableName} WHERE ${whereKeys}`;
        return await window.api.dbQuery(sql, whereValues);
    }


    /**
     * 从带 <mark> 标签的内容中提取多个匹配片段
     * @param {string} content - 带<mark>标签的内容
     * @param {number} radius - 每个匹配点前后保留的字符数
     * @param {number} maxSnippetLength - 最大 snippet 长度
     * @returns {Array} snippet 数组
     */
    generateSnippets(html, options = {}) {
        const {
            context = 20,
            maxLength = 200,
            ellipsis = '...'
        } = options;

        if (!html) return '';

        // 1️⃣ 找所有 <mark>...</mark>
        const regex = /<mark>(.*?)<\/mark>/g;
        let match;
        const ranges = [];

        while ((match = regex.exec(html)) !== null) {
            ranges.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }

        if (ranges.length === 0) {
            return html.slice(0, maxLength);
        }

        // 2️⃣ 扩展范围（前后 context）
        const expanded = ranges.map(r => ({
            start: Math.max(0, r.start - context),
            end: Math.min(html.length, r.end + context)
        }));

        // 3️⃣ 合并重叠区间
        expanded.sort((a, b) => a.start - b.start);

        const merged = [];
        for (const cur of expanded) {
            if (!merged.length) {
                merged.push(cur);
            } else {
                const last = merged[merged.length - 1];
                if (cur.start <= last.end) {
                    last.end = Math.max(last.end, cur.end);
                } else {
                    merged.push(cur);
                }
            }
        }

        // 4️⃣ 截取片段并拼接
        let result = '';
        for (const r of merged) {
            let part = html.slice(r.start, r.end);

            if (result.length > 0) {
                result += ellipsis;
            }

            result += part;

            if (result.length >= maxLength) break;
        }

        // 5️⃣ 最终长度裁剪
        if (result.length > maxLength) {
            result = result.slice(0, maxLength);
        }
        console.log('length:', result.length, 'content:', result);
        result = this.fixHtml(result);
        return result;
    }
    fixHtml(html) {
        // 1️⃣ 修复未闭合 <mark>
        const openMarks = (html.match(/<mark>/g) || []).length;
        const closeMarks = (html.match(/<\/mark>/g) || []).length;

        if (openMarks > closeMarks) {
            html += '</mark>';
        }

        // 2️⃣ 去掉被截断的标签（比如 <br / 被截断）
        html = html.replace(/<[^>]*$/, '');

        return html;
    }
    /**
     * 全文搜索 - 基于 FTS5 虚拟表和 libsimple 中文分词
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array>} 搜索结果，包含 id、name、snippets、firstSnippet
     */
    async search(keyword) {
        const sql = `
            SELECT
                n.id,
                n.name,
                simple_highlight(notes_fts, 1, '<mark>', '</mark>') as content
            FROM notes_fts
            JOIN notes n ON notes_fts.id = n.id
            WHERE notes_fts MATCH simple_query(?)
        `;
        console.log('[Search] SQL:', sql);
        console.log('[Search] Keyword:', keyword);
        const result = await window.api.dbQuery(sql, [keyword]);
        console.log('[Search] Raw Result:', JSON.stringify(result, null, 2));

        // 处理返回结果，生成 snippets
        const processedResults = result.map(item => ({
            ...item,
            snippets: this.generateSnippets(item.content, {maxLength: 100})
        }));
        console.log('[Search] Raw Result:', JSON.stringify(processedResults, null, 2));

        return processedResults;
    }
}
class Database {
    constructor(tables = []) {
        for (const tableName of tables) {
            this[tableName] = new Table(tableName);
        }
    }
}

const db = new Database(['notes']);

export default db;