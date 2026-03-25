-- Function to update cohort member count
CREATE OR REPLACE FUNCTION update_cohort_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE cohorts
        SET member_count = (SELECT count(*) FROM cohort_members WHERE cohort_id = NEW.cohort_id)
        WHERE id = NEW.cohort_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE cohorts
        SET member_count = (SELECT count(*) FROM cohort_members WHERE cohort_id = OLD.cohort_id)
        WHERE id = OLD.cohort_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on insert or delete
CREATE TRIGGER on_cohort_member_change
AFTER INSERT OR DELETE ON cohort_members
FOR EACH ROW
EXECUTE FUNCTION update_cohort_member_count();
