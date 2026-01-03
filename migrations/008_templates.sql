-- =====================================================================
-- TEMPLATES SYSTEM
-- Template management for emails, SMS, social, and AI contexts
-- =====================================================================

-- Templates table - Stores all message and AI context templates
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL DEFAULT 'default',

  -- Template identification
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('email', 'sms', 'social', 'ai_context', 'notification')),

  -- Template content
  subject TEXT,                    -- For emails
  body TEXT NOT NULL,              -- Template body with variables {{variable_name}}

  -- AI-specific fields
  ai_system_prompt TEXT,           -- System prompt for AI context templates
  ai_temperature REAL DEFAULT 0.7, -- AI temperature setting (0.0-1.0)
  ai_max_tokens INTEGER DEFAULT 256,

  -- Template settings
  variables TEXT,                  -- JSON array of expected variables: ["contact_name", "appointment_date"]
  quick_button_label TEXT,         -- Label for quick action button (e.g., "Send Reminder")
  quick_button_icon TEXT,          -- Icon name for button (e.g., "bell", "mail")

  -- Organization
  tags TEXT,                       -- JSON array of tags for filtering
  is_default BOOLEAN DEFAULT 0,    -- Default template for this category
  is_active BOOLEAN DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT NOT NULL DEFAULT 'system',
  last_used_at INTEGER,
  use_count INTEGER DEFAULT 0,

  UNIQUE(tenant_id, name, category)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_default ON templates(is_default);

-- =====================================================================
-- SEED DEFAULT TEMPLATES
-- =====================================================================

-- EMAIL TEMPLATES
INSERT OR IGNORE INTO templates (name, category, subject, body, description, variables, is_default) VALUES
('Appointment Confirmation', 'email', 'Appointment Confirmed - {{appointment_date}}',
'Hi {{contact_name}},

Your appointment has been confirmed for {{appointment_date}} at {{appointment_time}}.

Location: {{location}}
Service: {{service_type}}

If you need to reschedule, please contact us at least 24 hours in advance.

Looking forward to seeing you!

Best regards,
{{staff_name}}
Avatar Imaging',
'Standard appointment confirmation email',
'["contact_name", "appointment_date", "appointment_time", "location", "service_type", "staff_name"]',
1);

INSERT OR IGNORE INTO templates (name, category, subject, body, description, variables) VALUES
('Appointment Reminder', 'email', 'Reminder: Appointment Tomorrow',
'Hi {{contact_name}},

This is a friendly reminder about your appointment tomorrow ({{appointment_date}}) at {{appointment_time}}.

Location: {{location}}

Please arrive 10 minutes early to complete any necessary paperwork.

See you soon!

Best regards,
Avatar Imaging',
'24-hour appointment reminder',
'["contact_name", "appointment_date", "appointment_time", "location"]');

INSERT OR IGNORE INTO templates (name, category, subject, body, description, variables) VALUES
('Follow-up After Visit', 'email', 'Thank you for visiting Avatar Imaging',
'Hi {{contact_name}},

Thank you for choosing Avatar Imaging for your recent visit on {{visit_date}}.

We hope everything went well. If you have any questions about your results or need to schedule a follow-up, please don''t hesitate to reach out.

Your feedback is valuable to us. If you have a moment, we''d love to hear about your experience.

Best regards,
Avatar Imaging Team',
'Post-appointment follow-up email',
'["contact_name", "visit_date"]');

-- SMS TEMPLATES
INSERT OR IGNORE INTO templates (name, category, body, description, variables, quick_button_label, quick_button_icon, is_default) VALUES
('Appointment Reminder SMS', 'sms',
'Hi {{contact_name}}, reminder: Your appointment is tomorrow {{appointment_time}} at Avatar Imaging. Reply CONFIRM or call us to reschedule.',
'Quick SMS reminder for appointments',
'["contact_name", "appointment_time"]',
'Send Reminder',
'bell',
1);

INSERT OR IGNORE INTO templates (name, category, body, description, variables, quick_button_label, quick_button_icon) VALUES
('Booking Confirmation SMS', 'sms',
'Hi {{contact_name}}! Your appointment is confirmed for {{appointment_date}} at {{appointment_time}}. See you soon! - Avatar Imaging',
'Booking confirmation via SMS',
'["contact_name", "appointment_date", "appointment_time"]',
'Send Confirmation',
'check-circle');

INSERT OR IGNORE INTO templates (name, category, body, description, variables, quick_button_label, quick_button_icon) VALUES
('Quick Follow-up SMS', 'sms',
'Hi {{contact_name}}, just checking in! Do you have any questions about your recent visit? Feel free to call or text back. - Avatar Imaging',
'Quick follow-up check-in',
'["contact_name"]',
'Send Follow-up',
'message-circle');

INSERT OR IGNORE INTO templates (name, category, body, description, variables, quick_button_label, quick_button_icon) VALUES
('Re-engagement SMS', 'sms',
'Hi {{contact_name}}, we noticed it''s been a while! We''d love to see you again. Book your next appointment by replying to this message. - Avatar Imaging',
'Re-engage inactive contacts',
'["contact_name"]',
'Re-engage Contact',
'refresh-cw');

