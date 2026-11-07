// The client's path on the cabinet map. Kept apart from the page so the rule for "what comes next" can be unit tested.
export type PathKey = 'email' | 'profile' | 'project' | 'site' | 'lead' | 'review' | 'friend';
export type PathFacts = Record<PathKey, unknown> & { reviewOpen?: unknown };

export const PATH_BRANCHES: PathKey[][] = [['email', 'profile'], ['project', 'site'], ['lead', 'review'], ['friend']];

// The next step must be one the client can take today. A review needs a delivered project, so until then it is skipped.
export function pathNext(f: PathFacts): PathKey | undefined {
  return PATH_BRANCHES.flat().find((k) => !f[k] && (k !== 'review' || !!f.reviewOpen));
}
