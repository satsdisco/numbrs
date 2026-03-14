import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiSnippetProps {
  code: string;
  language?: string;
}

export default function ApiSnippet({ code, language = "bash" }: ApiSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-metric-sm text-muted-foreground">{language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 gap-1 px-2 text-metric-sm">
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-metric-sm leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
