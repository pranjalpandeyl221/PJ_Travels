import type { PlanResponse } from '../types';

function plan(resp: PlanResponse) {
  return resp.final_plan;
}

function fmt(n: number | string | undefined, currency = 'INR'): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return isNaN(v) ? `${currency} 0` : `${currency} ${v.toLocaleString()}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ----- HTML generator -------------------------------------------------------

export function generateTripHTML(resp: PlanResponse): string {
  const p = plan(resp);
  if (!p) return '<p>No plan data available.</p>';

  const daysHTML = p.itinerary.map((d) => `
    <div class="day-card">
      <h3>Day ${d.day}: ${d.title}</h3>
      <div class="slot"><strong>Morning:</strong> ${d.morning}</div>
      <div class="slot"><strong>Afternoon:</strong> ${d.afternoon}</div>
      <div class="slot"><strong>Evening:</strong> ${d.evening}</div>
      ${d.meals?.length ? `<div class="slot"><strong>Meals:</strong> ${d.meals.join(' · ')}</div>` : ''}
      ${d.notes?.length ? `<div class="slot notes"><strong>Notes:</strong> ${d.notes.join(' · ')}</div>` : ''}
    </div>
  `).join('\n');

  const tipsHTML = p.travel_tips?.length
    ? `<h2>Travel Tips</h2><ul>${p.travel_tips.map((t) => `<li>${t}</li>`).join('')}</ul>`
    : '';

  const budgetHTML = `
    <h2>Budget (${p.budget.currency})</h2>
    <table>
      <tr><td>Transportation</td><td>${fmt(p.budget.transportation)}</td></tr>
      <tr><td>Accommodation</td><td>${fmt(p.budget.accommodation)}</td></tr>
      <tr><td>Food</td><td>${fmt(p.budget.food)}</td></tr>
      <tr><td>Activities</td><td>${fmt(p.budget.activities)}</td></tr>
      <tr><td>Local Transport</td><td>${fmt(p.budget.local_transport)}</td></tr>
      <tr><td>Contingency</td><td>${fmt(p.budget.contingency)}</td></tr>
      <tr class="total"><td><strong>Total</strong></td><td><strong>${fmt(p.budget.total_estimated_cost)}</strong></td></tr>
    </table>
    ${p.budget.savings_tips?.length
      ? `<h3>Savings Tips</h3><ul>${p.budget.savings_tips.map((t) => `<li>${t}</li>`).join('')}</ul>`
      : ''}
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.intent.destination} Travel Plan — Horizon</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f5f0; color: #3d352c; line-height: 1.6; }
  .container { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
  h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.3rem; margin: 1.5rem 0 0.75rem; border-bottom: 2px solid #e8e0d6; padding-bottom: 0.3rem; }
  h3 { font-size: 1.1rem; margin: 0 0 0.5rem; color: #6b5843; }
  .subtitle { color: #8a7a68; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .summary { background: #fff; border: 1px solid #e8e0d6; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
  .day-card { background: #fff; border: 1px solid #e8e0d6; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
  .slot { font-size: 0.9rem; margin: 0.4rem 0; color: #5a4e3e; }
  .slot.notes { background: #f5f0e8; border-radius: 6px; padding: 0.4rem 0.6rem; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
  td { padding: 0.5rem 1rem; border-bottom: 1px solid #f0ebe4; font-size: 0.9rem; }
  td:last-child { text-align: right; font-weight: 600; }
  .total td { border-bottom: none; border-top: 2px solid #3d352c; }
  ul { padding-left: 1.25rem; font-size: 0.9rem; color: #5a4e3e; }
  li { margin: 0.3rem 0; }
  .footer { margin-top: 2rem; font-size: 0.75rem; color: #8a7a68; text-align: center; border-top: 1px solid #e8e0d6; padding-top: 1rem; }
</style>
</head>
<body>
<div class="container">
  <h1>${p.intent.destination}</h1>
  <p class="subtitle">${p.intent.duration_days}-day trip · ${p.intent.travelers} traveler(s) · ${p.intent.travel_style} style · Generated ${formatDate()}</p>
  <div class="summary">${p.executive_summary}</div>
  <h2>Destination Overview</h2>
  <p>${p.destination_overview}</p>
  <h2>Itinerary</h2>
  ${daysHTML}
  ${budgetHTML}
  ${tipsHTML}
  <div class="footer">Created with Horizon Travel Planner</div>
</div>
</body>
</html>`;
}

// ----- TXT generator --------------------------------------------------------

export function generateTripTXT(resp: PlanResponse): string {
  const p = plan(resp);
  if (!p) return 'No plan data available.';

  const lines: string[] = [];
  lines.push(`${'='.repeat(60)}`);
  lines.push(`  ${p.intent.destination.toUpperCase()}`);
  lines.push(`${'='.repeat(60)}`);
  lines.push(`${p.intent.duration_days}-day trip · ${p.intent.travelers} traveler(s) · ${p.intent.travel_style} style`);
  lines.push(`Generated ${formatDate()}`);
  lines.push('');

  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(p.executive_summary);
  lines.push('');

  lines.push('DESTINATION OVERVIEW');
  lines.push('-'.repeat(40));
  lines.push(p.destination_overview);
  lines.push('');

  lines.push('ITINERARY');
  lines.push('-'.repeat(40));
  for (const d of p.itinerary) {
    lines.push(`Day ${d.day}: ${d.title}`);
    lines.push(`  Morning:   ${d.morning}`);
    lines.push(`  Afternoon: ${d.afternoon}`);
    lines.push(`  Evening:   ${d.evening}`);
    if (d.meals?.length) lines.push(`  Meals:     ${d.meals.join(', ')}`);
    if (d.notes?.length) lines.push(`  Notes:     ${d.notes.join(' · ')}`);
    lines.push('');
  }

  lines.push(`BUDGET (${p.budget.currency})`);
  lines.push('-'.repeat(40));
  lines.push(`  Transportation:  ${fmt(p.budget.transportation)}`);
  lines.push(`  Accommodation:   ${fmt(p.budget.accommodation)}`);
  lines.push(`  Food:            ${fmt(p.budget.food)}`);
  lines.push(`  Activities:      ${fmt(p.budget.activities)}`);
  lines.push(`  Local Transport: ${fmt(p.budget.local_transport)}`);
  lines.push(`  Contingency:     ${fmt(p.budget.contingency)}`);
  lines.push(`  TOTAL:           ${fmt(p.budget.total_estimated_cost)}`);
  if (p.budget.savings_tips?.length) {
    lines.push('');
    lines.push('Savings Tips:');
    p.budget.savings_tips.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  lines.push('');

  if (p.travel_tips?.length) {
    lines.push('TRAVEL TIPS');
    lines.push('-'.repeat(40));
    p.travel_tips.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
    lines.push('');
  }

  lines.push(`${'='.repeat(60)}`);
  lines.push('  Created with Horizon Travel Planner');
  return lines.join('\n');
}

// ----- Share helpers --------------------------------------------------------

export function generateRichPlan(resp: PlanResponse): string {
  const p = plan(resp);
  if (!p) return 'No plan available.';

  const lines: string[] = [];
  const dest = p.intent.destination;
  const days = p.intent.duration_days;
  const travellers = p.intent.travelers;
  const style = p.intent.travel_style;
  const cur = p.budget.currency;

  // Header
  lines.push(`🌍 *TRIP TO ${dest.toUpperCase()}*`);
  lines.push(`📅 ${days} day(s) · ${travellers} traveler(s) · ${style} style`);
  lines.push('');
  lines.push(`📋 ${p.executive_summary}`);
  lines.push('');

  // Pricing summary
  const budgetLine = `💰 *Budget:* ${fmt(p.budget.total_estimated_cost, cur)}`;
  const budgetStatus = p.budget.within_budget
    ? `✅ Within budget`
    : `⚠️ Over budget by ${fmt(p.budget.total_estimated_cost - (p.intent.budget_limit ?? 0), cur)}`;
  lines.push(`${budgetLine}  ${budgetStatus}`);
  if (p.intent.budget_limit != null) {
    lines.push(`   Limit: ${fmt(p.intent.budget_limit, cur)}`);
  }
  lines.push('');

  // Itinerary
  lines.push(`📅 *ITINERARY*`);
  lines.push(`──────────────────────────`);
  for (const d of p.itinerary) {
    lines.push(`*Day ${d.day}: ${d.title}*`);
    lines.push(`  🌅 ${d.morning}`);
    lines.push(`  ☀️ ${d.afternoon}`);
    lines.push(`  🌙 ${d.evening}`);
    if (d.meals?.length) lines.push(`  🍽️ Meals: ${d.meals.join(', ')}`);
    if (d.notes?.length) lines.push(`  💡 ${d.notes.join(' · ')}`);
    lines.push('');
  }

  // Budget breakdown
  lines.push(`💰 *BUDGET (${cur})*`);
  lines.push(`──────────────────────────`);
  lines.push(`  🚗 Transportation:  ${fmt(p.budget.transportation, cur)}`);
  lines.push(`  🏨 Accommodation:   ${fmt(p.budget.accommodation, cur)}`);
  lines.push(`  🍕 Food:            ${fmt(p.budget.food, cur)}`);
  lines.push(`  🎯 Activities:      ${fmt(p.budget.activities, cur)}`);
  lines.push(`  🚌 Local Transport: ${fmt(p.budget.local_transport, cur)}`);
  lines.push(`  🆘 Contingency:     ${fmt(p.budget.contingency, cur)}`);
  lines.push(`  ──────────────────────────`);
  lines.push(`  💰 *TOTAL: ${fmt(p.budget.total_estimated_cost, cur)}*`);
  if (p.budget.savings_tips?.length) {
    lines.push('');
    lines.push(`💡 *Savings Tips:*`);
    p.budget.savings_tips.forEach((t) => lines.push(`  • ${t}`));
  }
  lines.push('');

  // Travel tips
  if (p.travel_tips?.length) {
    lines.push(`✅ *TRAVEL TIPS*`);
    lines.push(`──────────────────────────`);
    p.travel_tips.forEach((t) => lines.push(`  • ${t}`));
    lines.push('');
  }

  // Research highlights
  if (p.research?.top_attractions?.length) {
    lines.push(`🏆 *TOP ATTRACTIONS*`);
    p.research.top_attractions.slice(0, 6).forEach((a) => lines.push(`  • ${a}`));
    lines.push('');
  }

  lines.push(`_Created with Horizon Travel Planner_`);
  return lines.join('\n');
}

export function generateShareWhatsApp(resp: PlanResponse): string {
  const text = generateRichPlan(resp);
  // WhatsApp Web URL — text param has generous limits (~64k chars)
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function generateShareMailTo(resp: PlanResponse): string {
  const p = plan(resp);
  if (!p) return 'mailto:';

  // Email gets the same rich plan as body
  const body = generateRichPlan(resp);

  // Add overview section at top for email context
  const fullBody = [
    `Hi!`,
    ``,
    `Here is the complete travel plan for my trip to ${p.intent.destination}.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    body,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Destination: ${p.intent.destination}`,
    `Duration: ${p.intent.duration_days} days`,
    `Travelers: ${p.intent.travelers}`,
    `Style: ${p.intent.travel_style}`,
    `Pacing: ${p.intent.pacing}`,
    `Best time to visit: ${p.research?.best_time_to_visit ?? 'N/A'}`,
    `Weather: ${p.research?.expected_weather ?? 'N/A'}`,
  ].join('\n');

  const subject = encodeURIComponent(`My trip to ${p.intent.destination} — Complete Travel Plan`);
  const bodyEncoded = encodeURIComponent(fullBody);
  return `mailto:?subject=${subject}&body=${bodyEncoded}`;
}
