MVP Architecture & Pipeline Design
Perfect. I now have everything needed to design a system that's automation-first, event-driven, and optimized for attended appointments.


PART 1: System Architecture
Core Data Entities
┌─────────────────────────────────────────────────────────────┐
│                     CONTACT (Patient/Lead)                   │
├─────────────────────────────────────────────────────────────┤
│ • ID (primary key)                                           │
│ • Name, Phone, Email                                         │
│ • Source (first-touch attribution)                           │
│ • Current Pipeline + Stage                                   │
│ • Warmness Score (calculated)                                │
│ • Created timestamp                                          │
│ • Is Existing Patient (boolean)                              │
└─────────────────────────────────────────────────────────────┘
         ↓ has many
┌─────────────────────────────────────────────────────────────┐
│                         TOUCHPOINT                           │
├─────────────────────────────────────────────────────────────┤
│ • ID                                                         │
│ • Contact ID (foreign key)                                   │
│ • Timestamp                                                  │
│ • Type (ad_click, manychat_interaction, sms_sent, etc.)     │
│ • Source/Channel (Meta, ManyChat, SMS, Email)                │
│ • Details (JSON: campaign, message content, response, etc.)  │
│ • Is Attribution Event (boolean)                             │
└─────────────────────────────────────────────────────────────┘
         ↓ related to
┌─────────────────────────────────────────────────────────────┐
│                         BOOKING                              │
├─────────────────────────────────────────────────────────────┤
│ • ID                                                         │
│ • Wix Booking ID (external reference)                        │
│ • Contact ID (foreign key)                                   │
│ • Appointment Date/Time                                      │
│ • Service Type (procedure, follow-up, routine)               │
│ • Urgency Level (high/medium/low)                            │
│ • Status (scheduled, confirmed, cancelled, rescheduled)      │
│ • Outcome (null, attended, no_show)                          │
│ • Payment Status                                             │
│ • First-Touch Attribution                                    │
│ • Last-Touch Attribution                                     │
│ • Booking Created timestamp                                  │
│ • Last Updated timestamp                                     │
└─────────────────────────────────────────────────────────────┘
         ↓ generates
┌─────────────────────────────────────────────────────────────┐
│                           TASK                               │
├─────────────────────────────────────────────────────────────┤
│ • ID                                                         │
│ • Contact ID (foreign key)                                   │
│ • Booking ID (nullable foreign key)                          │
│ • Type (call, sms_followup, welcome_call, rescue, recall)    │
│ • Assigned To (staff user ID, nullable)                      │
│ • Due Date/Time                                              │
│ • Priority Score (calculated)                                │
│ • Status (todo, in_progress, completed, cancelled)           │
│ • Created By (system or user)                                │
│ • Completed timestamp (nullable)                             │
│ • Notes (text)                                               │
└─────────────────────────────────────────────────────────────┘

Event Flow Architecture
WIX BOOKINGS ──webhook──> EVENT PROCESSOR ──triggers──> AUTOMATION ENGINE
                              │                              │
                              ↓                              ↓
                         EVENT LOG                      TASK GENERATOR
                              │                              │
                              ↓                              ↓
                       UPDATE CONTACT                   ASSIGN TO STAFF
                       UPDATE BOOKING                        │
                       UPDATE PIPELINE                       ↓
                              │                         SMS/EMAIL API
                              ↓                              │
                      ATTRIBUTION ENGINE                     ↓
                              │                      LOG TOUCHPOINT
                              ↓
                      WARMNESS CALCULATOR
Key Principles:

Every event creates an immutable event log entry
Events trigger pipeline transitions + task creation
Tasks are the unit of human work
Touchpoints are the unit of attribution
PART 2: Pipeline A — Leads to Booking
Stage Definitions

Stage
Entry Trigger
Exit Trigger
Auto Tasks Created
Auto Messages
New Lead
Lead created from any source
5 min elapsed OR manual progression
• Call task (high-intent only)
• SMS follow-up task (5 min deadline)
• Immediate welcome SMS with value prop
Contacted
First SMS sent OR call attempted
Response received OR 24hr no-response
• Follow-up call task (if no response in 4 hours)
• None (human takes over conversation)
Engaged
Lead replies to SMS/call
Booking created OR 3 days inactive
• Booking nudge task (day 2)
• Escalation task (day 3)
• Booking link SMS (automated)
• FAQ or resource link
Booking Attempted
Lead expresses intent but hasn't booked
Booking created OR 7 days elapsed
• Daily gentle nudge task
• Reminder SMS (day 1, 3, 5)
Booked
Wix Booking created
Appointment date arrives
→ Moves to Pipeline B
• Booking confirmation SMS
Dead/Lost
7 days no engagement after multiple attempts
Manual reactivation
None
None

