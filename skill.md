# Kograph UI Skill Guide

This file acts as a guardrail so future updates keep the UI consistent.

## 1. Navigation Skill
- Desktop navigation stays in the sidebar.
- Mobile navigation stays in the fixed bottom navbar.
- Main merchant tabs should remain:
  - Dashboard
  - Terminal
  - Products
  - Wallet
  - Support
  - Profile

## 2. Component Skill
When building a new page, compose the page using:
- `topbar`
- `card`
- `stat`
- `grid`
- `badge` or `pill`
- `mascot-card` for hero/supportive visual

## 3. Typography Skill
- Titles should be short, direct, and operational.
- Supporting copy should explain the feature in one or two lines.
- Avoid long paragraphs in dashboard surfaces.

## 4. Profile Skill
The profile page should always preserve:
- account overview
- password change
- notification preferences
- wallet / e-wallet status
- quick help links

## 5. Mascot Skill
Always match mascot pose to page context:
- explaining = presenter
- helping/chat = wave or laptop support
- success/runtime = celebrate
- profile/trust = thumbs up
- delivery/product flow = running with box

## 6. Responsive Skill
Every new page must:
- stack to one column on mobile,
- keep tap targets large,
- preserve card spacing,
- avoid horizontal overflow,
- respect the bottom-nav safe area.

## 7. Safe Update Rules
Before changing the UI:
1. reuse existing design tokens,
2. keep white-blue palette,
3. maintain rounded card language,
4. do not remove bottom nav on mobile,
5. keep terminal and chat visual identity distinct.
