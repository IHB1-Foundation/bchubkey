# BCHubKey Brand Kit

This document defines the visual identity and language standards for BCHubKey.

---

## 1. Logo

**Primary logo:** `src/assets/logo.svg`

Usage:
- Use the logo in dashboard header, screenshots, and submission materials
- Maintain minimum padding of 8px around the logo
- Do not distort proportions or alter colors

---

## 2. Color Palette

### Primary Colors

| Name         | Hex       | CSS Variable          | Usage                          |
|--------------|-----------|----------------------|--------------------------------|
| Deep Navy    | `#1a1a2e` | `--color-primary`    | Headers, primary buttons, text |
| Navy Hover   | `#2a2a4e` | `--color-primary-hover` | Button hover states         |
| Pure White   | `#ffffff` | `--color-background` | Card backgrounds, text on dark |

### Accent Colors

| Name         | Hex       | CSS Variable          | Usage                          |
|--------------|-----------|----------------------|--------------------------------|
| Cyan         | `#8be9fd` | `--color-accent`     | Links, highlights, interactive |
| Cyan Hover   | `#6cd4e8` | `--color-accent-hover` | Link hover states            |

### Semantic Colors (States)

| State   | Background | Text      | CSS Class       | Usage                    |
|---------|------------|-----------|-----------------|--------------------------|
| PASS    | `#d4edda`  | `#155724` | `.badge-pass`   | Verified, access granted |
| FAIL    | `#f8d7da`  | `#721c24` | `.badge-fail`   | Balance insufficient     |
| PENDING | `#fff3cd`  | `#856404` | `.badge-pending`| Awaiting action          |
| ACTIVE  | `#d4edda`  | `#155724` | `.badge-active` | Group is active          |
| PAUSED  | `#e2e3e5`  | `#383d41` | `.badge-paused` | Enforcement paused       |

### Neutral Colors

| Name          | Hex       | Usage                           |
|---------------|-----------|--------------------------------|
| Page BG       | `#f5f5f5` | Page background                |
| Card BG       | `#ffffff` | Cards, containers              |
| Border Light  | `#eee`    | Table borders, dividers        |
| Text Primary  | `#333`    | Body text                      |
| Text Muted    | `#666`    | Labels, secondary text         |
| Text Disabled | `#999`    | Disabled, placeholder          |

---

## 3. Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Monospace (Code/IDs)

```css
font-family: 'SF Mono', Monaco, 'Consolas', monospace;
```

### Scale

| Element       | Size      | Weight | Usage                 |
|--------------|-----------|--------|-----------------------|
| H1           | 1.5rem    | 600    | Page titles           |
| H2           | 1.2rem    | 600    | Card/section titles   |
| Body         | 1rem      | 400    | Default text          |
| Small        | 0.9rem    | 400    | Tables, secondary     |
| Caption      | 0.85rem   | 400    | Labels, timestamps    |
| Badge        | 0.75rem   | 600    | Status badges         |

### Line Height

- Default: `1.5`
- Compact (tables): `1.4`

---

## 4. Terminology Standards

Use these terms consistently across all UI (Telegram bot messages, dashboard, docs).

### Core Concepts

| Concept               | Standard Term           | Avoid                        |
|-----------------------|------------------------|------------------------------|
| Address ownership test| **Ownership Proof**    | Verification proof, auth     |
| Small-amount proof tx | **Micro-transaction**  | Dust tx, test payment        |
| Token balance test    | **Gate Check**         | Token verification, balance check |
| Access control action | **Enforcement**        | Action, penalty              |
| User access state     | **Membership State**   | Status, verification status  |

### State Labels

| Internal State    | Display Label     | Emoji (Optional) |
|-------------------|-------------------|------------------|
| VERIFIED_PASS     | **PASS**          | (none in text)   |
| VERIFIED_FAIL     | **FAIL**          | (none in text)   |
| PENDING_VERIFY    | **PENDING**       | (none in text)   |
| UNKNOWN           | **PENDING**       | (none in text)   |

### Action Labels

| Action            | Standard Label    | Context                     |
|-------------------|-------------------|-----------------------------|
| Restrict user     | **Restrict**      | Remove write permissions    |
| Kick user         | **Remove**        | Ban + unban (rejoin allowed)|
| Grant access      | **Approve**       | JOIN_REQUEST mode           |
| Grant access      | **Unrestrict**    | RESTRICT mode               |

### Telegram Button Labels

| Purpose           | Label             | Notes                       |
|-------------------|-------------------|-----------------------------|
| Proceed           | **Next**          | Move to next step           |
| Go back           | **Back**          | Return to previous step     |
| Refresh data      | **Refresh**       | Reload current state        |
| Cancel flow       | **Cancel**        | Exit current flow           |
| Confirm sending tx| **I've Sent It**  | After micro-tx instruction  |
| Change address    | **Change Address**| Re-enter BCH address        |
| Help              | **Help**          | Show instructions           |

### Message Sections

When formatting Telegram messages, use this structure:

```
*Title*

Brief description paragraph.

*Section Header:*
- Bullet point
- Bullet point

*Next Step:* Clear call to action.
```

---

## 5. UI Patterns

### Cards

- Background: white
- Border radius: 8px
- Padding: 20px
- Shadow: `0 2px 4px rgba(0,0,0,0.1)`

### Buttons

- Padding: 6px 12px
- Border radius: 4px
- Font size: 0.85rem
- Primary: Deep Navy background, white text

### Badges

- Padding: 3px 8px
- Border radius: 4px
- Font size: 0.75rem
- Font weight: 600

### Tables

- Full width
- Header row: `#f9f9f9` background
- Hover row: `#fafafa` background
- Cell padding: 10px

---

## 6. Accessibility Notes

- Maintain minimum contrast ratio 4.5:1 for text
- Never convey information by color alone (use labels + color)
- Links must be distinguishable from regular text (underline on hover)

---

## 7. File Locations

| Asset              | Path                        |
|--------------------|-----------------------------|
| Logo (SVG)         | `src/assets/logo.svg`       |
| Brand Kit (this)   | `docs/BRAND_KIT.md`         |
| Dashboard styles   | `src/admin/templates.ts`    |
