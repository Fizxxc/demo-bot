# Kograph UI Design System

## Design Name
**Asphalt Design System**

## Core Principles
1. **Clean control surface** — use white / blue surfaces with subtle depth.
2. **Operational clarity** — dashboard feels like a control room, not a noisy landing page.
3. **Consistent spacing** — rounded cards, compact sections, and visible hierarchy.
4. **Mobile-first navigation** — desktop uses sidebar, mobile uses bottom navigation.
5. **Mascot-assisted UX** — each major page uses a mascot pose that matches the page purpose.

## Color Tokens
- Primary: `#0756c9`
- Primary Bright: `#2f8cff`
- Surface: `#ffffff`
- Surface Soft: `#eef5ff`
- Background: `#f7fbff`
- Ink: `#102341`
- Muted: `#64748b`
- Border: `#dbe8ff`
- Success: `#0f9f6e`
- Warning: `#d99000`
- Danger: `#e63d55`

## Layout Rules
- Desktop shell: fixed left sidebar + main content.
- Mobile shell: hide sidebar, show bottom nav.
- Page header always uses eyebrow + title + short supporting text.
- Cards use 20–28px radius with soft shadow.
- Prefer 2-column grids on desktop and 1-column on mobile.

## Mascot Mapping
- Dashboard: `support-laptop.webp`
- Products / stock flow: `products-run-box.webp`
- Terminal / bot runtime: `celebrate-jump.webp`
- Profile: `profile-thumbs-up.webp`
- Owner / explanation pages: `presenter-point.webp`
- Support / welcome: `wave-hello.webp`

## UI Components
- `card`
- `stat`
- `badge`
- `pill`
- `bottom-nav`
- `mascot-card`
- `progress-shell`
- `terminal-card`
- `chat-card`

## Do
- Keep the palette blue / white.
- Use soft gradients only as accents.
- Keep CTA buttons primary blue.
- Keep chat layout sender right, receiver left.
- Keep terminal dark for contrast.

## Avoid
- Random colors outside the design token set.
- Changing component radius inconsistently.
- Replacing mobile bottom nav with top nav.
- Removing mascot placements without replacing their contextual purpose.
