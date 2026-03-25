import { createClient } from "../utils/supabase";
import { EmailService } from "../services/email";
import { startOfWeek, subWeeks } from "date-fns";

export async function weeklyDigest() {
  console.log("Starting weekly email digest job...");
  const supabase = createClient();
  const emailService = new EmailService();

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const previousWeekStart = subWeeks(currentWeekStart, 1);
  const currentWeekDateStr = currentWeekStart.toISOString().split("T")[0];
  const previousWeekDateStr = previousWeekStart.toISOString().split("T")[0];

  // Fetch all quality scores for the current week
  const { data: currentScores, error: currentScoresError } = await supabase
    .from("quality_scores")
    .select("*")
    .eq("week_start_date", currentWeekDateStr);

  if (currentScoresError) {
    console.error("Error fetching current week scores:", currentScoresError);
    return;
  }

  if (!currentScores || currentScores.length === 0) {
    console.log("No scores found for the current week.");
    return;
  }

  // Fetch all quality scores for the previous week to calculate change
  const { data: previousScores, error: previousScoresError } = await supabase
    .from("quality_scores")
    .select("user_id, overall_score")
    .eq("week_start_date", previousWeekDateStr);

  if (previousScoresError) {
    console.error("Error fetching previous week scores:", previousScoresError);
  }

  const prevScoresMap = new Map<string, number>();
  if (previousScores) {
    previousScores.forEach((s: any) => prevScoresMap.set(s.user_id, s.overall_score));
  }

  for (const score of currentScores) {
    const userEmail = score.user_id;
    if (!userEmail || !userEmail.includes('@')) {
      console.warn(`Skipping invalid email: ${userEmail}`);
      continue;
    }

    const currentScore = score.overall_score || 0;
    const prevScore = prevScoresMap.get(userEmail);

    let scoreChangeText = "No previous data";
    if (prevScore !== undefined) {
      const diff = currentScore - prevScore;
      if (diff > 0) {
        scoreChangeText = `+${diff} points from last week`;
      } else if (diff < 0) {
        scoreChangeText = `${diff} points from last week`;
      } else {
        scoreChangeText = "No change from last week";
      }
    }

    // Safely parse JSON arrays from DB (they might come as string or array)
    let insights = [];
    if (Array.isArray(score.insights)) {
        insights = score.insights;
    } else if (typeof score.insights === 'string') {
        try { insights = JSON.parse(score.insights); } catch (e) {}
    }

    let suggestions = [];
    if (Array.isArray(score.suggestions)) {
        suggestions = score.suggestions;
    } else if (typeof score.suggestions === 'string') {
        try { suggestions = JSON.parse(score.suggestions); } catch (e) {}
    }

    const wins = insights.slice(0, 2);
    const improvements = suggestions.slice(0, 2);
    const tips = suggestions.slice(2, 5); // Fallback if more suggestions exist, or could use another source

    // Generate HTML
    let html = `
      <h2>Your Weekly Copilot Analytics Digest</h2>
      <p><strong>Overall Score:</strong> ${currentScore}/100</p>
      <p><strong>Weekly Change:</strong> ${scoreChangeText}</p>
    `;

    if (wins.length > 0) {
      html += `<h3>Top Wins</h3><ul>`;
      wins.forEach((w: string) => html += `<li>${w}</li>`);
      html += `</ul>`;
    }

    if (improvements.length > 0) {
      html += `<h3>Areas for Improvement</h3><ul>`;
      improvements.forEach((i: string) => html += `<li>${i}</li>`);
      html += `</ul>`;
    }

    if (tips.length > 0) {
      html += `<h3>Actionable Tips</h3><ul>`;
      tips.forEach((t: string) => html += `<li>${t}</li>`);
      html += `</ul>`;
    }

    html += `
      <br>
      <p><a href="http://localhost:3000/dashboard">View Full Scorecard on Dashboard</a></p>
      <p>Keep up the great work!</p>
    `;

    try {
      await emailService.sendEmail({
        to: userEmail,
        subject: "Your Weekly Copilot Analytics Digest",
        html: html
      });
      console.log(`Sent weekly digest to ${userEmail}`);
    } catch (err) {
      console.error(`Failed to send digest to ${userEmail}:`, err);
    }
  }
}
