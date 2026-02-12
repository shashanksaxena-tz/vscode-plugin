CREATE OR REPLACE FUNCTION update_cohort_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE cohorts
        SET member_count = (SELECT count(*) FROM cohort_members WHERE cohort_id = OLD.cohort_id)
        WHERE id = OLD.cohort_id;
        RETURN OLD;
    ELSE
        UPDATE cohorts
        SET member_count = (SELECT count(*) FROM cohort_members WHERE cohort_id = NEW.cohort_id)
        WHERE id = NEW.cohort_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cohort_member_change ON cohort_members;
CREATE TRIGGER on_cohort_member_change
AFTER INSERT OR DELETE ON cohort_members
FOR EACH ROW EXECUTE PROCEDURE update_cohort_member_count();

-- Recalculate for existing cohorts to ensure consistency
UPDATE cohorts c
SET member_count = (
    SELECT count(*)
    FROM cohort_members cm
    WHERE cm.cohort_id = c.id
);
