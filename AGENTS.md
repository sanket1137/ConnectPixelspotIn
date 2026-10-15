# UI/UX Constraints for Pixelspot AdTech Platform

## 1. Web Stack (Next.js & Tailwind CSS)
- **Design System:** Use strictly `shadcn/ui` components and Radix primitives. Do not write custom CSS or inline styles.
- **Aesthetic:** Aim for a modern, high-contrast SaaS aesthetic (similar to Stripe or Vercel). Use plenty of negative space.
- **Interactions:** Use `framer-motion` for micro-interactions (e.g., hover states on DOOH inventory cards, smooth transitions for the screen-filtering map).
- **Colors:** Use CSS variables in Tailwind (`bg-background`, `text-foreground`). Never hardcode hex values in the components.
- **Responsiveness:** All layouts must be mobile-first. The slot booking data tables must gracefully collapse into card views on mobile screens.

## 2. Android Stack (Kotlin & Jetpack Compose)
- **Design System:** Strictly adhere to Material Design 3 (MD3) guidelines using Jetpack Compose.
- **State Management:** UIs must observe state via Kotlin StateFlow. Never mutate UI state directly inside a composable.
- **Animations:** Use `AnimatedVisibility` for rendering loading states and transitions when fetching screen availability data.
- **Theme:** Hook all colors and typography to the `MaterialTheme` object. No hardcoded `Color(0xFF...)` values.