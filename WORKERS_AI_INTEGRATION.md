# Workers AI Integration - Avatar Imaging CMS

**AI-Powered Intelligence Layer**
**Platform:** Cloudflare Workers AI
**Cost:** $0.011 per 1M tokens (90% cheaper than OpenAI)
**Models:** Llama 3.1 8B, Llama 3.2 1B, Mistral 7B

---

## AI Use Cases in Avatar Imaging CMS

### 1. Intelligent Lead Qualification (Enhanced Warmness Scoring)

**Current:** Rules-based warmness scoring
**With Workers AI:** AI-powered intent detection and lead quality assessment

```typescript
// src/services/ai-warmness.ts

export async function calculateAIWarmness(
  contact: Contact,
  touchpoints: Touchpoint[],
  env: Env
): Promise<{ score: number; reasoning: string; confidence: number }> {

  const prompt = `
    You are an expert medical appointment lead qualifier.

    Contact Information:
    - Source: ${contact.source}
    - Intent: ${contact.data.intent || 'unknown'}
    - Is existing patient: ${contact.is_existing_patient}

    Interaction History:
    ${touchpoints.map(t => `- ${t.type}: ${t.details}`).join('\n')}

    Based on this information, provide:
    1. Lead quality score (0-100)
    2. Booking likelihood (high/medium/low)
    3. Key reasoning factors
    4. Recommended action (immediate call, SMS follow-up, or nurture campaign)

    Respond in JSON format:
    {
      "warmness_score": 85,
      "booking_likelihood": "high",
      "reasoning": "High-risk skin concern with immediate availability mentioned",
      "recommended_action": "immediate_call",
      "confidence": 0.92
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 256
  });

  return JSON.parse(response.response);
}
```

**Cost:** ~100 tokens per lead = $0.0000011 per lead ≈ **FREE**

---

### 2. SMS Reply Intelligence (Intent Detection)

**Current:** Pattern matching for "Y", "Yes", "Confirm"
**With Workers AI:** Natural language understanding of patient replies

```typescript
// src/services/ai-sms-intent.ts

export async function detectSMSIntent(
  message: string,
  context: { pipeline: string; stage: string },
  env: Env
): Promise<{
  intent: 'confirm' | 'cancel' | 'reschedule' | 'question' | 'opt_out';
  confidence: number;
  suggested_response?: string;
}> {

  const prompt = `
    You are analyzing a patient's SMS reply to a medical appointment reminder.

    Context:
    - Current pipeline: ${context.pipeline}
    - Current stage: ${context.stage}

    Patient's message: "${message}"

    Detect the patient's intent:
    - confirm: Patient confirming appointment
    - cancel: Patient wants to cancel
    - reschedule: Patient wants to change date/time
    - question: Patient has a question
    - opt_out: Patient wants to stop receiving messages

    Respond in JSON:
    {
      "intent": "confirm",
      "confidence": 0.95,
      "suggested_response": "Great! We'll see you tomorrow at 10am."
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
    prompt,
    max_tokens: 128
  });

  return JSON.parse(response.response);
}
```

**Benefits:**
- Understands: "Yep all good", "Yeah I'll be there", "Can't make it sorry"
- Detects urgency: "I have a new spot that's worrying me"
- Suggests appropriate staff response

**Cost:** ~80 tokens per SMS = $0.00000088 per SMS ≈ **FREE**

---

### 3. Automated Task Prioritization (Dynamic Priority)

**Current:** Fixed formula for task priority
**With Workers AI:** Context-aware priority adjustment

```typescript
// src/services/ai-task-priority.ts

export async function calculateAIPriority(
  task: Task,
  contact: Contact,
  booking: Booking | null,
  recentTouchpoints: Touchpoint[],
  env: Env
): Promise<{ priority_score: number; reasoning: string }> {

  const prompt = `
    You are optimizing task priority for a medical clinic staff member.

    Task:
    - Type: ${task.type}
    - Due: ${new Date(task.due_datetime * 1000).toISOString()}
    - Contact: ${contact.name}

    Contact Context:
    - Warmness: ${contact.warmness_score}
    - Pipeline: ${contact.current_pipeline} / ${contact.current_stage}
    ${booking ? `- Appointment: ${new Date(booking.appointment_datetime * 1000).toISOString()}` : ''}
    ${booking ? `- Urgency: ${booking.urgency_level}` : ''}

    Recent Activity:
    ${recentTouchpoints.slice(0, 3).map(t => `- ${t.type}: ${t.details}`).join('\n')}

    Calculate priority score (0-200) considering:
    - Medical urgency (high-risk procedures = higher priority)
    - Time sensitivity (appointment date proximity)
    - Engagement momentum (recent replies = higher priority)
    - Conversion likelihood (warmness score)

    Respond in JSON:
    {
      "priority_score": 165,
      "reasoning": "High-risk procedure tomorrow, patient replied 5 minutes ago showing engagement"
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 128
  });

  return JSON.parse(response.response);
}
```

**Benefits:**
- Understands medical context (high-risk vs routine)
- Considers engagement momentum
- Adapts to appointment proximity

---

### 4. Automated Insights Generation (Weekly/Monthly Reports)

**Current:** Static report with predefined metrics
**With Workers AI:** AI-generated insights and recommendations

```typescript
// src/services/ai-insights.ts

