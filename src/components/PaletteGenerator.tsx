import { useCallback, useEffect, useState } from "react";
import { Lock, Unlock, Copy, Check, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

type HarmonyMode = "random" | "monochrome" | "analogous" | "complementary";

interface Swatch {
  hex: string;
  locked: boolean;
}

const MODES: { id: HarmonyMode; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "monochrome", label: "Monochrome" },
  { id: "analogous", label: "Analogous" },
  { id: "complementary", label: "Complementary" },
];

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / (max - min) + 2) / 6;
        break;
      case b:
        h = ((r - g) / (max - min) + 4) / 6;
        break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function getLuminance(hex: string): number {
  const [, , l] = hexToHsl(hex);
  return l;
}

function generatePalette(mode: HarmonyMode, current: Swatch[]): Swatch[] {
  const baseHue = Math.floor(Math.random() * 360);

  return current.map((swatch, i) => {
    if (swatch.locked) return swatch;
    let h = baseHue;
    let s = 60 + Math.random() * 30;
    let l = 30 + Math.random() * 50;

    switch (mode) {
      case "monochrome":
        h = baseHue;
        s = 40 + Math.random() * 40;
        l = 20 + i * 15;
        break;
      case "analogous":
        h = (baseHue + i * 25) % 360;
        s = 55 + Math.random() * 30;
        l = 35 + Math.random() * 40;
        break;
      case "complementary":
        h = i % 2 === 0 ? baseHue : (baseHue + 180) % 360;
        s = 55 + Math.random() * 35;
        l = 30 + i * 10;
        break;
      case "random":
      default:
        h = Math.floor(Math.random() * 360);
        break;
    }
    return { hex: hslToHex(h, s, l), locked: false };
  });
}

const initialPalette = (): Swatch[] =>
  generatePalette(
    "analogous",
    Array.from({ length: 5 }, () => ({ hex: "#000000", locked: false })),
  );

const PaletteGenerator = () => {
  const [palette, setPalette] = useState<Swatch[]>(initialPalette);
  const [mode, setMode] = useState<HarmonyMode>("analogous");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const regenerate = useCallback(() => {
    setPalette((p) => generatePalette(mode, p));
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        regenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [regenerate]);

  const toggleLock = (i: number) => {
    setPalette((p) => p.map((s, idx) => (idx === i ? { ...s, locked: !s.locked } : s)));
  };

  const copyHex = async (hex: string, i: number) => {
    await navigator.clipboard.writeText(hex);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  const exportCSS = async () => {
    const css = `:root {\n${palette.map((s, i) => `  --color-${i + 1}: ${s.hex};`).join("\n")}\n}`;
    await navigator.clipboard.writeText(css);
    toast.success("CSS variables copied");
  };

  const exportJSON = async () => {
    const json = JSON.stringify(
      { palette: palette.map((s) => s.hex), mode, generated: new Date().toISOString() },
      null,
      2,
    );
    await navigator.clipboard.writeText(json);
    toast.success("JSON copied");
  };

  return (
    <main className="min-h-screen bg-palette-canvas text-palette-ink flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 pt-8 pb-6 border-b border-palette-rule">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-palette-muted mb-2">
              No. 001 — A Tool for Designers
            </p>
            <h1 className="font-serif text-4xl md:text-6xl font-light leading-none tracking-tight">
              The <em className="italic">Palette</em> Studio
            </h1>
          </div>
          <p className="font-mono text-xs text-palette-muted max-w-xs">
            Press <kbd className="px-1.5 py-0.5 border border-palette-rule rounded">SPACE</kbd> to
            generate. Click a swatch to copy. Lock to keep.
          </p>
        </div>
      </header>

      {/* Controls */}
      <section className="px-6 md:px-12 py-5 border-b border-palette-rule flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                mode === m.id
                  ? "bg-palette-ink text-palette-canvas border-palette-ink"
                  : "border-palette-rule text-palette-ink hover:bg-palette-ink/5"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={regenerate}
            className="font-mono text-xs uppercase tracking-wider px-4 py-1.5 border border-palette-ink bg-palette-ink text-palette-canvas hover:bg-palette-ink/90 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" /> Generate
          </button>
          <button
            onClick={exportCSS}
            className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-palette-rule hover:bg-palette-ink/5 transition-colors flex items-center gap-2"
          >
            <Download className="w-3 h-3" /> CSS
          </button>
          <button
            onClick={exportJSON}
            className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-palette-rule hover:bg-palette-ink/5 transition-colors flex items-center gap-2"
          >
            <Download className="w-3 h-3" /> JSON
          </button>
        </div>
      </section>

      {/* Palette */}
      <section className="flex-1 grid grid-cols-1 md:grid-cols-5 min-h-[60vh]">
        {palette.map((swatch, i) => {
          const isDark = getLuminance(swatch.hex) < 55;
          const fg = isDark ? "#FAF7F2" : "#1A1A1A";
          return (
            <div
              key={i}
              className="relative flex flex-col justify-between p-5 transition-colors duration-300 group"
              style={{ backgroundColor: swatch.hex, color: fg }}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <button
                  onClick={() => toggleLock(i)}
                  aria-label={swatch.locked ? "Unlock color" : "Lock color"}
                  className="p-1.5 rounded-full hover:bg-black/10 transition-colors"
                  style={{ color: fg }}
                >
                  {swatch.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 opacity-60 group-hover:opacity-100" />}
                </button>
              </div>

              <button
                onClick={() => copyHex(swatch.hex, i)}
                className="text-left group/hex"
                aria-label={`Copy ${swatch.hex}`}
              >
                <span className="font-serif text-3xl md:text-4xl font-light tracking-tight block">
                  {swatch.hex}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70 mt-2 inline-flex items-center gap-1.5">
                  {copiedIndex === i ? (
                    <>
                      <Check className="w-3 h-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy hex
                    </>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-4 border-t border-palette-rule flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-palette-muted">
        <span>{palette.filter((s) => s.locked).length} locked / 5</span>
        <span>Mode — {MODES.find((m) => m.id === mode)?.label}</span>
      </footer>
    </main>
  );
};

export default PaletteGenerator;
