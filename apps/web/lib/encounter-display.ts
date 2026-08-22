const queueDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatEncounterQueueDate(queueDate: string): string {
  const parsed = new Date(`${queueDate}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? queueDate
    : queueDateFormatter.format(parsed);
}
