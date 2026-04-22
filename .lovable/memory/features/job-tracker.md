---
name: Job Tracker
description: Smart job application pipeline with URL auto-extraction, drag-drop kanban, and live stats
type: feature
---

## Pipeline stages (in order)
Bookmarked → Applied → Follow-up Sent → Screening → Technical Round → HR Round → Final Round → Offer → Rejected

## Auto follow-up days by stage
Applied: 3, Follow-up Sent: 5, Screening: 4, Technical Round: 2, HR Round: 3, Final Round: 3, Offer: 2

## URL extraction
Edge function `extract-job` (verify_jwt=false) fetches the page server-side and parses:
- JSON-LD `JobPosting` schema first (most reliable)
- og:title / og:site_name meta fallback
- Text heuristics for location (Remote/Hybrid/Onsite), job type, salary
- Domain-based company fallback (handles Workday, Greenhouse, Lever, Ashby URL patterns)

## Urgency indicator
Only shown for Applied / Follow-up Sent. Days since applied_date:
- < 3 days: green dot
- 3-7 days: amber dot
- > 7 days: red dot

## Stats
Total Applied, Active Pipeline (not Offer/Rejected), Response Rate (% past Follow-up), Avg Days to Reply (from status_history), Interviews this week.

## DB columns added
url, location, job_type, salary, stage, rejection_reason, status_history (jsonb array of {stage, at}).
Old `status` column kept in sync for backward compatibility.

## Drag-drop
Uses @dnd-kit. Dragging to Rejected opens reason dialog (Ghosted, Not a fit, Withdrew, Position closed, Other).
