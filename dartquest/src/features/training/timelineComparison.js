export function friendMetricRecords(rows, metrics) {
  return metrics.map(metric => {
    const record = rows.reduce((best,row) => !best || (metric.lower ? metric.value(row)<metric.value(best) : metric.value(row)>metric.value(best)) ? row : best, null)
    return {...metric,record,best:record?metric.value(record):0}
  })
}
