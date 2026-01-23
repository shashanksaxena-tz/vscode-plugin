import { createClient } from "../utils/supabase";
import { EmailService } from "../services/email";
import { logAudit } from "../utils/audit";

const COHORTS = [
  {
    name: "Over-prompters",
    description: "Developers with high prompt volume but low acceptance rate.",
    criteria: {
        daily_prompt_count: ">50",
        acceptance_rate: "<40%"
    },
    coaching_plan: "Focus on prompt specificity and decomposing complex tasks.",
    check: (metrics: UserMetrics) => {
        const avgPrompts = metrics.total_prompts / metrics.days_active;
        const acceptanceRate = metrics.total_prompts > 0 ? metrics.accepted_count / metrics.total_prompts : 0;
        return avgPrompts > 50 && acceptanceRate < 0.4;
    }
  },
  {
    name: "Context-light users",
    description: "Developers who rarely include sufficient context files.",
    criteria: {
        avg_context_files: "<2"
    },
    coaching_plan: "Training on how to use @-mentions to include relevant files.",
    check: (metrics: UserMetrics) => {
        return metrics.avg_context_files < 2;
    }
  },
  {
    name: "Retry loopers",
    description: "Developers who frequently retry prompts without editing.",
    criteria: {
        retry_rate: ">30%"
    },
    coaching_plan: "Workshop on task breakdown and iterative prompting.",
    check: (metrics: UserMetrics) => {
        const retryRate = metrics.total_prompts > 0 ? metrics.retry_count / metrics.total_prompts : 0;
        return retryRate > 0.3;
    }
  },
  {
    name: "Expensive model users",
    description: "Developers using premium models (GPT-4, Claude) for simple tasks.",
    criteria: {
        premium_model_ratio: ">70%",
        avg_prompt_complexity: "low"
    },
    coaching_plan: "Model selection guidance: Use faster/cheaper models for simple completions, reserve premium models for complex analysis.",
    check: (metrics: UserMetrics) => {
        // High token usage relative to prompts suggests using expensive models
        const avgTokensPerPrompt = metrics.total_prompts > 0 ? metrics.total_tokens / metrics.total_prompts : 0;
        return avgTokensPerPrompt > 2000 && metrics.total_prompts > 20;
    }
  },
  {
    name: "Copy-paste acceptors",
    description: "Developers with very high acceptance rate but frequent immediate edits.",
    criteria: {
        acceptance_rate: ">90%",
        edit_after_accept_rate: ">50%"
    },
    coaching_plan: "Review-before-accept training: Take time to read suggestions before accepting to reduce post-acceptance edits.",
    check: (metrics: UserMetrics) => {
        const acceptanceRate = metrics.total_prompts > 0 ? metrics.accepted_count / metrics.total_prompts : 0;
        const editAfterAcceptRate = metrics.accepted_count > 0 ? metrics.edit_after_accept_count / metrics.accepted_count : 0;
        return acceptanceRate > 0.9 && editAfterAcceptRate > 0.5 && metrics.total_prompts > 10;
    }
  },
  {
    name: "Quick learners",
    description: "Developers showing significant score improvement.",
    criteria: {
        score_improvement: ">20 points in 4 weeks"
    },
    coaching_plan: "Consider as peer mentoring candidates. Share their success strategies with others.",
    check: (metrics: UserMetrics) => {
        // Score improvement tracked via quality_scores table
        return metrics.score_improvement > 20;
    }
  }
];

interface UserMetrics {
    user_id: string;
    total_prompts: number;
    accepted_count: number;
    retry_count: number;
    days_active: number;
    avg_context_files: number;
    total_tokens: number;
    edit_after_accept_count: number;
    score_improvement: number;
}