Warmness Scoring Logic (MVP Rules-Based)
BASE SCORE = 0

INTENT TYPE:
+ 30 points: Procedure inquiry
+ 25 points: High-risk concern / urgent spot
+ 20 points: Follow-up appointment
+ 10 points: Routine skin check
+ 5 points: General inquiry

SOURCE:
+ 20 points: Referral (family/friend program)
+ 15 points: ManyChat engagement (completed flow)
+ 10 points: Meta Ad with form completion
+ 10 points: Existing patient
+ 5 points: Organic search
+ 5 points: Word of mouth

ENGAGEMENT SIGNALS:
+ 10 points: Replied to SMS within 1 hour
+ 5 points: Replied to SMS within 24 hours
+ 10 points: Downloaded resource
+ 15 points: Clicked booking link
+ 5 points: Opened email

SPEED:
+ 10 points: First contact within 5 minutes
- 5 points: First contact after 1 hour
- 10 points: First contact after 24 hours

FINAL SCORE:
70+ = HOT (immediate call task)
40-69 = WARM (call task + SMS)
0-39 = COOL (SMS only, call if responds)

Automation Rules
On Lead Created:
1. Create Contact record
2. Log touchpoint (source = first-touch attribution)
3. Calculate initial warmness score
4. Send immediate welcome SMS
   Template: "Hi [Name]! Thanks for reaching out to [Clinic]. 
              We've received your inquiry about [intent]. 
              A team member will call you within 5 minutes. 
              Quick question: [booking link]"
5. IF warmness ≥ 70: Create HIGH priority call task (due: now + 5 min)
6. IF warmness < 70: Create MEDIUM priority SMS follow-up task (due: now + 5 min)
7. Set pipeline stage = "New Lead"
On SMS Reply Received:
1. Log touchpoint
2. Update last-touch attribution
3. Move to "Engaged" stage
4. Cancel pending auto-follow-up tasks
5. Create call task for staff (due: within 2 hours)
6. Stop automated SMS cadence
On No Response (4 hours):
1. Send follow-up SMS
   Template: "Hi [Name], just checking if you saw my earlier message. 
              Would [Day] at [Time] work for your appointment? 
              Book here: [link]"
2. Create escalation call task (due: end of business day)
3. Update warmness score (-5 points)


PART 3: Pipeline B — Pre-Appointment Care
Stage Definitions

Stage
Entry Trigger
Exit Trigger
Auto Tasks Created
Auto Messages
Booking Confirmed
Wix booking created
T-48 hours before appointment
• Welcome call task (new patients only)
• Intake tracking task
• Immediate booking confirmation SMS
Reminded
T-48 hours
Confirmation reply received
• Follow-up call task (if no confirmation)
• Reminder SMS at T-48hr
• Reminder SMS at T-24hr
Confirmed
Patient replies "Y" or similar
Appointment time
None
• Final reminder SMS (T-2 hours)
Needs Attention
No confirmation after 2 reminders
Manual resolution OR appointment time
• Urgent call task (high-urgency appts)
• SMS task (routine appts)
• "Please confirm" SMS
Ready
Appointment day, confirmed
Appointment time passes
→ Moves to Pipeline C
• "See you soon" SMS (morning of)

Automation Rules
On Booking Created in Wix:
1. Webhook received from Wix
2. Create or update Contact
3. Create Booking record
4. Store first-touch and last-touch attribution from lead stage
5. Move contact to Pipeline B, stage "Booking Confirmed"
6. IF new patient: Create welcome call task (due: same day)
7. Send immediate confirmation SMS
   Template: "Great news [Name]! Your appointment is confirmed for 
              [Date] at [Time]. We'll send reminders. Reply STOP to opt out."
8. Schedule reminder tasks:
   - T-48hr reminder SMS
   - T-24hr confirmation request SMS
