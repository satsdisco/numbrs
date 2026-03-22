import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Share2, Copy, Check, Code, Globe, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardName: string;
  isPublic: boolean;
  shareToken: string | null;
  onTogglePublic: (isPublic: boolean) => void;
}

export default function ShareDialog({
  open,
  onClose,
  dashboardId,
  dashboardName,
  isPublic,
  shareToken,
  onTogglePublic,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  const embedCode = shareUrl
    ? `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" style="border-radius:8px;"></iframe>`
    : null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <Globe className={cn("h-5 w-5", isPublic ? "text-success" : "text-muted-foreground")} />
              <div>
                <div className="text-sm font-medium text-foreground">Public access</div>
                <div className="text-xs text-muted-foreground">
                  {isPublic ? "Anyone with the link can view" : "Only you can view"}
                </div>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={onTogglePublic} />
          </div>

          {isPublic && shareUrl && (
            <>
              {/* Share link */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" /> Share Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(shareUrl, "Link")}
                    className="shrink-0 gap-1.5"
                  >
                    {copied === "Link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Embed code */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Code className="h-3 w-3" /> Embed Code
                </label>
                <div className="flex gap-2">
                  <Input
                    value={embedCode!}
                    readOnly
                    className="font-mono text-[10px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(embedCode!, "Embed")}
                    className="shrink-0 gap-1.5"
                  >
                    {copied === "Embed" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
