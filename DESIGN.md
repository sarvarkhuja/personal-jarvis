---
version: alpha
name: Personal Jarvis
description: A personal tracking dashboard with instrument-like typography and quiet monochrome surfaces.
colors:
  primary: "#000000"
  background: "#F5F5F5"
  surface: "#FFFFFF"
  surface-raised: "#F0F0F0"
  text-primary: "#1A1A1A"
  text-secondary: "#666666"
  border: "#E8E8E8"
  accent: "#D71921"
typography:
  sans:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
  mono:
    fontFamily: "Space Mono, ui-monospace, monospace"
  display:
    fontFamily: "Doto, monospace"
rounded:
  DEFAULT: "0.625rem"
spacing:
  page-inset: "1rem"
  card-padding: "1.5rem"
components:
  button: {}
  sheet: {}
  loading: {}
---

# Personal Jarvis design context

## Overview

Jarvis is an English-language personal dashboard for everyday tracking: habits, focus, goals, medication, expenses, workouts, and prayer. The established reference is a compact instrument panel: monospaced captions, dotted numerical displays, restrained red accents, and bordered cards. This performance work preserves that identity and existing interactions.

The runtime token source is `src/app/globals.css`. Its CSS variables feed Tailwind v4 through `@theme inline`, then shared components under `src/components/ui`. This document mirrors that source; it does not generate CSS. No market-specific or Japanese-localization requirements are established by the current repository.

## Colors

The frontmatter records the light palette from `:root`. The `.dark` theme maps the same roles to black background, `#111111` surfaces, `#E8E8E8` primary text, and `#999999` secondary text. Components consume semantic roles instead of copying literal colors. Red is an action/status accent; routine loading uses secondary text.

## Typography

`src/app/(app)/layout.tsx` loads Space Grotesk for body text, Space Mono for utility captions and numeric detail, and Doto for selected display numbers. Use existing type roles and tracking. Loading feedback follows the existing small monospaced caption treatment.

## Layout

Shared navigation remains in place during route transitions. Page content follows the current 1rem mobile inset and room for the fixed mobile menu trigger; wider dashboards increase their inset at the existing `md` breakpoint. Cards use the established border, surface, and spacing utilities. Images reserve aspect ratio before loading.

## Elevation & Depth

Cards use tonal surfaces and borders. Elevation belongs to overlays through the shared Sheet/Dialog primitive. Avoid adding a route-transition overlay that covers usable navigation.

## Shapes

The base radius is `--radius: 0.625rem`; Tailwind radius aliases are derived in the global stylesheet. Reuse existing control/container treatment rather than introducing a new radius scale.

## Components

`src/components/ui/sheet.tsx` owns overlays, accessible titles, focus management, and close behavior. Goal creation uses the same Sheet shell for top-level goals and sub-goals. Form controllers mount with the portal content rather than for every closed trigger. Save remains pending until the server responds; errors preserve entered values in the open form.

`src/components/layout/PageLoading.tsx` owns the generic route loading treatment. It announces “Loading page…” in a reserved content region while leaving navigation interactive. The loader rotates only when reduced motion is not requested. Existing route-specific skeletons remain valid when they describe the destination geometry.

`src/app/(app)/error.tsx` owns route-level recovery. It shows concise error text without backend details and offers a Try again action using Next.js segment retry.

Native labeled date/select controls and React Hook Form plus Zod remain the existing owners of the goal form's input and validation behavior. This task does not introduce a separate form or notification system.

## Do's and Don'ts

- Reuse semantic runtime tokens and shared overlay primitives.
- Keep route feedback lightweight and accessible; preserve the navigation shell.
- Reserve image geometry and defer offscreen photos.
- Preserve existing action labels and server-confirmed save behavior.
- Avoid adding animation delays or decorative transitions to routine navigation.