export async function generateReportInsights(
  reportData: WeeklyReport,
  env: Env
): Promise<{ insights: string[]; recommendations: string[] }> {

  const prompt = `
    You are a medical clinic operations analyst.

    Weekly Performance Data:
    - Attended appointments: ${reportData.kpi.attended_appointments} (${reportData.kpi.change_vs_last_week > 0 ? '+' : ''}${(reportData.kpi.change_vs_last_week * 100).toFixed(1)}% vs last week)
    - Attendance rate: ${(reportData.appointments.attendance_rate * 100).toFixed(1)}%
    - New leads: ${reportData.funnel.new_leads}
    - Lead→Booking conversion: ${(reportData.funnel.booked_percentage * 100).toFixed(1)}%
    - Speed-to-lead <5min: ${(reportData.funnel.speed_to_lead_under_5min_percentage * 100).toFixed(1)}%
    - Cancellations: ${reportData.attention_areas.cancellations} (${reportData.attention_areas.rebooked} rebooked)
    - No-shows: ${reportData.attention_areas.no_shows}

    Top Channels:
    ${reportData.channels.map(c => `- ${c.name}: ${c.attended_count} (${(c.percentage * 100).toFixed(1)}%)`).join('\n')}

    Generate:
    1. 3-5 key insights about performance trends
    2. 3-5 actionable recommendations to improve metrics

    Respond in JSON:
    {
      "insights": [
        "ManyChat leads have highest attendance rate (92%) - quality over quantity",
        "Speed-to-lead improved 11pp this week - automation is working"
      ],
      "recommendations": [
        "Increase budget on ManyChat campaigns (highest ROI channel)",
        "Test earlier confirmation window (T-72hr) to reduce no-shows"
      ]
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 512
  });

  return JSON.parse(response.response);
}
```

**Benefits:**
- Identifies non-obvious patterns
- Provides actionable recommendations
- Adapts insights based on clinic goals

**Cost:** ~400 tokens per report = $0.0000044 per report = **FREE**

---

### 5. Smart SMS Template Suggestions

**Current:** Fixed templates
**With Workers AI:** Context-aware message generation

```typescript
// src/services/ai-sms-composer.ts

export async function suggestSMSMessage(
  context: {
    contact: Contact;
    situation: 'no_response' | 'cancellation' | 'recall' | 'custom';
    recentMessages: string[];
  },
  env: Env
): Promise<{ message: string; tone: string }> {

  const prompt = `
    You are writing an SMS for a medical imaging clinic.

    Patient: ${context.contact.name}
    Situation: ${context.situation}

    Recent conversation:
    ${context.recentMessages.join('\n')}

    Write a personalized SMS that:
    - Is warm and professional
    - Respects the patient's time
    - Includes a clear call-to-action
    - Is under 160 characters
    - Avoids medical jargon

    Respond in JSON:
    {
      "message": "Hi Sarah, just checking in - we'd love to reschedule your appointment. Any day next week work? Reply with preferred day 😊",
      "tone": "warm_professional"
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
    prompt,
    max_tokens: 128
  });

  return JSON.parse(response.response);
}
```

**Use Cases:**
- Staff dashboard shows AI-suggested message
- Staff can edit before sending
- Learns from successful conversations

---

### 6. Cancellation Reason Analysis

**Current:** Manual notes field
**With Workers AI:** Automated reason extraction and categorization

```typescript
// src/services/ai-cancellation-analysis.ts

