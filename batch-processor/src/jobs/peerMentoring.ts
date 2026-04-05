import { createClient } from "../utils/supabase";

interface UserScore {
  user_id: string;
  overall_score: number;
}

interface UserData {
  email: string;
  department: string;
}

export async function peerMentoring() {
  console.log("Starting peer mentoring matching job...");
  const supabase = createClient();

  // 1. Get the most recent week_start_date from quality_scores
  const { data: latestScore, error: latestScoreError } = await supabase
    .from("quality_scores")
    .select("week_start_date")
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single();

  if (latestScoreError || !latestScore) {
    console.log("No quality scores found to run peer mentoring.");
    return;
  }

  const latestWeek = latestScore.week_start_date;

  // 2. Fetch all scores for that week
  const { data: scores, error: scoresError } = await supabase
    .from("quality_scores")
    .select("user_id, overall_score")
    .eq("week_start_date", latestWeek);

  if (scoresError || !scores || scores.length === 0) {
    console.error("Error fetching scores for week", latestWeek, scoresError);
    return;
  }

  // 3. Fetch all users to get their departments
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("email, department");

  if (usersError || !users) {
    console.error("Error fetching users:", usersError);
    return;
  }

  const userMap = new Map<string, UserData>();
  for (const user of users) {
    userMap.set(user.email, user);
  }

  // 4. Group scores by department
  const deptScores = new Map<string, UserScore[]>();
  for (const score of scores) {
    const userData = userMap.get(score.user_id);
    if (!userData || !userData.department) continue;

    const dept = userData.department;
    if (!deptScores.has(dept)) {
      deptScores.set(dept, []);
    }
    deptScores.get(dept)!.push(score);
  }

  // 5. Match within departments
  let matchCount = 0;

  for (const [dept, deptUserScores] of deptScores.entries()) {
    if (deptUserScores.length < 2) continue; // Need at least 2 people to match

    // Sort ascending (lowest score first)
    deptUserScores.sort((a, b) => a.overall_score - b.overall_score);

    const totalInDept = deptUserScores.length;
    // Top 25% and bottom 25%
    const quartileSize = Math.max(1, Math.floor(totalInDept * 0.25));

    const bottomScorers = deptUserScores.slice(0, quartileSize);
    // Reverse the top scorers so we match the absolute lowest with the absolute highest
    const topScorers = deptUserScores.slice(totalInDept - quartileSize).reverse();

    for (let i = 0; i < quartileSize; i++) {
      const mentee = bottomScorers[i];
      const mentor = topScorers[i];

      if (mentee.user_id === mentor.user_id) continue; // Should only happen if totalInDept is very small, but quartileSize max(1) and length >=2 prevents this overlap if we use Math.floor(length*0.25) but let's be safe. Wait, if totalInDept = 2, quartileSize = 1. bottomScorers[0] is index 0. topScorers[0] is index 1. They are distinct.
      // If totalInDept = 3, quartileSize = 1. bottom[0] = index 0. top[0] = index 2. Distinct.
      // So they will be distinct.

      // Create notification for Mentee
      const { error: menteeNotifError } = await supabase
        .from("notifications")
        .insert({
          user_id: mentee.user_id,
          type: "mentoring",
          message: `Peer Mentoring Opportunity: Connect with ${mentor.user_id} from your department for tips on improving your Copilot usage.`,
          is_read: false
        });

      if (menteeNotifError) {
        console.error("Error inserting mentee notification:", menteeNotifError);
      }

      // Create notification for Mentor
      const { error: mentorNotifError } = await supabase
        .from("notifications")
        .insert({
          user_id: mentor.user_id,
          type: "mentoring",
          message: `Peer Mentoring Opportunity: You're doing great! Consider reaching out to ${mentee.user_id} in your department to share your Copilot best practices.`,
          is_read: false
        });

      if (mentorNotifError) {
        console.error("Error inserting mentor notification:", mentorNotifError);
      }

      matchCount++;
    }
  }

  console.log(`Peer mentoring matching completed. Created ${matchCount} matches.`);
}
