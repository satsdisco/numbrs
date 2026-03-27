import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ThemePreset {
  id: string;
  name: string;
  swatch: string; // CSS color string for preview swatch
  primaryHsl: string; // e.g. "263.4 70% 50.4%"
  chartHsl: [string, string, string, string, string, string]; // chart-1 through chart-6
  accentPrimary: string; // RGB components, e.g. "124 58 237"
  accentSecondary: string;
  accentMuted: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "purple-haze",
    name: "Purple Haze",
    swatch: "hsl(263.4, 70%, 50.4%)",
    primaryHsl: "263.4 70% 50.4%",
    chartHsl: [
      "263.4 70% 50.4%",
      "197 71% 52%",
      "142 71% 45.3%",
      "38 92% 50%",
      "0 62.8% 50.6%",
      "315 80% 60%",
    ],
    accentPrimary: "124 58 237",
    accentSecondary: "109 40 217",
    accentMuted: "76 29 149",
  },
  {
    id: "bitcoin-orange",
    name: "Bitcoin Orange",
    swatch: "hsl(32, 95%, 50%)",
    primaryHsl: "32 95% 50%",
    chartHsl: [
      "32 95% 50%",
      "45 90% 55%",
      "15 80% 55%",
      "60 80% 50%",
      "270 60% 60%",
      "195 70% 50%",
    ],
    accentPrimary: "247 141 7",
    accentSecondary: "220 120 5",
    accentMuted: "157 80 3",
  },
  {
    id: "matrix-green",
    name: "Matrix Green",
    swatch: "hsl(120, 100%, 40%)",
    primaryHsl: "120 100% 40%",
    chartHsl: [
      "120 100% 40%",
      "150 90% 45%",
      "90 100% 45%",
      "180 80% 45%",
      "60 100% 50%",
      "30 70% 50%",
    ],
    accentPrimary: "0 204 0",
    accentSecondary: "0 175 0",
    accentMuted: "0 102 0",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    swatch: "hsl(214, 90%, 55%)",
    primaryHsl: "214 90% 55%",
    chartHsl: [
      "214 90% 55%",
      "197 80% 52%",
      "240 70% 65%",
      "180 70% 50%",
      "170 80% 45%",
      "260 70% 65%",
    ],
    accentPrimary: "28 114 222",
    accentSecondary: "22 95 190",
    accentMuted: "15 65 135",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    swatch: "hsl(0, 0%, 65%)",
    primaryHsl: "0 0% 65%",
    chartHsl: [
      "0 0% 80%",
      "0 0% 65%",
      "0 0% 50%",
      "0 0% 35%",
      "0 0% 20%",
      "0 0% 90%",
    ],
    accentPrimary: "166 166 166",
    accentSecondary: "140 140 140",
    accentMuted: "90 90 90",
  },
  {
    id: "sunset",
    name: "Sunset",
    swatch: "hsl(20, 95%, 58%)",
    primaryHsl: "20 95% 58%",
    chartHsl: [
      "20 95% 58%",
      "350 85% 60%",
      "40 90% 55%",
      "5 80% 55%",
      "330 80% 65%",
      "55 85% 55%",
    ],
    accentPrimary: "245 115 27",
    accentSecondary: "215 95 22",
    accentMuted: "150 65 15",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    swatch: "hsl(315, 90%, 58%)",
    primaryHsl: "315 90% 58%",
    chartHsl: [
      "315 90% 58%",
      "280 85% 60%",
      "190 100% 50%",
      "60 100% 55%",
      "350 90% 55%",
      "150 100% 45%",
    ],
    accentPrimary: "240 30 186",
    accentSecondary: "210 25 163",
    accentMuted: "140 16 109",
  },
  {
    id: "arctic",
    name: "Arctic",
    swatch: "hsl(195, 80%, 65%)",
    primaryHsl: "195 80% 65%",
    chartHsl: [
      "195 80% 65%",
      "210 70% 60%",
      "175 70% 58%",
      "225 65% 65%",
      "240 60% 70%",
      "160 55% 58%",
    ],
    accentPrimary: "97 210 234",
    accentSecondary: "80 185 210",
    accentMuted: "50 135 158",
  },
];

const THEME_STORAGE_KEY = "numbrs-theme-preset";

interface ThemeContextValue {
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  savePreset: (preset: ThemePreset) => Promise<void>;
  saving: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  preset: THEME_PRESETS[0],
  setPreset: () => {},
  savePreset: async () => {},
  saving: false,
});

function applyPreset(preset: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--primary", preset.primaryHsl);
  root.style.setProperty("--ring", preset.primaryHsl);
  root.style.setProperty("--sidebar-primary", preset.primaryHsl);
  root.style.setProperty("--sidebar-ring", preset.primaryHsl);
  preset.chartHsl.forEach((hsl, i) => {
    root.style.setProperty(`--chart-${i + 1}`, hsl);
  });
  root.style.setProperty("--accent-primary", preset.accentPrimary);
  root.style.setProperty("--accent-secondary", preset.accentSecondary);
  root.style.setProperty("--accent-muted", preset.accentMuted);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preset, setPresetState] = useState<ThemePreset>(() => {
    const savedId = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PRESETS.find((p) => p.id === savedId) ?? THEME_PRESETS[0];
  });
  const [saving, setSaving] = useState(false);

  // Apply CSS variables whenever the preset changes
  useEffect(() => {
    applyPreset(preset);
  }, [preset]);

  // Load persisted preset from Supabase when user is available
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings" as any)
      .select("theme_preset")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { theme_preset?: string } | null }) => {
        if (data?.theme_preset) {
          const found = THEME_PRESETS.find((p) => p.id === data.theme_preset);
          if (found) {
            setPresetState(found);
            localStorage.setItem(THEME_STORAGE_KEY, found.id);
          }
        }
      });
  }, [user?.id]);

  const setPreset = (p: ThemePreset) => {
    setPresetState(p);
    localStorage.setItem(THEME_STORAGE_KEY, p.id);
  };

  const savePreset = async (p: ThemePreset) => {
    setPreset(p);
    if (!user) return;
    setSaving(true);
    try {
      await (supabase as any)
        .from("user_settings")
        .upsert({ user_id: user.id, theme_preset: p.id }, { onConflict: "user_id" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeContext.Provider value={{ preset, setPreset, savePreset, saving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Read a CSS custom property from the document root at render time. */
export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
