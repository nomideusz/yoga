/**
 * Theme presets for timeline components.
 *
 * Each preset is a CSS inline-style string of --dt-* custom properties.
 * Pass to the `theme` prop of any timeline component.
 *
 * Presets:
 *   auto     — Transparent: inherit --dt-* from the host page (recommended default)
 *   neutral  — Explicit light theme: white bg, blue accent, works standalone
 *   midnight — Explicit dark theme: charcoal bg, red accent
 */
/**
 * Auto — triggers the smart auto-theme engine.
 *
 * When passed to Calendar's `theme` prop, the component will probe the host
 * page at mount time (background, fonts, accent color, light/dark mode)
 * and generate matching --dt-* CSS tokens automatically.
 *
 * Reactively watches for host theme changes (e.g. dark-mode toggle).
 *
 * If you want passive inheritance only (no probing), pass `autoTheme={false}`
 * alongside `theme={auto}`.
 */
export declare const auto = "";
/**
 * Neutral — explicit light theme. White bg, blue accent, inherits host fonts.
 * Use when embedding standalone without ancestor --dt-* vars.
 */
export declare const neutral = "\n\t--dt-stage-bg: #ffffff;\n\t--dt-bg: #ffffff;\n\t--dt-surface: #f9fafb;\n\t--dt-border: rgba(0, 0, 0, 0.08);\n\t--dt-border-day: rgba(0, 0, 0, 0.14);\n\t--dt-text: rgba(0, 0, 0, 0.87);\n\t--dt-text-2: rgba(0, 0, 0, 0.54);\n\t--dt-text-3: rgba(0, 0, 0, 0.38);\n\t--dt-accent: #2563eb;\n\t--dt-accent-dim: rgba(37, 99, 235, 0.12);\n\t--dt-glow: rgba(37, 99, 235, 0.25);\n\t--dt-today-bg: rgba(37, 99, 235, 0.04);\n\t--dt-btn-text: #fff;\n\t--dt-scrollbar: rgba(0, 0, 0, 0.1);\n\t--dt-success: rgba(22, 163, 74, 0.7);\n\t--dt-serif: inherit;\n\t--dt-sans: inherit;\n\t--dt-mono: ui-monospace, 'SFMono-Regular', monospace;\n";
/** Midnight Industrial — dark charcoal + red accent, tech monitoring */
export declare const midnight = "\n\t--dt-stage-bg: #080a0f;\n\t--dt-bg: #0b0e14;\n\t--dt-surface: #10141c;\n\t--dt-border: rgba(148, 163, 184, 0.07);\n\t--dt-border-day: rgba(148, 163, 184, 0.14);\n\t--dt-text: rgba(226, 232, 240, 0.85);\n\t--dt-text-2: rgba(148, 163, 184, 0.55);\n\t--dt-text-3: rgba(100, 116, 139, 0.55);\n\t--dt-accent: #ef4444;\n\t--dt-accent-dim: rgba(239, 68, 68, 0.18);\n\t--dt-glow: rgba(239, 68, 68, 0.35);\n\t--dt-today-bg: rgba(239, 68, 68, 0.02);\n\t--dt-btn-text: #fff;\n\t--dt-scrollbar: rgba(148, 163, 184, 0.12);\n\t--dt-success: rgba(74, 222, 128, 0.7);\n\t--dt-serif: Georgia, 'Times New Roman', serif;\n";
/** All available presets keyed by name */
export declare const presets: {
    readonly auto: "";
    readonly neutral: "\n\t--dt-stage-bg: #ffffff;\n\t--dt-bg: #ffffff;\n\t--dt-surface: #f9fafb;\n\t--dt-border: rgba(0, 0, 0, 0.08);\n\t--dt-border-day: rgba(0, 0, 0, 0.14);\n\t--dt-text: rgba(0, 0, 0, 0.87);\n\t--dt-text-2: rgba(0, 0, 0, 0.54);\n\t--dt-text-3: rgba(0, 0, 0, 0.38);\n\t--dt-accent: #2563eb;\n\t--dt-accent-dim: rgba(37, 99, 235, 0.12);\n\t--dt-glow: rgba(37, 99, 235, 0.25);\n\t--dt-today-bg: rgba(37, 99, 235, 0.04);\n\t--dt-btn-text: #fff;\n\t--dt-scrollbar: rgba(0, 0, 0, 0.1);\n\t--dt-success: rgba(22, 163, 74, 0.7);\n\t--dt-serif: inherit;\n\t--dt-sans: inherit;\n\t--dt-mono: ui-monospace, 'SFMono-Regular', monospace;\n";
    readonly midnight: "\n\t--dt-stage-bg: #080a0f;\n\t--dt-bg: #0b0e14;\n\t--dt-surface: #10141c;\n\t--dt-border: rgba(148, 163, 184, 0.07);\n\t--dt-border-day: rgba(148, 163, 184, 0.14);\n\t--dt-text: rgba(226, 232, 240, 0.85);\n\t--dt-text-2: rgba(148, 163, 184, 0.55);\n\t--dt-text-3: rgba(100, 116, 139, 0.55);\n\t--dt-accent: #ef4444;\n\t--dt-accent-dim: rgba(239, 68, 68, 0.18);\n\t--dt-glow: rgba(239, 68, 68, 0.35);\n\t--dt-today-bg: rgba(239, 68, 68, 0.02);\n\t--dt-btn-text: #fff;\n\t--dt-scrollbar: rgba(148, 163, 184, 0.12);\n\t--dt-success: rgba(74, 222, 128, 0.7);\n\t--dt-serif: Georgia, 'Times New Roman', serif;\n";
};
export type PresetName = keyof typeof presets;