9. Log booking creation touchpoint
On Confirmation SMS Reply (Y/Yes/Confirmed):
1. Log touchpoint
2. Update booking status = "confirmed"
3. Move to "Confirmed" stage
4. Cancel "Needs Attention" tasks
5. Schedule T-2hr final reminder
6. Update warmness score (+10 points for responsiveness)
On Cancellation in Wix:
1. Webhook received
2. Update booking status = "cancelled"
3. Log touchpoint
4. Cancel ALL pending tasks for this booking
5. IF urgency = HIGH:
   - Create URGENT rescue call task (due: within 1 hour)
   - Send empathetic SMS: "Hi [Name], we're sorry you need to cancel. 
     Is everything okay? We'd love to help reschedule."
6. IF urgency = MEDIUM/LOW:
   - Send rescue SMS
   - Create call task (due: end of day)
7. Move to Pipeline C, stage "Cancelled - Rescue"
8. Preserve all attribution data
On Reschedule in Wix:
1. Webhook received
2. Update booking record with new date/time
3. Cancel old reminder tasks
4. Create new reminder task series (T-48hr, T-24hr, T-2hr)
5. Send reschedule confirmation SMS
6. Stay in Pipeline B
7. IF new date is >7 days out: Re-run welcome call task for new patients
On No Confirmation Reply (T-24hr):
1. Move to "Needs Attention" stage
2. IF urgency = HIGH:
   - Create urgent call task (due: within 2 hours)
3. IF urgency = MEDIUM/LOW:
   - Send "please confirm" SMS
   - Create call task (due: morning of appointment)
PART 4: Pipeline C — Post-Appointment, Recall & Reactivation
Stage Definitions

Stage
Entry Trigger
Exit Trigger
Auto Tasks Created
Auto Messages
Attended
Staff marks booking outcome = attended
T+24 hours
• Review request task (T+24hr)
• Referral invite task (T+3 days)
• Thank you SMS (immediate)
Review Requested
T+24hr after attendance
Review received OR T+7 days
• Follow-up review nudge (if no response)
• Google review request SMS
Referral Invited
T+3 days after attendance
Referral made OR 30 days
None
• Referral program SMS with Wix link
Recall Due
Recall window reached (6-12 months)
Booking created OR 3 failed attempts
• Recall call task (high-risk)
• Recall SMS task (routine)
• Recall SMS with booking link
Cancelled - Rescue
Booking cancelled in Wix
Rebooked OR 7 days elapsed
• Rescue call task (urgency-based)
• Rescue SMS (urgency-based)
Did Not Attend
Staff marks outcome = no-show
Manual follow-up
• No-show call task
• "We missed you" SMS
Dormant
3 failed recall/rescue attempts
Manual reactivation
None
None

Automation Rules
On Attended Appointment:
1. Staff marks booking outcome = "attended" (or automated from Wix if available)
2. Log touchpoint (type: attended_appointment)
3. Move to Pipeline C, stage "Attended"
4. Send immediate thank you SMS
   Template: "Thanks for visiting us today, [Name]! 
              Your care is our priority. We'll follow up soon."
5. Create review request task (due: T+24 hours)
6. Create referral invite task (due: T+3 days)
7. Calculate recall due date based on service type:
   - High-risk/doctor-directed: 6 months
   - Routine: 12 months
   - Procedure follow-up: per provider notes
8. Schedule recall reminder task for future date
On Review Request (T+24hr):
1. Send Google review request SMS
   Template: "Hi [Name], we hope your appointment went well! 
              Would you mind leaving us a quick Google review? 
              [Review Link] — it helps others find quality skin care."
2. Move to "Review Requested" stage
3. IF no response in 7 days: Send gentle nudge
On Referral Invite (T+3 days):
1. Send referral program SMS
   Template: "Hi [Name]! Love our service? Refer family & friends 
              and get [incentive]. Share: [Wix referral link]"
2. Move to "Referral Invited" stage
3. Track referrals via Wix program + CRM attribution
On Recall Due Date:
1. Move to "Recall Due" stage
2. IF high-risk OR high-value:
   - Create call task for staff
   - Send SMS: "Hi [Name], it's been [X months] since your last visit. 
     Dr. [Name] recommends a follow-up. Book here: [link]"
