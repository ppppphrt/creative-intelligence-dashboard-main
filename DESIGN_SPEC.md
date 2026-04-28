# Creative Intelligence Dashboard - Design Specification

## Overview
A premium, elegant web application connecting Meta Ads performance data with creative asset management and AI-driven insights. Designed for Media Buyers, Creative Strategists, Designers, and Founders/Marketing Leads.

## Data Model

### Table 1: ads_performance
| Field | Type | Description |
|-------|------|-------------|
| ad_id | string | Primary key from Meta |
| ad_name | string | Raw ad name |
| campaign_name | string | Campaign identifier |
| spend | number | Amount Spent (THB) |
| impressions | number | Impressions metric |
| clicks | number | Link Clicks (all) |
| purchases | number | Conversion count |
| revenue | number | Revenue generated |
| cpa | number | Calculated: revenue / purchases |
| roas | number | Calculated: revenue / spend |
| date | date | Performance date |
| creative_id | string | Foreign key to creative_library |

### Table 2: creative_library
| Field | Type | Description |
|-------|------|-------------|
| creative_id | string | Primary key |
| ad_id | string | Foreign key to ads_performance |
| creative_url | string | Video/image URL |
| thumbnail_url | string | Preview thumbnail |
| caption | text | Ad copy/caption |
| concept | string | Concept tag (e.g., "Hormonal Acne") |
| persona | string | Target persona |
| hook_type | string | Hook type (shock/story) |
| format | string | Format (UGC/static) |
| status | enum | NEED_TAGGING / READY |
| created_at | timestamp | Creation date |

### Table 3: concept_summary
| Field | Type | Description |
|-------|------|-------------|
| concept | string | Concept name |
| total_spend | number | Aggregated spend |
| avg_roas | number | Average ROAS |
| avg_cpa | number | Average CPA |
| ads_count | number | Number of ads |
| decision | enum | SCALE / ITERATE / KILL |

## Key Metrics (from Meta Ads)
- **Amount Spent**: Direct from Meta Ads API
- **ROAS**: Return on Ad Spend (revenue / spend)
- **CPA**: Cost Per Acquisition (spend / purchases)
- **Impressions**: Total impressions
- **Reach**: Unique Accounts Center accounts reached
- **Link Clicks**: All clicks on ad
- **CPM**: Cost Per 1,000 Impressions

## UI Components

### 1. Creative Library Card
- Thumbnail/preview image
- Ad name
- Caption text (truncated with expand option)
- Live performance metrics badge
- Inline tagging interface (Concept, Persona, Hook, Format)
- Status indicator

### 2. Performance Dashboard
- KPI cards: Total Spend, Avg ROAS, Avg CPA
- Top-performing concepts leaderboard (ranked by ROAS)
- Date range selector (presets + custom)
- Summary insights

### 3. Feedback Loop Panel
- **Winning Concepts** section: Top 3 by ROAS with metrics
- **Needs Review** section: Underperformers flagged for optimization
- Actionable feedback items

### 4. Concept Analytics
- Aggregated metrics by Concept, Hook, Format
- Performance comparison charts
- Trend analysis

## Design Principles
- **Elegant & Polished**: Premium aesthetic, refined typography, sophisticated color palette
- **High Clarity**: Clear information hierarchy, uncluttered layouts
- **Intentional Details**: Every element serves a purpose, micro-interactions enhance UX
- **Responsive**: Mobile-first, works seamlessly across devices
- **Accessible**: WCAG compliance, keyboard navigation, sufficient contrast

## Color & Typography
- Primary palette: Sophisticated neutrals with accent color
- Typography: Clean, modern sans-serif (Google Fonts)
- Spacing: Consistent 8px grid system
- Shadows: Subtle, refined (not harsh)

## Success Metrics (from PRD)
- % Ads with concept tag: > 95%
- Creative duplication rate: Reduced 50%
- Time to feedback (Media → Creative): < 24 hours
- % Budget on winning concepts: > 70%
