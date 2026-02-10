-- Add unique constraint for calendars to support upsert
-- Made idempotent with IF NOT EXISTS check
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendars_user_provider_unique'
    ) THEN
        ALTER TABLE calendars ADD CONSTRAINT calendars_user_provider_unique 
        UNIQUE (user_id, provider, provider_calendar_id);
    END IF;
END $$;

-- Add unique constraint for events to support upsert
-- Made idempotent with IF NOT EXISTS check and allow nulls for local events
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_provider_event_unique'
    ) THEN
        -- Create a unique index that allows null values
        CREATE UNIQUE INDEX events_provider_event_unique_idx 
        ON events (provider_event_id) 
        WHERE provider_event_id IS NOT NULL;
    END IF;
END $$;