3. IF routine:
   - Send SMS only
   - Create call task only if no response in 7 days
4. IF no response after 3 attempts (SMS/call over 30 days):
   - Move to "Dormant"
   - Allow manual reactivation later
On Cancelled Booking (from Pipeline B):
1. Already handled in Pipeline B automation
2. Contact moved to "Cancelled - Rescue" stage
3. Urgency-based rescue flow initiated
4. IF rebooked within 7 days: Move back to Pipeline B
5. IF no rebooking after 7 days: Move to "Dormant"
On No-Show:
1. Staff marks outcome = "no_show"
2. Log touchpoint
3. Move to "Did Not Attend" stage
4. Create no-show call task (due: same day)
5. Send SMS: "Hi [Name], we missed you today. Is everything okay? 
   We'd love to reschedule: [link]"
6. IF high-urgency appointment: Escalate to urgent call task
7. IF no response after 2 attempts: Move to "Dormant"

PART 5: Pipeline D — Partnerships (Simplified MVP)
Stage Definitions

Stage
Entry
Auto Tasks
Notes
Identified
Manual entry
Research task
Basic contact info + why they're a fit
Qualified
Research complete
Outreach email draft task
Audience fit confirmed, collaboration idea noted
Contacted
Email sent
Follow-up task (T+7 days)
Email logged in CRM
In Discussion
Reply received
Meeting/call task
Negotiation notes
Active
Agreement reached
Performance tracking
Attribution from their channel tracked
Completed
Campaign ends
Review + renew task
Outcomes analyzed
MVP Scope:

Manual entity creation (partnership contact form)
Fields: Name, platform, audience size, relevance score, collaboration type
Simple pipeline with manual progression
Email templates with merge fields (no AI in MVP)
Attribution tracking: if booking source = partnership channel, credit the partner
Task-based workflow (research → outreach → follow-up)

Phase 2: AI email drafting, automated audience fit scoring, partnership performance dashboard
PART 6: Staff Task Dashboard Design
Today's Tasks View (Wireframe Concept)
┌─────────────────────────────────────────────────────────────┐
│  📋 MY TASKS — Friday, January 02, 2026                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 OVERDUE (2)                                              │
│  ├─ Call: Sarah Johnson - Cancelled procedure (HIGH)        │
│  │  Due: 2 hours ago | Pipeline: Cancelled-Rescue           │
│  │  Notes: Procedure on Tuesday, needs urgent reschedule    │
│  │  [View Contact] [Mark Complete] [Snooze]                 │
│  │                                                           │
│  └─ Welcome Call: Mark Chen - New patient                   │
│     Due: Yesterday 4pm | Pipeline: Pre-Appointment          │
│     Appointment: Monday 10am                                 │
│     [View Contact] [Mark Complete] [Snooze]                 │
│                                                              │
│  🟠 TODAY (5)                                                │
│  ├─ Call: Emma Davis - No confirmation reply (MEDIUM)       │
│  │  Due: 2:00 PM | Appointment: Tomorrow 9am               │
│  │  Last SMS: No reply to T-24hr reminder                   │
│  │  [View Contact] [Mark Complete] [Snooze]                 │
│  │                                                           │
│  ├─ SMS Follow-up: Alex Wong - New lead (HOT - 85 score)    │
│  │  Due: 10 min ago | Pipeline: New Lead                    │
│  │  Source: ManyChat (high-risk concern)                    │
│  │  [View Contact] [Send SMS] [Mark Complete]               │
│  │                                                           │
│  ├─ Review Request: Lisa Park                               │
│  │  Due: 3:00 PM | Attended: Yesterday                      │
│  │  [Send Review SMS] [Mark Complete]                       │
│  │                                                           │
│  └─ ... (2 more tasks)                                       │
│                                                              │
│  🟢 UPCOMING (12)                                            │
│  └─ [View All] →                                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Calls] [SMS] [Welcome] [Rescue] [Recall]  │
│  Sort by: [Priority ▼] [Due Date] [Pipeline]                │
└─────────────────────────────────────────────────────────────┘

Priority Calculation
PRIORITY SCORE = Base + Urgency + Overdue + Warmness