export async function analyzeCancellationReason(
  cancellationNote: string,
  conversationHistory: string[],
  env: Env
): Promise<{
  primary_reason: string;
  secondary_reasons: string[];
  rescue_likelihood: 'high' | 'medium' | 'low';
  suggested_action: string;
}> {

  const prompt = `
    You are analyzing why a patient cancelled their medical appointment.

    Cancellation note: "${cancellationNote}"

    Recent conversation:
    ${conversationHistory.join('\n')}

    Identify:
    1. Primary reason (cost, schedule_conflict, concern_resolved, fear, found_alternative, etc.)
    2. Rescue likelihood (will they rebook?)
    3. Best approach to rescue

    Respond in JSON:
    {
      "primary_reason": "schedule_conflict",
      "secondary_reasons": ["work_commitment"],
      "rescue_likelihood": "high",
      "suggested_action": "Offer evening/weekend slots, mention flexible scheduling"
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 256
  });

  return JSON.parse(response.response);
}
```

**Benefits:**
- Identifies patterns (e.g., "too expensive" vs "schedule conflict")
- Tailors rescue approach per reason
- Tracks cancellation trends over time

---

### 7. Predictive No-Show Detection

**Current:** Reactive (wait for no-show to happen)
**With Workers AI:** Proactive (predict and prevent)

```typescript
// src/services/ai-noshow-prediction.ts

export async function predictNoShowRisk(
  booking: Booking,
  contact: Contact,
  touchpoints: Touchpoint[],
  env: Env
): Promise<{
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number;
  contributing_factors: string[];
  prevention_recommendation: string;
}> {

  const prompt = `
    You are predicting no-show risk for a medical appointment.

    Appointment:
    - Date/Time: ${new Date(booking.appointment_datetime * 1000).toISOString()}
    - Service: ${booking.service_type}
    - Urgency: ${booking.urgency_level}
    - Status: ${booking.status}

    Patient:
    - Is existing patient: ${contact.is_existing_patient}
    - Warmness score: ${contact.warmness_score}

    Engagement:
    - Confirmed appointment: ${booking.status === 'confirmed' ? 'Yes' : 'No'}
    - Last reply: ${touchpoints[0]?.timestamp ? new Date(touchpoints[0].timestamp).toISOString() : 'Never'}
    - SMS replies: ${touchpoints.filter(t => t.type === 'sms_received').length}

    Historical patterns suggest no-show risk is higher when:
    - No confirmation reply
    - Long time since last engagement
    - New patient (no relationship)
    - Low urgency appointment

    Predict no-show risk and suggest prevention.

    Respond in JSON:
    {
      "risk_level": "high",
      "risk_score": 0.72,
      "contributing_factors": [
        "No confirmation reply after 2 reminders",
        "New patient (no history)",
        "Low urgency routine check"
      ],
      "prevention_recommendation": "Call patient today to personally confirm and address any concerns"
    }
  `;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 256
  });

  return JSON.parse(response.response);
}
```

**Integration:**
- Run prediction 24 hours before appointment
- Create high-priority task if risk > 0.6
- Staff makes personal call to high-risk patients

---

## Implementation Architecture

### AI Service Layer:

```typescript
// src/services/ai-service.ts

export class AIService {
  constructor(private env: Env) {}

  // Generic AI query wrapper
  private async query<T>(
    prompt: string,
    model: string = '@cf/meta/llama-3.1-8b-instruct',
    maxTokens: number = 256
  ): Promise<T> {
    try {
      const response = await this.env.AI.run(model, {
        prompt,
        max_tokens: maxTokens
      });

      return JSON.parse(response.response);
    } catch (error) {
      console.error('AI query failed:', error);
      throw new Error('AI processing failed');
    }
  }

  // Specific AI capabilities
  async enhanceWarmness(contact: Contact, touchpoints: Touchpoint[]) {
    return this.query(buildWarmness Prompt(contact, touchpoints));
  }

  async detectSMSIntent(message: string, context: any) {
    return this.query(buildSMSIntentPrompt(message, context), '@cf/meta/llama-3.2-1b-instruct', 128);
  }

  async generateInsights(reportData: any) {
    return this.query(buildInsightsPrompt(reportData), '@cf/meta/llama-3.1-8b-instruct', 512);
  }

  async predictNoShow(booking: Booking, contact: Contact, touchpoints: Touchpoint[]) {
    return this.query(buildNoShowPrompt(booking, contact, touchpoints));
  }
}
```

### Integration with Automation Engine:

```typescript
// src/services/automation-engine.ts (enhanced)

export async function processBookingCreated(data: any, env: Env) {
  const aiService = new AIService(env);

  // 1. Standard automation (fast)
  const contact = await matchOrCreateContact(data.customerInfo, env);
  const booking = await createBooking(data, contact.id, env);

  // 2. AI enhancement (async, non-blocking)
  const aiAnalysis = await aiService.predictNoShow(booking, contact, touchpoints);

  if (aiAnalysis.risk_level === 'high') {
    // Create high-priority confirmation call task
    await createTask({
      contact_id: contact.id,
      booking_id: booking.id,
      type: 'confirmation_call',
      priority: 'urgent',
      notes: `No-show risk: ${aiAnalysis.risk_score.toFixed(2)} - ${aiAnalysis.prevention_recommendation}`
    }, env);
  }

  // 3. Continue standard flow
  await sendConfirmationSMS(contact, booking, env);
}
```

---

## Cost Analysis: Workers AI vs OpenAI

### Scenario: 500 bookings/month

| Operation | Tokens | OpenAI Cost | Workers AI Cost | Savings |
|-----------|--------|-------------|-----------------|---------|
| Lead qualification (400 leads) | 40K | $0.40 | $0.044 | 89% |
| SMS intent detection (3K SMS) | 240K | $2.40 | $0.264 | 89% |
| Report insights (weekly) | 1.6K | $0.016 | $0.0018 | 89% |
| No-show prediction (500) | 128K | $1.28 | $0.141 | 89% |
| **Total** | **410K tokens** | **$4.14** | **$0.45** | **89%** |

**Annual Savings:** ($4.14 - $0.45) × 12 = **$44.28/year**

For MVP, Workers AI cost is essentially **free** (< $1/month).

---

## Gradual AI Rollout Strategy

### Phase 1: MVP (Rules-Based)
- ✅ Rules-based warmness scoring
- ✅ Pattern-matching SMS confirmation
- ✅ Fixed priority formula
- **No AI costs**

### Phase 2: AI Augmentation (Hybrid)
- ✅ AI-enhanced warmness (runs in background)
- ✅ AI SMS intent detection (fallback to rules if AI fails)
- ✅ AI-generated insights (reports only)
- **Cost: ~$0.50/month**

### Phase 3: AI-First (Production)
- ✅ AI primary for all decisions
- ✅ Predictive no-show detection
- ✅ Smart SMS composer suggestions
- ✅ Automated cancellation analysis
- **Cost: ~$5/month** (as business scales)

---

## AI Model Selection

### Llama 3.1 8B Instruct (Primary)
- **Use For:** Lead qualification, insights, task priority, cancellation analysis
- **Strengths:** Strong reasoning, JSON output, medical context understanding
- **Cost:** $0.011 / 1M tokens

### Llama 3.2 1B Instruct (Fast)
- **Use For:** SMS intent detection, quick classifications
- **Strengths:** Ultra-fast (<100ms), cheap, good for simple tasks
- **Cost:** $0.011 / 1M tokens (same pricing, but uses fewer tokens)

### Mistral 7B Instruct (Fallback)
- **Use For:** Backup if Llama models unavailable
- **Strengths:** Reliable, well-tested
- **Cost:** $0.011 / 1M tokens

---

## Monitoring AI Performance

### Track AI Metrics:

```typescript
// Log AI decisions for review
await env.DB.prepare(`
  INSERT INTO ai_decisions (
    id,
    decision_type,
    input_summary,
    ai_output,
    confidence,
    human_override,
    timestamp
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).bind(
  crypto.randomUUID(),
  'warmness_scoring',
  contact.name,
  JSON.stringify(aiResult),
  aiResult.confidence,
  null, // Will be filled if staff overrides
  Date.now()
).run();
```

### Review Dashboard:
- **Accuracy:** % of AI decisions staff agreed with
- **Override Rate:** How often staff manually adjust
- **Confidence Calibration:** Are 90% confident predictions actually 90% accurate?

---

## Fallback Strategy

### If Workers AI is unavailable:

```typescript
async function calculateWarmness(contact: Contact, touchpoints: Touchpoint[], env: Env) {
  try {
    // Attempt AI-enhanced scoring
    return await calculateAIWarmness(contact, touchpoints, env);
  } catch (error) {
    console.error('AI warmness failed, falling back to rules:', error);

    // Fallback to rules-based scoring
    return calculateRulesBasedWarmness(contact, touchpoints);
  }
}
```

**Benefit:** System never breaks, AI is pure enhancement.

---

## Next Steps: AI Integration

1. ✅ Add Workers AI binding to `wrangler.toml`
2. ✅ Create `AIService` class
3. ✅ Implement lead qualification enhancement
4. ✅ Implement SMS intent detection
5. ✅ Add AI insights to reports
6. ✅ Test with real data
7. ✅ Monitor accuracy and adjust prompts
8. ✅ Enable predictive no-show detection (Phase 3)

---

**Workers AI makes Avatar Imaging CMS significantly smarter without adding cost!** 🚀
