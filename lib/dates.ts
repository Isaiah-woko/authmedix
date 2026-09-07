// Countdown + date helpers. In MediTrust, time is always visible.

export interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export function getTimeRemaining(expiresAt: string): TimeRemaining {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired: false,
  };
}

/** "01:59:59" — live countdown shown next to the relevant action */
export function formatCountdown(expiresAt: string): string {
  const { hours, minutes, seconds, isExpired } = getTimeRemaining(expiresAt);
  if (isExpired) return "Expired";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** True when <= minutesLeft remain — used to switch a countdown to Amber Watch */
export function isExpiringSoon(expiresAt: string, minutesLeft = 30): boolean {
  const { totalSeconds, isExpired } = getTimeRemaining(expiresAt);
  return !isExpired && totalSeconds <= minutesLeft * 60;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}