Base Points by Task Type:
- Rescue call (cancelled HIGH urgency): 100
- Hot lead call (warmness 70+): 90
- No-show follow-up: 80
- No confirmation (T-24hr, HIGH urgency): 75
- Welcome call (new patient): 60
- Recall (high-risk): 50
- Review request: 30
- Referral invite: 20

Urgency Multiplier:
- High urgency appointment: × 1.5
- Medium: × 1.2
- Low: × 1.0

Overdue Penalty:
+ 20 points per hour overdue (max +100)

Warmness Boost:
+ (warmness score - 50) / 2
(e.g., warmness 80 = +15 points)

RESULT:
150+ = 🔴 URGENT
100-149 = 🟠 HIGH
50-99 = 🟡 MEDIUM
<50 = 🟢 LOW
PART 7: Reporting Structure
Weekly Summary (Auto-Generated, Sent Monday AM)
📊 WEEKLY CLINIC REPORT
Week of [Date Range]

──────────────────────────
🎯 PRIMARY KPI
──────────────────────────
Attended Appointments: 47 (↑ 12% vs last week)

──────────────────────────
📈 FUNNEL PERFORMANCE
──────────────────────────
New Leads:                 63
  ├─ Speed-to-lead <5min:  78% (49/63) ✅
  ├─ Contacted same day:   95% (60/63)
  └─ Booked:               38% (24/63)

Bookings Created:          31
  ├─ New patients:         24
  ├─ Returning:            7
  └─ Confirmed:            87% (27/31)

