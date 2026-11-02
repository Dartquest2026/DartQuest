export function recentComparisonRows(rows) {
  return [...rows].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.id.localeCompare(b.id)).slice(-10)
}
export function comparisonColumns(own, friend) { return Math.max(1, Math.min(10,Math.max(own.length,friend.length))) }
