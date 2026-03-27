import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Minimal Markdown renderer (no external deps) ─────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold, code, links
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="font-mono text-[0.85em] bg-muted/60 px-1 py-0.5 rounded text-primary/90">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("[")) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return <a key={i} href={match[2]} className="text-primary hover:underline" target={match[2].startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{match[1]}</a>;
      }
    }
    return part;
  });
}

interface TableRow {
  cells: string[];
}

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "bash";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join("\n");
      nodes.push(
        <div key={i} className="relative my-4">
          <pre className={`text-xs font-mono bg-muted/40 rounded-md p-4 pr-10 overflow-x-auto text-muted-foreground leading-relaxed lang-${lang}`}>
            {code}
          </pre>
          <CopyButton text={code} />
          {lang && lang !== "text" && (
            <span className="absolute top-2 left-3 text-[10px] text-muted-foreground/40 font-mono uppercase">{lang}</span>
          )}
        </div>
      );
      i++;
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      const rows = tableLines
        .filter((l) => !l.match(/^\|[-| :]+\|$/))
        .map((l) => ({ cells: l.split("|").slice(1, -1).map((c) => c.trim()) } as TableRow));

      if (rows.length > 0) {
        nodes.push(
          <div key={i} className="my-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {rows[0].cells.map((cell, ci) => (
                    <th key={ci} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-border/40 hover:bg-muted/20">
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 text-xs text-muted-foreground">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j;
        continue;
      }
    }

    // Headings
    const h1 = line.match(/^# (.+)/);
    if (h1) { nodes.push(<h1 key={i} className="font-mono text-xl font-semibold text-foreground mt-8 mb-3 first:mt-0">{renderInline(h1[1])}</h1>); i++; continue; }

    const h2 = line.match(/^## (.+)/);
    if (h2) { nodes.push(<h2 key={i} className="font-mono text-base font-semibold text-foreground mt-6 mb-2 border-b border-border/50 pb-1">{renderInline(h2[1])}</h2>); i++; continue; }

    const h3 = line.match(/^### (.+)/);
    if (h3) { nodes.push(<h3 key={i} className="font-mono text-sm font-semibold text-foreground mt-5 mb-2">{renderInline(h3[1])}</h3>); i++; continue; }

    // Horizontal rule
    if (line.match(/^---+$/)) { nodes.push(<hr key={i} className="border-border/50 my-6" />); i++; continue; }

    // Unordered list item
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} className="text-sm text-muted-foreground">{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={i} className="list-disc list-inside space-y-1 my-3 pl-2">{items}</ul>);
      continue;
    }

    // Empty line
    if (line.trim() === "") { i++; continue; }

    // Paragraph
    nodes.push(<p key={i} className="text-sm text-muted-foreground leading-relaxed my-2">{renderInline(line)}</p>);
    i++;
  }

  return nodes;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsAgentsPage() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/agents.md")
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="max-w-3xl space-y-2">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Agent Setup Guide</h1>
          <p className="text-metric-sm text-muted-foreground mt-1">
            Structured guide for AI agents to configure numbrs for users via the REST API.
          </p>
        </div>
        <a
          href="/agents.md"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
        >
          agents.md <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Failed to load agents.md. Make sure the file exists at /public/agents.md.
        </div>
      )}

      {!content && !error && (
        <div className="flex items-center justify-center h-40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {content && (
        <div className={cn("prose-none")}>
          {renderMarkdown(content)}
        </div>
      )}
    </div>
  );
}
