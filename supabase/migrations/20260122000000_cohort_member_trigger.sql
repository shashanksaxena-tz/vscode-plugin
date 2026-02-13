-- Function to update cohort member count
CREATE OR REPLACE FUNCTION update_cohort_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE cohorts
        SET member_count = member_count + 1
        WHERE id = NEW.cohort_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE cohorts
        SET member_count = member_count - 1
        WHERE id = OLD.cohort_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on insert or delete
CREATE TRIGGER on_cohort_member_change
AFTER INSERT OR DELETE ON cohort_members
FOR EACH ROW
EXECUTE FUNCTION update_cohort_member_count();
