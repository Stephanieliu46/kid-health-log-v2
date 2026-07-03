export function formatCloseDateInput(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatCloseTimeInput(d: Date = new Date()): string {
  return d.toTimeString().slice(0, 5);
}

export function parseCloseTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}`).getTime();
}

export function resolveCloseTimestamp(options: {
  customized: boolean;
  showDate: boolean;
  showTime: boolean;
  endDate: string;
  endTime: string;
}): number {
  if (!options.customized) return Date.now();

  const now = new Date();
  const date = options.showDate ? options.endDate : formatCloseDateInput(now);
  const time = options.showTime ? options.endTime : formatCloseTimeInput(now);
  return parseCloseTimestamp(date, time);
}
