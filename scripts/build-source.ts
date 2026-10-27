/** CI supplies the exact checked-out commit; local builds make no provenance claim. */
export function buildSourceCommit(value: string | undefined): string {
  if (value === undefined) return 'local';
  if (!/^[0-9a-f]{40}$/i.test(value)) throw new Error('SOURCE_COMMIT must be a full 40-character Git commit SHA.');
  return value.toLowerCase();
}
