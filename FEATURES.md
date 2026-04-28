# Creative Intelligence Dashboard - Features

## Overview

The Creative Intelligence Dashboard is an elegant, polished web application that connects Meta Ads performance data with manual concept tagging, AI-driven insights, and automated weekly digests to empower creative teams to identify and scale winning creative patterns.

## Core Features

### 1. Meta Ads Integration
- **Live Performance Data**: Pull campaigns, ad sets, and ads from connected Meta ad account
- **Performance Metrics**: Display Spend, ROAS, CPA, Impressions, Reach, Link Clicks, and CPM for each ad
- **Account Management**: Support for multiple Meta ad accounts with account-level filtering

### 2. Creative Library
- **Card-Based Layout**: Display each ad with thumbnail/creative preview, ad name, and caption text
- **Live Metrics**: Show real-time performance metrics on each creative card
- **Creative Management**: Organize and browse all ads in a searchable, filterable grid

### 3. Manual Concept Tagging
- **Four Label Types**: Tag each ad with Concept, Persona, Hook, and Format labels
- **Inline Editing**: Edit tags directly from creative cards with instant save
- **Tag Persistence**: All tags stored in database and synced across the team
- **Tag Suggestions**: Autocomplete suggestions from previously used tags

### 4. Performance Dashboard
- **KPI Summary Cards**: Display Total Spend, Average ROAS, and Average CPA
- **Concept Leaderboard**: Show top-performing concepts ranked by ROAS and CPA
- **Date Range Filtering**: Preset (7d, 30d, 90d, YTD) and custom date range selectors
- **Real-Time Updates**: All metrics update based on selected date range

### 5. Concept Analytics View
- **Aggregation by Tag**: Performance metrics grouped by Concept, Hook, Format, and Persona
- **Interactive Charts**: Visualize ROAS vs CPA trends for each tag type
- **Comparative Analysis**: Compare performance across different creative dimensions
- **Export Functionality**: Download analytics data for further analysis

### 6. Feedback Loop Panel
- **Winning Concepts Section**: Display top 3 performing concepts by ROAS with scaling recommendations
- **Needs Review Section**: Highlight underperforming concepts with diagnostic insights
- **Actionable Recommendations**: Specific next steps for each concept (Scale, Iterate, Pause)
- **Feedback Submission**: Allow team members to add comments and feedback on concepts

### 7. AI-Generated Insights
- **LLM Analysis**: Automatically analyze top and bottom performing ads using Claude
- **Actionable Recommendations**: Generate written insights with specific next steps
- **Insight Storage**: Store all insights in database with timestamp for historical tracking
- **Insight Display**: View insights organized by performance tier (Top Performers, Underperformers)

### 8. Weekly Email Digest
- **Automated Generation**: Generate weekly digest with top concepts, budget allocation, and underperformers
- **Email Template**: Beautiful, formatted email with key metrics and recommendations
- **Owner Notification**: Send digest to marketing lead/owner automatically
- **Digest History**: View all previous digests and resend if needed

### 9. Role-Based Access
- **Media Buyer**: View performance data, analyze metrics, make budget decisions
- **Creative Strategist**: Tag concepts, provide feedback, guide creative direction
- **Designer/Video Editor**: See what works, understand winning patterns, create variations
- **Founder/Admin**: Full access to all features and settings

### 10. Design & Polish
- **Elegant UI**: Refined, polished interface with premium aesthetics
- **Consistent Typography**: Professional font hierarchy and spacing
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Support**: Full dark theme support with consistent colors
- **Micro-Interactions**: Smooth transitions, hover effects, and loading states

## Technical Architecture

### Backend (tRPC + Express)
- **Meta Router**: Procedures for fetching ads, managing creative tags, retrieving concept summaries
- **Insights Router**: LLM integration for generating and retrieving AI insights
- **Digest Router**: Weekly digest generation and email sending
- **Analytics Router**: Aggregation queries for concept, hook, format, and persona analytics
- **Database**: MySQL with Drizzle ORM for type-safe queries

### Frontend (React + Tailwind)
- **Dashboard Layout**: Sidebar navigation with persistent user context
- **Pages**:
  - Dashboard: Overview with KPIs and creative library
  - Analytics: Concept, hook, format, and persona performance analysis
  - Feedback Loop: Winning concepts and needs review sections
  - Insights: AI-generated insights and recommendations
  - Digests: Weekly digest history and configuration
- **Components**: Reusable UI components with shadcn/ui

### Database Schema
- **ads_performance**: Meta Ads metrics for each ad
- **creative_library**: Creative assets with manual tags
- **concept_summary**: Aggregated performance by concept
- **ai_insights**: LLM-generated insights and recommendations
- **weekly_digests**: Historical weekly digest records
- **users**: Team member profiles with roles

## Key Metrics & KPIs

### Performance Metrics
- **ROAS (Return on Ad Spend)**: Revenue generated per dollar spent
- **CPA (Cost Per Acquisition)**: Average cost to acquire one customer
- **Impressions**: Number of times ad was displayed
- **Reach**: Number of unique users who saw the ad
- **Link Clicks**: Number of clicks on ad link
- **CPM (Cost Per Thousand Impressions)**: Cost to reach 1,000 people

### Success Metrics
- **% Ads with Concept Tag**: Target > 95% (ensures all ads are categorized)
- **Creative Duplication Rate**: Target 50% reduction (less wasted effort)
- **Time to Feedback**: Target < 24 hours (faster iteration)
- **% Budget on Winning Concepts**: Target > 70% (efficient allocation)

## Integration Points

### Meta Ads MCP Connector
- Fetch live campaign, ad set, and ad data
- Pull performance metrics and insights
- Support for multiple ad accounts
- Real-time data synchronization

### LLM Integration (Claude)
- Analyze top and bottom performing concepts
- Generate actionable recommendations
- Provide strategic guidance for creative teams
- Store insights for historical analysis

### Email Service
- Send weekly digests to marketing lead
- HTML email templates with metrics
- Automatic scheduling and delivery

## Getting Started

### Prerequisites
- Meta Ads account with API access
- Manus OAuth credentials
- MySQL database

### Setup
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables (see `.env.example`)
4. Run migrations: `pnpm db:push`
5. Start dev server: `pnpm dev`

### Configuration
- Set up Meta Ads MCP connector in settings
- Configure email recipient for weekly digests
- Customize date range presets if needed

## Future Enhancements

- Multi-platform support (TikTok, Instagram, YouTube)
- AI auto-tagging for faster creative categorization
- Predictive analytics for budget optimization
- A/B testing framework integration
- Collaborative feedback system
- Custom report generation
- API for third-party integrations

## Support

For issues or feature requests, please contact the development team or submit feedback through the app.
