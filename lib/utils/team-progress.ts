const PROGRESS_TARGET_COLOR = { r: 0, g: 172, b: 105 }; // #00ac69
const PROGRESS_BASE_COLOR = { r: 255, g: 255, b: 255 }; // white

export function teamNameFromSlot(slot: number): string {
  let name = '';
  let num = slot;
  while (num > 0) {
    const remainder = (num - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
}

export function getProgressColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = Math.round(PROGRESS_BASE_COLOR.r + (PROGRESS_TARGET_COLOR.r - PROGRESS_BASE_COLOR.r) * clamped);
  const g = Math.round(PROGRESS_BASE_COLOR.g + (PROGRESS_TARGET_COLOR.g - PROGRESS_BASE_COLOR.g) * clamped);
  const b = Math.round(PROGRESS_BASE_COLOR.b + (PROGRESS_TARGET_COLOR.b - PROGRESS_BASE_COLOR.b) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getProgressTextColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  return clamped >= 0.5 ? '#ffffff' : '#333333';
}
