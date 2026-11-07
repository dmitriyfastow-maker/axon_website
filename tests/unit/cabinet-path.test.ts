import { describe, expect, it } from 'vitest';
import { pathNext, type PathFacts } from '../../src/components/cabinet/path';

const none: PathFacts = { email: false, profile: false, project: false, site: false, lead: false, review: false, friend: false };

describe('cabinet path: next step', () => {
  it('starts with the email for a new client', () => {
    expect(pathNext(none)).toBe('email');
  });
  it('goes in order', () => {
    expect(pathNext({ ...none, email: true })).toBe('profile');
    expect(pathNext({ ...none, email: true, profile: true, project: true })).toBe('site');
  });
  it('skips the review until a project is delivered', () => {
    const f = { ...none, email: true, profile: true, project: true, site: true, lead: true };
    expect(pathNext(f)).toBe('friend');
    expect(pathNext({ ...f, reviewOpen: { id: 1 } })).toBe('review');
  });
  it('shows nothing when only an unavailable review is left', () => {
    expect(pathNext({ ...none, email: true, profile: true, project: true, site: true, lead: true, friend: true })).toBeUndefined();
  });
  it('shows nothing when all is done', () => {
    expect(pathNext({ email: true, profile: true, project: true, site: true, lead: true, review: true, friend: true })).toBeUndefined();
  });
});
