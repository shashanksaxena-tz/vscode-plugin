import { createClient } from "../utils/supabase";
import { EmailService } from "../services/email";
import { startOfWeek, subWeeks, subDays } from "date-fns";
import { logAudit } from "../utils/audit";

export async function weeklyDigest() {
  console.log("Starting weekly digest job...");
  const supabase = createClient();
  const emailService = new EmailService();

  // 1. Get the current and previous week start dates
  // Assuming this runs on Monday morning, we want the digest for the week that just ended.
  // wait, the quality_scores week_start_date is typically Monday.
  // Let's get the score for the week that just completed (which means the week starting 7 days ago).
  const lastWeekStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
  const twoWeeksAgoStart = subWeeks(lastWeekStart, 1);

  const lastWeekStr = lastWeekStart.toISOString().split('T')[0];
  const twoWeeksAgoStr = twoWeeksAgoStart.toISOString().split('T')[0];

  // 2. Fetch all quality scores for last week
  const { data: currentScores, error: currentError } = await supabase
    .from('quality_scores')
    .select('*')
    .eq('week_start_date', lastWeekStr);

  if (currentError) {
    console.error("Error fetching current week quality scores:", currentError);
    return;
  }

  if (!currentScores || currentScores.length === 0) {
    console.log("No quality scores found for the last week.");
    return;
  }

  // 3. Fetch all quality scores for two weeks ago (for comparison)
  const { data: prevScores, error: prevError } = await supabase
    .from('quality_scores')
    .select('*')
    .eq('week_start_date', twoWeeksAgoStr);

  if (prevError) {
    console.error("Error fetching previous week quality scores:", prevError);
    // Non-fatal, we just won't show comparison
  }

  const prevScoreMap = new Map();
  if (prevScores) {
      for (const score of prevScores) {
          prevScoreMap.set(score.user_id, score.overall_score);
      }
  }

  let emailsSent = 0;

  // 4. Generate and send email for each user
  for (const score of currentScores) {
      const userId = score.user_id;
      if (!userId.includes('@')) {
          continue; // Skip if it's not a valid email format
      }

      const prevScore = prevScoreMap.get(userId);
      let scoreChangeText = "";
      if (prevScore !== undefined) {
          const diff = score.overall_score - prevScore;
          if (diff > 0) {
              scoreChangeText = `(+${diff} from last week) 📈`;
          } else if (diff < 0) {
              scoreChangeText = `(${diff} from last week) 📉`;
          } else {
              scoreChangeText = `(No change from last week) ➖`;
          }
      }

      // Format Insights and Suggestions
      const insightsList = (score.insights || []).slice(0, 3).map((i: string) => `<li>${i}</li>`).join('');
      const suggestionsList = (score.suggestions || []).slice(0, 3).map((s: string) => `<li>${s}</li>`).join('');

      const emailHtml = `
          <h2>Your Weekly Copilot Analytics Digest</h2>
          <p>Here is your summary for the week starting ${lastWeekStr}:</p>

          <h3>Overall Score: ${score.overall_score} ${scoreChangeText}</h3>

          <div style="display: flex; gap: 20px;">
              <div>
                  <h4>Score Breakdown</h4>
                  <ul>
                      <li><strong>Effectiveness:</strong> ${score.effectiveness_score}</li>
                      <li><strong>Best Practices:</strong> ${score.best_practices_score}</li>
                      <li><strong>Efficiency:</strong> ${score.efficiency_score}</li>
                  </ul>
              </div>
          </div>

          ${insightsList ? `
          <h4>Key Insights 🔍</h4>
          <ul>
              ${insightsList}
          </ul>
          ` : ''}

          ${suggestionsList ? `
          <h4>Actionable Tips 💡</h4>
          <ul>
              ${suggestionsList}
          </ul>
          ` : ''}

          <p style="margin-top: 20px;">
              <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View Full Dashboard</a>
          </p>
      `;

      try {
          await emailService.sendEmail({
              to: userId,
              subject: `Weekly Copilot Digest: Score ${score.overall_score}`,
              html: emailHtml
          });

          emailsSent++;

          // Log the action
          await logAudit({
              user_email: "system@batchprocessor.local",
              action: "send_weekly_digest",
              target_resource: userId,
              details: { week_start_date: lastWeekStr, score: score.overall_score }
          });

      } catch (e) {
          console.error(`Failed to send weekly digest to ${userId}:`, e);
      }
  }

  console.log(`Weekly digest job completed. Sent ${emailsSent} emails.`);
}