Appointments Scheduled:    31
  ├─ Attended:             47 (includes prior weeks' bookings)
  ├─ Cancelled:            8
  └─ No-shows:             3

Attendance Rate:           84% (47/56 scheduled this week)

──────────────────────────
📍 TOP CHANNELS (by attended appointments)
──────────────────────────
1. Meta Ads:               18 attended (38%)
2. ManyChat:               12 attended (26%)
3. Referrals:              9 attended (19%)
4. Organic:                5 attended (11%)
5. Word of Mouth:          3 attended (6%)

──────────────────────────
⚠️ ATTENTION AREAS
──────────────────────────
- 8 cancellations (5 HIGH urgency)
  - 3 rebooked ✅
  - 5 still in rescue pipeline
- 3 no-shows (all routine checks)
- 12% of leads took >5min first contact (↓ vs last week)

──────────────────────────
🔄 REACTIVATION
──────────────────────────
Recall reminders sent:     15
Recall bookings:           4 (27% conversion)
Cancelled rescues:         3 rebooked

──────────────────────────
💡 INSIGHTS
──────────────────────────
- ManyChat leads have 92% attendance (highest quality)
- Meta ads converting well but 15% cancel rate
- Welcome calls for new patients → 94% attendance
- No welcome call → 78% attendance

Monthly Report (Auto-Generated, Sent 1st of Month)
📊 MONTHLY CLINIC REPORT
[Month Year]

──────────────────────────
🎯 PRIMARY KPI
──────────────────────────
Attended Appointments:     194 (↑ 23% vs last month)
Target:                    180 ✅ EXCEEDED

──────────────────────────
📈 MONTHLY FUNNEL
──────────────────────────
Leads → Bookings:          42% (115/274)
Bookings → Attended:       87% (194/223)
End-to-End Conversion:     37% (194/524 total touchpoints)

──────────────────────────
📍 ATTRIBUTION ANALYSIS (attended appointments)
──────────────────────────
FIRST-TOUCH:
1. Meta Ads:               78 (40%)
2. Organic Search:         42 (22%)
3. Referrals:              38 (20%)
4. ManyChat:               24 (12%)
5. Word of Mouth:          12 (6%)

LAST-TOUCH:
1. ManyChat:               67 (35%) — nurture champion
2. Meta Ads:               54 (28%)
3. Direct Booking:         38 (20%)
4. Referrals:              23 (12%)
5. SMS Reminder:           12 (6%)

Multi-Touch Insight:
- 45% of attended appointments had 3+ touchpoints
- Median time from first touch to attended: 8 days
- ManyChat often converts leads from other sources

──────────────────────────
💰 META CAMPAIGN PERFORMANCE (by attended appts)
──────────────────────────
Campaign A (High-Risk):    45 attended, $32 CPA ✅
Campaign B (Routine):      18 attended, $58 CPA ⚠️
Campaign C (Retargeting):  15 attended, $24 CPA ✅

Recommendation: Shift budget from Campaign B to A + C

──────────────────────────
⚠️ CANCELLATIONS & NO-SHOWS
──────────────────────────
Total Cancellations:       34 (15% of bookings)
  ├─ Rebooked:             18 (53% rescue rate) ✅
  ├─ Lost:                 12
  └─ Still in pipeline:    4

No-Shows:                  12 (5% of scheduled)
  ├─ High urgency:         2 ⚠️
  ├─ Routine:              10
  └─ Rebooked after:       5

Attendance by confirmation status:
- Confirmed (replied Y):   96% attendance
- Not confirmed:           68% attendance
→ Confirmation SMS working!

──────────────────────────
🔄 RECALL & REACTIVATION
──────────────────────────
Recall reminders sent:     67
Recall bookings:           22 (33% conversion)
Avg time since last visit: 11.2 months

Cancelled rescue outcomes:
- Rebooked same week:      12
- Rebooked later:          6
- Lost:                    16

──────────────────────────
⭐ REFERRAL PROGRAM
──────────────────────────
Referral invites sent:     89
Referrals generated:       14 (16% participation)
Referral bookings:         10
Referral attendance:       9 (90% - excellent quality!)

──────────────────────────
🤝 PARTNERSHIPS
──────────────────────────
Active partnerships:       3
Bookings attributed:       7
Attended:                  6 (86%)

──────────────────────────
📊 TRENDS
──────────────────────────
                     This Mo   Last Mo   Change
───────────────────────────────────────────────
Leads                274       223       +23%
Bookings             223       182       +23%
Attended             194       158       +23%
Attendance Rate      87%       84%       +3pp
Speed-to-lead <5min  82%       71%       +11pp
No-show rate         5%        8%        -3pp ✅

──────────────────────────
💡 KEY INSIGHTS & ACTIONS
──────────────────────────
✅ Wins:
- Speed-to-lead automation working (82% <5min)
- Confirmation SMS increased attendance 3pp
- ManyChat nurture = highest quality channel
- Referral program gaining traction

⚠️ Focus Areas:
- Meta Campaign B needs optimization or pause
- 34 cancellations - 12 still lost (rescue SLA?)
- 2 high-urgency no-shows (call protocol review)

🎯 Recommended Actions:
1. Increase ManyChat content investment (best ROI)
2. Test earlier confirmation window (T-72hr vs T-48hr)
3. Add urgency flag to high-risk recall reminders
4. Review rescue call scripts for cancelled procedures
PART 8: Technical Integration Notes
Wix Bookings Integration
Option 1: Native Webhooks (Preferred)
Wix Events to Monitor:
- bookings/created
- bookings/updated (reschedule)
- bookings/cancelled
- payments/paid

Webhook Payload (expected):
{
  "bookingId": "wix_12345",
  "contactId": "wix_contact_789",
  "serviceId": "service_abc",
  "startTime": "2026-01-05T10:00:00Z",
  "status": "scheduled",
  "customerInfo": {
    "name": "Jane Doe",
    "phone": "+61400000000",
    "email": "jane@example.com"
  }
}

CRM Webhook Handler:
1. Validate webhook signature
2. Match or create Contact by phone/email
3. Create/update Booking record
4. Trigger automation rules
5. Return 200 OK immediately
6. Process async in background
Option 2: Polling Fallback (if webhooks unavailable)
Poll frequency: Every 60 seconds
API endpoint: /wix/bookings/recent
Query: bookings updated in last 2 minutes
Logic: Compare timestamps, detect changes
Risk: 1-2 minute lag on cancellations (acceptable for MVP)

ManyChat Integration
Preferred: Direct Webhook
ManyChat → CRM Webhook on:
- New subscriber
- Flow completed
- Button clicked
- Keyword matched

Payload includes:
- Name, phone, email
- Flow path taken
- Resources requested
- Intent signals

CRM creates:
- Contact (if new)
- Touchpoints (interaction history)
- Initial warmness score
- Lead pipeline entry
Fallback: Zapier/Make
ManyChat → Zapier → CRM API
Acceptable for MVP if direct webhook complex
Must still capture full interaction history

SMS Provider Selection
Requirements:

Two-way messaging
Webhook for inbound replies
Australian phone number support
Delivery receipts
Must be simpler than Twilio

Options to Evaluate:

Twilio (with simpler wrapper)
Most reliable
Build custom UI layer in CRM to hide complexity

MessageMedia
Australian-focused
Simpler API than Twilio
Good two-way support

ClickSend
Very simple API
Australian company
Built-in conversation threading


MVP Recommendation: ClickSend or MessageMedia for simplicity, with option to migrate to Twilio later if needed.

Email Integration
MVP: Email Templates + Manual Send

Pre-written templates in CRM
Staff clicks "Send Email" → opens Gmail compose with pre-filled content
Staff manually logs sent email back in CRM
Acceptable for low volume

Phase 2: Gmail API Integration

Auto-send from CRM
Auto-log sent/received emails
Conversation threading

GA4 Integration
MVP: Manual Campaign Tagging

UTM parameters on all outbound links
GA4 events fired on key pages
Weekly manual export of GA4 data into CRM for attribution

Phase 2: GA4 Measurement Protocol

Real-time event streaming
Automatic attribution matching
Cross-device tracking
PART 9: MVP Build Sequence
Phase 1A: Foundation (Week 1-2)
 Core data models (Contact, Booking, Task, Touchpoint)
 User authentication (Google Workspace SSO)
 Basic UI shell + navigation
 Task list view (Today/Upcoming/
Continue
21:38
Overdue)

 Manual contact creation form
 Manual task creation

Phase 1B: Wix Integration (Week 2-3)
 Wix Bookings webhook receiver (or polling setup)
 Booking sync logic
 Contact matching/deduplication
 Pipeline B automation (booking → reminders)
 Manual booking outcome entry (attended/no-show)

Phase 1C: SMS Automation (Week 3-4)
 SMS provider setup (ClickSend/MessageMedia)
 Outbound SMS templates
 Inbound SMS webhook receiver
 Two-way conversation log
 Automated reminder series (T-48, T-24, T-2)
 Confirmation reply detection ("Y" = confirmed)

Phase 1D: Pipeline A (Week 4-5)
 Lead creation (manual + API endpoint)
 Warmness scoring engine (rules-based)
 First-touch attribution capture
 Automated welcome SMS on lead create
 Task auto-generation (call/follow-up based on warmness)
 Speed-to-lead tracking

Phase 1E: Attribution & Touchpoints (Week 5-6)
 Touchpoint logging system
 Last-touch attribution updates
 Multi-touch timeline view (per contact)
 UTM parameter capture from booking URLs

Phase 1F: Pipeline C (Week 6-7)
 Post-appointment automation (review, referral)
 Cancellation rescue workflow
 No-show follow-up
 Recall scheduling logic
 Dormant state handling

Phase 1G: Reporting (Week 7-8)
 Weekly report data collection
 Monthly report data collection
 Automated email delivery (or dashboard view)
 Export to PDF/CSV

Phase 1H: Polish & Testing (Week 8)
 UI refinements
 Mobile responsive views
 Staff training materials
 Data migration from existing systems
 Load testing (100+ bookings/month simulation)
 Launch! 🚀
PART 10: Critical Questions Before Build
Before I proceed with technical architecture details, I need your input on:

1. Build vs Buy Decisions
Are you building this fully custom, or considering a base platform (e.g., n8n, Retool, Airtable + automation)?
Do you have a development team, or are you looking for a no-code/low-code approach?

2. Data Migration
Do you have existing contact/booking data to migrate?
What format is it in? (spreadsheet, old CRM, Wix export?)

3. Staff Count
How many staff will use this daily?
Any specific role distinctions for MVP even without permissions? (e.g., "front desk" vs "marketing manager")

4. SMS Volume Estimates
Rough monthly SMS volume? (for cost/provider selection)
Example: 50 leads/week × 3 SMS each = ~600/month minimum

5. Reporting Delivery
Should weekly/monthly reports be:
Emailed automatically?
Dashboard view only?
Both?


6. ManyChat Current Setup
What flows are active now?
Can you share an example interaction path?


Next Steps:
Once you answer these 6 questions, I'll provide:

Detailed technical stack recommendation
Database schema with relationships
API endpoint specifications
UI wireframes for key screens
Step-by-step implementation guide
