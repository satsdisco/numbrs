import { useEffect, useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpenAPISpec {
  info: { title: string; description: string; version: string };
  tags: { name: string; description: string }[];
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema> };
}

interface Operation {
  tags: string[];
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: { required?: boolean; content: Record<string, { schema: Schema; examples?: Record<string, { summary: string; value: unknown }> }> };
  responses: Record<string, { description: string; content?: Record<string, { schema: Schema; example?: unknown }> }>;
}

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  schema: Schema;
  description?: string;
}

interface Schema {
  type?: string;
  $ref?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  description?: string;
  example?: unknown;
  enum?: string[];
  nullable?: boolean;
  allOf?: Schema[];
  oneOf?: Schema[];
  default?: unknown;
  format?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  get:    "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  post:   "bg-green-500/20 text-green-400 border border-green-500/30",
  patch:  "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  delete: "bg-red-500/20 text-red-400 border border-red-500/30",
  put:    "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

function buildCurl(method: string, path: string, op: Operation): string {
  const url = `https://numbrs.lol${path}`;
  const lines = [`curl -X ${method.toUpperCase()} "${url}" \\`, `  -H "X-API-KEY: your-api-key"`];
  if (op.requestBody) {
    lines.push(`  -H "Content-Type: application/json" \\`);
    const content = op.requestBody.content?.["application/json"];
    const examples = content?.examples;
    const ex = examples ? Object.values(examples)[0]?.value : content?.schema?.example;
    if (ex) {
      lines.push(`  -d '${JSON.stringify(ex, null, 2)}'`);
    } else {
      lines.push(`  -d '{}'`);
    }
  }
  return lines.join(" \\\n");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative">
      <pre className={`text-xs font-mono bg-muted/40 rounded-md p-3 pr-8 overflow-x-auto text-muted-foreground leading-relaxed lang-${language}`}>
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function SchemaPreview({ schema, schemas }: { schema: Schema; schemas: Record<string, Schema> }) {
  const resolve = (s: Schema): Schema => {
    if (s.$ref) {
      const name = s.$ref.split("/").pop()!;
      return schemas[name] ?? s;
    }
    return s;
  };

  const resolved = resolve(schema);
  if (!resolved.properties) return null;

  return (
    <div className="space-y-1">
      {Object.entries(resolved.properties).map(([key, val]) => {
        const r = resolve(val);
        const required = resolved.required?.includes(key);
        return (
          <div key={key} className="flex items-start gap-2 text-xs font-mono py-0.5">
            <span className={cn("text-primary font-medium", !required && "opacity-70")}>{key}</span>
            {required && <span className="text-red-400 text-[10px]">*</span>}
            <span className="text-muted-foreground">
              {r.type ?? (r.$ref ? r.$ref.split("/").pop() : "object")}
              {r.enum && ` (${r.enum.join(" | ")})`}
              {r.nullable && "?"}
            </span>
            {r.description && <span className="text-muted-foreground/60">— {r.description}</span>}
          </div>
        );
      })}
    </div>
  );
}

function EndpointCard({
  method,
  path,
  op,
  schemas,
}: {
  method: string;
  path: string;
  op: Operation;
  schemas: Record<string, Schema>;
}) {
  const [open, setOpen] = useState(false);
  const curl = buildCurl(method, path, op);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <span className={cn("text-[11px] font-bold font-mono uppercase px-2 py-0.5 rounded shrink-0", METHOD_COLORS[method] ?? "bg-muted text-foreground")}>
          {method}
        </span>
        <code className="text-sm font-mono text-foreground flex-1">{path}</code>
        <span className="text-sm text-muted-foreground hidden sm:block">{op.summary}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-5 bg-card/50">
          {op.description && (
            <p className="text-sm text-muted-foreground">{op.description}</p>
          )}

          {op.parameters && op.parameters.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Path Parameters</p>
              <div className="space-y-1">
                {op.parameters.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-primary">{p.name}</span>
                    {p.required && <span className="text-red-400">*</span>}
                    <span className="text-muted-foreground">{p.schema.type ?? p.schema.format}</span>
                    {p.description && <span className="text-muted-foreground/60">— {p.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {op.requestBody && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Request Body</p>
              {(() => {
                const content = op.requestBody.content?.["application/json"];
                if (!content) return null;
                return (
                  <div className="space-y-3">
                    <SchemaPreview schema={content.schema} schemas={schemas} />
                    {content.examples && (
                      <div className="space-y-2">
                        {Object.entries(content.examples).map(([k, ex]) => (
                          <div key={k}>
                            <p className="text-[11px] text-muted-foreground/60 mb-1">{ex.summary}</p>
                            <CodeBlock code={JSON.stringify(ex.value, null, 2)} language="json" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Responses</p>
            <div className="space-y-1.5">
              {Object.entries(op.responses).map(([code, res]) => (
                <div key={code} className="flex items-start gap-2 text-xs">
                  <span className={cn(
                    "font-mono font-bold shrink-0",
                    code.startsWith("2") ? "text-green-400" :
                    code.startsWith("4") ? "text-yellow-400" : "text-red-400"
                  )}>{code}</span>
                  <span className="text-muted-foreground">{res.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Example</p>
            <CodeBlock code={curl} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsApiPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("/openapi.json")
      .then((r) => r.json())
      .then((data) => {
        setSpec(data);
        setActiveTag(data.tags?.[0]?.name ?? null);
      })
      .catch(console.error);
  }, []);

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Group endpoints by tag
  const byTag: Record<string, { method: string; path: string; op: Operation }[]> = {};
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const tag = (op as Operation).tags?.[0] ?? "Other";
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push({ method, path, op: op as Operation });
    }
  }

  const schemas = spec.components?.schemas ?? {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">API Reference</h1>
          <p className="text-metric-sm text-muted-foreground mt-1">{spec.info.description}</p>
        </div>
        <a
          href="/openapi.json"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
        >
          openapi.json <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Auth banner */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1.5">
        <p className="text-sm font-medium text-foreground">Authentication</p>
        <p className="text-xs text-muted-foreground">All endpoints require an <code className="font-mono bg-muted/50 px-1 rounded">X-API-KEY</code> header. Create keys at <a href="/api-keys" className="text-primary hover:underline">/api-keys</a>.</p>
        <CodeBlock code={`curl https://numbrs.lol/api/me \\\n  -H "X-API-KEY: your-api-key-here"`} />
      </div>

      {/* Tag nav */}
      <div className="flex flex-wrap gap-2">
        {spec.tags.map((tag) => (
          <button
            key={tag.name}
            onClick={() => setActiveTag(tag.name)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-md transition-colors border",
              activeTag === tag.name
                ? "bg-primary/20 text-primary border-primary/40"
                : "text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Endpoints */}
      {spec.tags
        .filter((tag) => !activeTag || tag.name === activeTag)
        .map((tag) => {
          const endpoints = byTag[tag.name] ?? [];
          if (!endpoints.length) return null;
          return (
            <section key={tag.name} className="space-y-3">
              <div>
                <h2 className="font-mono font-semibold text-foreground">{tag.name}</h2>
                {tag.description && <p className="text-xs text-muted-foreground mt-0.5">{tag.description}</p>}
              </div>
              <div className="space-y-2">
                {endpoints.map(({ method, path, op }) => (
                  <EndpointCard
                    key={`${method}-${path}`}
                    method={method}
                    path={path}
                    op={op}
                    schemas={schemas}
                  />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
