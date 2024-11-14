-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME,
    target_audience TEXT NOT NULL CHECK (target_audience IN ('ELDER', 'FAMILY')),
    recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY')),
    recurrence_day INTEGER,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_family ON reminders(family_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view reminders for their families"
ON reminders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = reminders.family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create reminders for their families"
ON reminders FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM family_members
        WHERE family_members.family_id = family_id
        AND family_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own reminders"
ON reminders FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reminders"
ON reminders FOR DELETE
USING (user_id = auth.uid());