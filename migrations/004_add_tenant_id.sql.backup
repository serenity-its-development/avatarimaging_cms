-- Add tenant_id column to contacts table for multi-tenancy support
ALTER TABLE contacts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';

-- Add index for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id, created_at DESC);
