import type { Config } from 'tailwindcss'

/**
 * The tokens live in `assets/css/tokens.css` as custom properties and are
 * mirrored here so Tailwind emits utilities for them. Two consequences:
 *
 * - Colours resolve to `var(...)`, so the opacity modifier (`text-ink-primary/50`)
 *   does not work. Use a token that already carries the alpha it needs.
 * - `--accent-object` is rewritten per object at runtime by `app.vue`, so every
 *   `accent` utility re-tints itself on each object swap with no extra work.
 *
 * `borderRadius`, `transitionDuration` and `transitionTimingFunction` deliberately
 * shadow the stock Tailwind scales. Perigee has its own scale, and one vocabulary
 * is easier to hold than two.
 */
export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/**/*.{vue,js,ts}',
  ],
  theme: {
    extend: {
      // The max-width queries the layout was designed against, as named
      // variants, so a template can carry its own responsive behaviour.
      screens: {
        'lt-lg': { max: '1100px' },
        'lt-md': { max: '900px' },
        'lt-sm': { max: '640px' },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          tertiary: 'var(--ink-tertiary)',
          quiet: 'var(--ink-quiet)',
        },
        surface: {
          void: 'var(--surface-void)',
          glass: 'var(--surface-glass)',
          'glass-strong': 'var(--surface-glass-strong)',
          raised: 'var(--surface-raised)',
          'raised-hover': 'var(--surface-raised-hover)',
        },
        hairline: {
          DEFAULT: 'var(--hairline)',
          strong: 'var(--hairline-strong)',
        },
        accent: 'var(--accent-object)',
        warning: 'var(--warning)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        rail: 'var(--shadow-rail)',
      },
      transitionDuration: {
        fast: 'var(--speed-fast)',
        base: 'var(--speed-base)',
        slow: 'var(--speed-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      // The interface's stacking order, named. Mirrors `--z-*` in tokens.css.
      zIndex: {
        canvas: '0',
        scrim: '1',
        locator: '2',
        identity: '3',
        header: '4',
        rail: '5',
        encounter: '6',
        loading: '7',
        fallback: '8',
        notice: '9',
      },
      // Shorthands only. The `@keyframes` themselves are in
      // `assets/css/animations.css`, because three of them are driven by an
      // ancestor state class rather than a class in a template, and Tailwind
      // only emits keyframes for an animation some template names.
      animation: {
        approach: 'approach 1.9s var(--ease-in-out) infinite',
        'orbit-turn': 'orbit-turn 1.2s linear infinite',
      },
    },
  },
}