export async function cohortDetection() {
  console.log("Starting cohort detection job...");
  const supabase = createClient();
  const emailService = new EmailService();

  // 1. Fetch aggregated metrics for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data: metricsData, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('*')
    .gte('date', dateStr);

  if (metricsError) {
    console.error("Error fetching daily metrics:", metricsError);
    return;
  }

  if (!metricsData || metricsData.length === 0) {
    console.log("No metrics found for the last 7 days.");
    return;
  }

  // 2. Aggregate per user
  const userMetricsMap = new Map<string, UserMetrics>();

  for (const row of metricsData) {
    const userId = row.user_id;
    if (!userMetricsMap.has(userId)) {
        userMetricsMap.set(userId, {
            user_id: userId,
            total_prompts: 0,
            accepted_count: 0,
            retry_count: 0,
            days_active: 0,
            avg_context_files: 0,
            total_tokens: 0,
            edit_after_accept_count: 0,
            score_improvement: 0
        });
    }

    const m = userMetricsMap.get(userId)!;
    m.total_prompts += row.total_prompts || 0;
    m.accepted_count += row.accepted_count || 0;
    m.retry_count += row.retry_count || 0;
    m.days_active += 1;
    m.total_tokens += row.total_tokens_used || 0;
    // Weighted average for context files? Or just simple average of daily avgs?
    // Let's do simple average of daily averages for now.
    m.avg_context_files += row.context_avg_files || 0;
  }

  // Finalize averages
  for (const m of userMetricsMap.values()) {
      if (m.days_active > 0) {
          m.avg_context_files = m.avg_context_files / m.days_active;
      }
  }

  // Fetch score improvement data from quality_scores (optional for "Quick learners" cohort)
  try {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksStr = fourWeeksAgo.toISOString().split('T')[0];

    const { data: scoresData, error: scoresError } = await supabase
      .from('quality_scores')
      .select('user_id, overall_score, week_start_date')
      .gte('week_start_date', fourWeeksStr);

    if (!scoresError && scoresData && scoresData.length > 0) {
      // Sort by date
      scoresData.sort((a, b) => new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime());

      // Group scores by user
      const userScores = new Map<string, number[]>();
      for (const score of scoresData) {
        if (!userScores.has(score.user_id)) {
          userScores.set(score.user_id, []);
        }
        userScores.get(score.user_id)!.push(score.overall_score);
      }

      // Calculate improvement (latest - earliest)
      for (const [userId, scores] of userScores) {
        if (scores.length >= 2) {
          const improvement = scores[scores.length - 1] - scores[0];
          const metrics = userMetricsMap.get(userId);
          if (metrics) {
            metrics.score_improvement = improvement;
          }
        }
      }
    }
  } catch (err) {
    // Score improvement data is optional; continue without it
    console.log("Could not fetch score improvement data:", err);
  }

  // 3. Evaluate cohorts
  for (const cohortDef of COHORTS) {
    console.log(`Processing cohort: ${cohortDef.name}`);

    // Check if cohort exists
    const { data: existingCohort, error: fetchError } = await supabase
        .from('cohorts')
        .select('id')
        .eq('name', cohortDef.name)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
         console.error(`Error fetching cohort ${cohortDef.name}:`, fetchError);
         continue;
    }

    let cohortId;
    if (existingCohort) {
        cohortId = existingCohort.id;
        // Update details
        await supabase
            .from('cohorts')
            .update({
                description: cohortDef.description,
                criteria: cohortDef.criteria,
                coaching_plan: cohortDef.coaching_plan,
                updated_at: new Date().toISOString()
            })
            .eq('id', cohortId);
    } else {
        // Insert new
        const { data: newCohort, error: insertError } = await supabase
            .from('cohorts')
            .insert({
                name: cohortDef.name,
                description: cohortDef.description,
                criteria: cohortDef.criteria,
                coaching_plan: cohortDef.coaching_plan,
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (insertError || !newCohort) {
            console.error(`Error creating cohort ${cohortDef.name}:`, insertError);
            continue;
        }
        cohortId = newCohort.id;
    }
    let memberCount = 0;

    // Identify members
    for (const userMetrics of userMetricsMap.values()) {
        if (cohortDef.check(userMetrics)) {
            // Check if already in cohort to avoid spamming emails (optimization)
            const { data: existingMember } = await supabase
                .from('cohort_members')
                .select('joined_at')
                .eq('cohort_id', cohortId)
                .eq('user_id', userMetrics.user_id)
                .single();

            // Add to cohort
            const { error: memberError } = await supabase
                .from('cohort_members')
                .upsert({
                    cohort_id: cohortId,
                    user_id: userMetrics.user_id,
                    joined_at: existingMember ? existingMember.joined_at : new Date().toISOString()
                }, { onConflict: 'cohort_id,user_id' }); // Conflict on PK

            if (memberError) {
                console.error(`Error adding user ${userMetrics.user_id} to cohort ${cohortDef.name}:`, memberError);
            } else {
                memberCount++;

                // Actions if new member
                if (!existingMember) {
                    const userEmail = userMetrics.user_id;

                    // 1. Log audit
                    await logAudit({
                        user_email: userEmail,
                        action: "cohort_assignment",
                        target_resource: cohortDef.name,
                        details: {
                            cohort_id: cohortId,
                            reason: "Met criteria",
                            metrics: userMetrics
                        }
                    });

                    // 2. Send email
                    if (userEmail && userEmail.includes('@')) {
                        await emailService.sendEmail({
                            to: userEmail,
                            subject: `Copilot Analytics: You've been added to the ${cohortDef.name} cohort`,
                            html: `
                                <h2>Cohort Notification</h2>
                                <p>Based on your recent usage patterns, you have been identified as part of the <strong>${cohortDef.name}</strong> group.</p>
                                <p><strong>Description:</strong> ${cohortDef.description}</p>
                                <p><strong>Coaching Plan:</strong> ${cohortDef.coaching_plan}</p>
                                <p>Check your dashboard for more details.</p>
                            `
                        });
                        console.log(`Sent notification email to ${userEmail} for cohort ${cohortDef.name}`);
                    }
                }
            }
        } else {
            // Remove from cohort if they no longer match
            const { error: removeError } = await supabase
                .from('cohort_members')
                .delete()
                .eq('cohort_id', cohortId)
                .eq('user_id', userMetrics.user_id);

            if (removeError) {
                 // console.error(`Error removing user ${userMetrics.user_id} from cohort ${cohortDef.name}:`, removeError);
            }
        }
    }

    // Update member count
    await supabase
        .from('cohorts')
        .update({ member_count: memberCount })
        .eq('id', cohortId);

    console.log(`Cohort ${cohortDef.name} updated with ${memberCount} members.`);
  }

  console.log("Cohort detection job completed.");
}
