/**
 * Unit tests for shared/repo.ts pure functions.
 * These functions parse git remote URLs and PR references.
 * No mocking needed - pure inputs to outputs.
 */

import { describe, expect, it } from 'vitest';

import { parseGitHubRemoteUrl, parsePrRef } from '../../shared/repo.js';

describe('parseGitHubRemoteUrl', () => {
  it.each([
    // HTTPS format
    ['https://github.com/owner/repo.git', { owner: 'owner', repo: 'repo', fullName: 'owner/repo' }],
    ['https://github.com/owner/repo', { owner: 'owner', repo: 'repo', fullName: 'owner/repo' }],
    // SSH format
    ['git@github.com:owner/repo.git', { owner: 'owner', repo: 'repo', fullName: 'owner/repo' }],
    ['git@github.com:owner/repo', { owner: 'owner', repo: 'repo', fullName: 'owner/repo' }],
    // Repo names with dots (important edge case from CLAUDE.md)
    [
      'https://github.com/owner/repo.name.git',
      { owner: 'owner', repo: 'repo.name', fullName: 'owner/repo.name' },
    ],
    [
      'git@github.com:owner/repo.with.dots',
      { owner: 'owner', repo: 'repo.with.dots', fullName: 'owner/repo.with.dots' },
    ],
    // Real-world examples
    [
      'https://github.com/anthropics/claude-code.git',
      { owner: 'anthropics', repo: 'claude-code', fullName: 'anthropics/claude-code' },
    ],
    [
      'git@github.com:octocat/Hello-World.git',
      { owner: 'octocat', repo: 'Hello-World', fullName: 'octocat/Hello-World' },
    ],
  ])('parses "%s" correctly', (url, expected) => {
    const result = parseGitHubRemoteUrl(url);
    expect(result).not.toBeNull();
    expect(result?.owner).toBe(expected.owner);
    expect(result?.repo).toBe(expected.repo);
    expect(result?.fullName).toBe(expected.fullName);
    expect(result?.remoteUrl).toBe(url);
  });

  it.each([
    // Invalid URLs
    ['invalid'],
    ['https://gitlab.com/owner/repo.git'],
    ['https://bitbucket.org/owner/repo.git'],
    ['file://github.com/owner/repo.git'],
    // Malformed URLs
    [''],
    ['https://github.com/'],
    ['https://github.com/owner'],
    ['git@github.com:'],
    ['git@github.com:owner'],
    // Not GitHub
    ['https://api.github.com/repos/owner/repo'],
  ])('returns null for invalid URL: "%s"', (url) => {
    expect(parseGitHubRemoteUrl(url)).toBeNull();
  });
});

describe('parsePrRef', () => {
  it.each([
    // Pure numbers
    ['1', { type: 'number', value: 1 }],
    ['123', { type: 'number', value: 123 }],
    ['9999', { type: 'number', value: 9999 }],
    // GitHub URLs (now extract owner/repo)
    [
      'https://github.com/owner/repo/pull/123',
      { type: 'number', value: 123, owner: 'owner', repo: 'repo' },
    ],
    [
      'https://github.com/octocat/Hello-World/pull/42',
      { type: 'number', value: 42, owner: 'octocat', repo: 'Hello-World' },
    ],
    // URL edge cases - query strings and fragments are handled gracefully
    [
      'https://github.com/owner/repo/pull/456?comment=789',
      { type: 'number', value: 456, owner: 'owner', repo: 'repo' },
    ],
    [
      'https://github.com/owner/repo/pull/789#issuecomment-123',
      { type: 'number', value: 789, owner: 'owner', repo: 'repo' },
    ],
    // URL without protocol (normalized by URL constructor)
    [
      'github.com/owner/repo/pull/321',
      { type: 'number', value: 321, owner: 'owner', repo: 'repo' },
    ],
    // Repo names with dots
    [
      'https://github.com/owner/repo.name/pull/1',
      { type: 'number', value: 1, owner: 'owner', repo: 'repo.name' },
    ],
    // Branch names
    ['feature-branch', { type: 'branch', value: 'feature-branch' }],
    ['fix/bug-123', { type: 'branch', value: 'fix/bug-123' }],
    ['main', { type: 'branch', value: 'main' }],
    ['release-v1.0', { type: 'branch', value: 'release-v1.0' }],
  ])('parses "%s" correctly', (ref, expected) => {
    expect(parsePrRef(ref)).toEqual(expected);
  });

  it.each([
    // Invalid: spaces (contain space, not valid branch names)
    ['feature branch'],
    ['my branch name'],
    // Invalid: empty
    [''],
  ])('returns null for invalid ref: "%s"', (ref) => {
    expect(parsePrRef(ref)).toBeNull();
  });

  // These are treated as branch names, not invalid refs
  // The function is permissive - anything without spaces that's not a PR number/URL is a branch
  it.each([
    ['-1', { type: 'branch', value: '-1' }],
    ['0', { type: 'branch', value: '0' }],
    ['1.5', { type: 'branch', value: '1.5' }],
    ['01', { type: 'branch', value: '01' }],
    ['v1.0.0', { type: 'branch', value: 'v1.0.0' }],
  ])('treats "%s" as branch name', (ref, expected) => {
    expect(parsePrRef(ref)).toEqual(expected);
  });
});