-- SOCIAL MEDIA TEMPLATES
INSERT OR IGNORE INTO templates (name, category, body, description, variables, quick_button_label, quick_button_icon) VALUES
('Instagram DM - Booking Inquiry', 'social',
'Hi {{contact_name}}! 👋

Thanks for reaching out! I''d be happy to help you book an appointment.

What date and time works best for you? We have availability:
• {{available_slot_1}}
• {{available_slot_2}}
• {{available_slot_3}}

Let me know and I''ll get you scheduled!',
'Response to Instagram booking inquiries',
'["contact_name", "available_slot_1", "available_slot_2", "available_slot_3"]',
'Reply Booking',
'instagram');

INSERT OR IGNORE INTO templates (name, category, body, description, variables, quick_button_label, quick_button_icon) VALUES
('Facebook - General Inquiry', 'social',
'Hi {{contact_name}},

Thank you for your message!

{{custom_response}}

Is there anything else I can help you with?

Best regards,
Avatar Imaging Team',
'General Facebook inquiry response',
'["contact_name", "custom_response"]',
'Reply FB',
'facebook');

-- AI CONTEXT TEMPLATES
INSERT OR IGNORE INTO templates (name, category, body, description, ai_system_prompt, ai_temperature, ai_max_tokens, variables, quick_button_label, quick_button_icon, is_default) VALUES
('Analyze Contact Sentiment', 'ai_context',
'Analyze the sentiment and intent of the following contact interaction:

Contact: {{contact_name}}
Recent Messages: {{recent_messages}}
Interaction History: {{interaction_summary}}

Provide:
1. Overall sentiment (Positive/Neutral/Negative)
2. Primary intent or need
3. Urgency level (Low/Medium/High)
4. Recommended next action',
'Analyze contact sentiment and provide actionable insights',
'You are an expert CRM analyst specializing in customer sentiment analysis and relationship management. Provide concise, actionable insights.',
0.3,
512,
'["contact_name", "recent_messages", "interaction_summary"]',
'Analyze Sentiment',
'brain',
1);

INSERT OR IGNORE INTO templates (name, category, body, description, ai_system_prompt, ai_temperature, ai_max_tokens, variables, quick_button_label, quick_button_icon) VALUES
('Generate Personalized Response', 'ai_context',
'Generate a personalized response for this contact:

Contact Name: {{contact_name}}
Contact History: {{contact_history}}
Current Situation: {{current_context}}
Tone: {{tone}}

Create a natural, empathetic response that addresses their needs.',
'Generate AI-powered personalized message responses',
'You are a professional customer service representative for Avatar Imaging. Write warm, professional, and helpful responses that build trust and maintain relationships.',
0.7,
256,
'["contact_name", "contact_history", "current_context", "tone"]',
'Generate Response',
'sparkles');

INSERT OR IGNORE INTO templates (name, category, body, description, ai_system_prompt, ai_temperature, ai_max_tokens, variables, quick_button_label, quick_button_icon) VALUES
('Suggest Next Best Action', 'ai_context',
'Based on this contact''s profile, suggest the next best action:

Contact: {{contact_name}}
Pipeline Stage: {{current_stage}}
Last Interaction: {{last_interaction}}
Warmness Score: {{warmness_score}}
Recent Activity: {{recent_activity}}

Provide 3 specific, actionable recommendations ranked by priority.',
'AI-powered next best action recommendations',
'You are a strategic CRM advisor. Analyze contact data and provide data-driven recommendations for next best actions to move contacts through the pipeline.',
0.4,
384,
'["contact_name", "current_stage", "last_interaction", "warmness_score", "recent_activity"]',
'Get Suggestions',
'lightbulb');

INSERT OR IGNORE INTO templates (name, category, body, description, ai_system_prompt, ai_temperature, ai_max_tokens, variables, quick_button_label, quick_button_icon) VALUES
('Summarize Contact Journey', 'ai_context',
'Summarize the customer journey for:

Contact: {{contact_name}}
Journey Data: {{journey_data}}

Provide a concise summary highlighting:
- Key milestones
- Engagement patterns
- Current status
- Opportunities',
'AI summary of contact journey and engagement',
'You are a CRM analyst creating executive summaries. Be concise, highlight key insights, and identify opportunities.',
0.5,
384,
'["contact_name", "journey_data"]',
'Summarize Journey',
'map');

-- NOTIFICATION TEMPLATES
INSERT OR IGNORE INTO templates (name, category, subject, body, description, variables) VALUES
('New Lead Notification', 'notification', 'New Lead: {{contact_name}}',
'A new lead has been added to the system:

Name: {{contact_name}}
Source: {{source}}
Phone: {{phone}}
Email: {{email}}

Please review and assign to appropriate staff member.',
'Internal notification for new leads',
'["contact_name", "source", "phone", "email"]');

INSERT OR IGNORE INTO templates (name, category, subject, body, description, variables) VALUES
('Urgent Task Alert', 'notification', 'Urgent Task: {{task_title}}',
'You have an urgent task that requires attention:

Task: {{task_title}}
Contact: {{contact_name}}
Due: {{due_date}}
Priority: HIGH

Please address this as soon as possible.',
'Alert for urgent tasks',
'["task_title", "contact_name", "due_date"]');
