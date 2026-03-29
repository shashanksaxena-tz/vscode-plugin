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
  }
];

interface UserMetrics {
    user_id: string;
    total_prompts: number;
    accepted_count: number;
    retry_count: number;
    days_active: number;
    avg_context_files: number;
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

  // Debugging log for test failure
  console.log("Cohort Detection: Metrics Data from DB:", JSON.stringify(metricsData));

  if (!metricsData || metricsData.length === 0) {
    console.log("No metrics found for the last 7 days.");
    return;
  }

  // 1.5 Fetch user mapping (Email -> UUID) because cohort_members requires UUID
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, email');

  const emailToUuid = new Map<string, string>();
  if (usersData) {
      usersData.forEach(u => emailToUuid.set(u.email, u.id));
  } else if (usersError) {
      console.error("Error fetching users for ID lookup:", usersError);
  }

  // 2. Aggregate per user
  const userMetricsMap = new Map<string, UserMetrics>();
  const userDatesMap = new Map<string, Set<string>>();
  const userRowCountMap = new Map<string, number>();

  for (const row of metricsData) {
    const userId = row.user_id;
    if (!userMetricsMap.has(userId)) {
        userMetricsMap.set(userId, {
            user_id: userId,
            total_prompts: 0,
            accepted_count: 0,
            retry_count: 0,
            days_active: 0,
            avg_context_files: 0
        });
        userDatesMap.set(userId, new Set());
        userRowCountMap.set(userId, 0);
    }

    const m = userMetricsMap.get(userId)!;
    m.total_prompts += row.total_prompts || 0;
    m.accepted_count += row.accepted_count || 0;
    m.retry_count += row.retry_count || 0;
    m.avg_context_files += row.context_avg_files || 0;

    userDatesMap.get(userId)!.add(row.date);
    userRowCountMap.set(userId, userRowCountMap.get(userId)! + 1);
  }

  // Finalize averages
  for (const [userId, m] of userMetricsMap) {
      const dates = userDatesMap.get(userId)!;
      const rowCount = userRowCountMap.get(userId)!;

      m.days_active = dates.size;

      if (rowCount > 0) {
          m.avg_context_files = m.avg_context_files / rowCount;
      }
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
        const userUuid = emailToUuid.get(userMetrics.user_id);
        if (!userUuid) {
            console.warn(`Skipping user ${userMetrics.user_id} for cohort assignment (No UUID found).`);
            continue;
        }

        if (cohortDef.check(userMetrics)) {
            // Check if already in cohort to avoid spamming emails (optimization)
            const { data: existingMember } = await supabase
                .from('cohort_members')
                .select('joined_at')
                .eq('cohort_id', cohortId)
                .eq('user_id', userUuid)
                .single();

            // Add to cohort
            const { error: memberError } = await supabase
                .from('cohort_members')
                .upsert({
                    cohort_id: cohortId,
                    user_id: userUuid,
                    joined_at: existingMember ? existingMember.joined_at : new Date().toISOString()
                }, { onConflict: 'cohort_id,user_id' }); // Conflict on PK

            if (memberError) {
                console.error(`Error adding user ${userMetrics.user_id} (${userUuid}) to cohort ${cohortDef.name}:`, memberError);
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
                .eq('user_id', userUuid);

            if (removeError) {
                 // console.error(`Error removing user ${userMetrics.user_id} from cohort ${cohortDef.name}:`, removeError);
            }
        }
    }

    // Member count is automatically updated by the database trigger 'on_cohort_member_change'
  }

  console.log("Cohort detection job completed.");
}
