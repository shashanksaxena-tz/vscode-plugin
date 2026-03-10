-- Add foreign key constraints for user_id columns referencing users(email)

-- daily_metrics
ALTER TABLE daily_metrics
ADD CONSTRAINT daily_metrics_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(email)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- quality_scores
ALTER TABLE quality_scores
ADD CONSTRAINT quality_scores_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(email)
ON UPDATE CASCADE
ON DELETE CASCADE;
