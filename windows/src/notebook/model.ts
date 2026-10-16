export interface Rule { id: string; from: string; to: string }
export interface Snippet { id: string; trigger: string; text: string }
export interface Dictionary { words: string[]; replacements: Rule[]; snippets: Snippet[] }
export interface Note { id: string; title: string; text: string; summary: string; updatedAt: number; revision: number; status: string; error: string; language?: string }
export interface Notebook { dictionary: Dictionary; notes: Note[] }

/** Human-editable rules, one per line. Split once so text can itself contain =>. */
export function parseDictionary(words: string, replacements: string, snippets: string): Dictionary {
  const lines = (text: string) => text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const pairs = (text: string) => lines(text).map((line, i) => {
    const split = line.indexOf("=>");
    if (split < 1 || !line.slice(split + 2).trim()) throw new Error(`Строка ${i + 1}: используйте «фраза => замена».`);
    return { id: `${Date.now()}-${i}`, from: line.slice(0, split).trim(), to: line.slice(split + 2).trim() };
  });
  return { words: lines(words), replacements: pairs(replacements), snippets: pairs(snippets).map(r => ({ id: r.id, trigger: r.from, text: r.to.replace(/\\n/g, "\n") })) };
}
export function noteMarkdown(n: Note): string {
  return `# ${n.title}\n\n${new Date(n.updatedAt).toLocaleString("ru-RU")}\n\n## Текст\n\n${n.text}\n\n${n.summary ? `## Итог AI — проверьте факты\n\n${n.summary}\n` : ""}`;
}
