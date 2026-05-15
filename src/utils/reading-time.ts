export function getReadingTime(body: string): number {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#*_\[\]()>]/g, '');
  return Math.max(1, Math.ceil(text.length / 400));
}
