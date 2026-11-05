-- 005: ciclo de vida de recurrencias (ocurrencia nominal, ancla de calendario,
-- reintentos finitos y consentimiento explícito). Sin PL/SQL: el ejecutor divide por punto y coma.

ALTER TABLE cx_recurrences ADD (occurrence_at TIMESTAMP WITH TIME ZONE);

ALTER TABLE cx_recurrences ADD (anchor_day NUMBER(2,0));

ALTER TABLE cx_recurrences ADD (retry_count NUMBER(2,0) DEFAULT 0 NOT NULL);

ALTER TABLE cx_recurrences ADD (consent_at TIMESTAMP WITH TIME ZONE);

UPDATE cx_recurrences SET status = 'paused' WHERE consent_at IS NULL AND status = 'active';

UPDATE cx_recurrences SET occurrence_at = next_run_at WHERE occurrence_at IS NULL;

UPDATE cx_recurrences
   SET anchor_day = EXTRACT(DAY FROM (next_run_at AT TIME ZONE 'UTC'))
 WHERE anchor_day IS NULL;

ALTER TABLE cx_recurrences MODIFY (occurrence_at NOT NULL);

ALTER TABLE cx_recurrences MODIFY (anchor_day NOT NULL);

ALTER TABLE cx_recurrences ADD CONSTRAINT cx_recurrences_anchor_ck CHECK (anchor_day BETWEEN 1 AND 31);

ALTER TABLE cx_recurrences ADD CONSTRAINT cx_recurrences_retry_ck CHECK (retry_count BETWEEN 0 AND 3);
