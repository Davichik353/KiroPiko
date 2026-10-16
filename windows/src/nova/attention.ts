/** Unknown OS state never pretends a call or fullscreen app was detected. */
export function quietPolicy(manual: boolean, automatic: boolean, osState: number | null): boolean {
  return manual || automatic && osState != null && [1, 2, 3, 4, 6].includes(osState);
}
