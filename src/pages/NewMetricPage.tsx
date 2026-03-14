import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { createMetric } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewMetricPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    unit: "",
    value_type: "float",
    is_public: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await createMetric({ ...form, user_id: user.id });
      toast.success(`Metric "${form.name}" created`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to create metric");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      key: prev.key || value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    }));
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-metric-lg text-foreground">New Metric</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-card">
        <div className="space-y-2">
          <Label className="text-metric-sm">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Relay Latency"
            required
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-metric-sm">Key</Label>
          <Input
            value={form.key}
            onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
            placeholder="relay_latency_ms"
            required
            pattern="[a-z0-9_]+"
            className="bg-background font-mono"
          />
          <p className="text-metric-sm text-muted-foreground">Lowercase, underscores only. Used in API calls.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-metric-sm">Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="ms"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-metric-sm">Value Type</Label>
            <select
              value={form.value_type}
              onChange={(e) => setForm((p) => ({ ...p, value_type: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-metric-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="float">Float</option>
              <option value="int">Integer</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-metric-sm">Description</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Round-trip latency to the relay in milliseconds"
            className="bg-background"
          />
        </div>

        <label className="flex items-center gap-2 text-metric-sm text-foreground">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))}
            className="rounded border-border"
          />
          Make this metric publicly viewable
        </label>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Metric"}
        </Button>
      </form>
    </div>
  );
}
