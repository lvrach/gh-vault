/**
 * PR create command tests.
 *
 * Tests the `gh-vault pr create` CLI command with mocked dependencies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrApi } from '../../../../domains/pr/api.js';
import { createCreateCommand } from '../../../../domains/pr/cli/create.js';
import type { CreatedPr } from '../../../../domains/pr/types.js';
import type { Output } from '../../../../shared/output.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('../../../../shared/repo.js', () => ({
  resolveRepository: vi.fn(),
  getCurrentBranch: vi.fn(),
  getDefaultBranch: vi.fn(),
  getCommitInfo: vi.fn(),
}));

import openModule from 'open';

import {
  getCommitInfo,
  getCurrentBranch,
  getDefaultBranch,
  resolveRepository,
} from '../../../../shared/repo.js';

const mockOpen = vi.mocked(openModule);
const mockResolveRepository = vi.mocked(resolveRepository);
const mockGetCurrentBranch = vi.mocked(getCurrentBranch);
const mockGetDefaultBranch = vi.mocked(getDefaultBranch);
const mockGetCommitInfo = vi.mocked(getCommitInfo);

interface MockOutput {
  print: ReturnType<typeof vi.fn>;
  printError: ReturnType<typeof vi.fn>;
}

function createMockOutput(): MockOutput {
  return {
    print: vi.fn(),
    printError: vi.fn(),
  };
}

function createMockPrApi(): {
  createPr: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
} {
  return {
    createPr: vi.fn(),
    getCurrentUser: vi.fn(),
  };
}

function createMockCreatedPr(overrides: Partial<CreatedPr> = {}): CreatedPr {
  return {
    number: 42,
    title: 'Test PR',
    htmlUrl: 'https://github.com/owner/repo/pull/42',
    state: 'open',
    draft: false,
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('pr create command', () => {
  let mockOutput: ReturnType<typeof createMockOutput>;
  let mockPrApi: ReturnType<typeof createMockPrApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;

    mockOutput = createMockOutput();
    mockPrApi = createMockPrApi();

    mockResolveRepository.mockResolvedValue({
      success: true,
      owner: 'owner',
      repo: 'repo',
    });

    mockGetCurrentBranch.mockResolvedValue('feature-branch');
    mockGetDefaultBranch.mockResolvedValue('main');
    mockGetCommitInfo.mockResolvedValue({ title: 'Commit title', body: 'Commit body' });
    mockPrApi.getCurrentUser.mockResolvedValue('octocat');
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  describe('success cases', () => {
    it('creates PR with title and body', async () => {
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'My PR', '--body', 'PR description']);

      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          title: 'My PR',
          body: 'PR description',
          head: 'feature-branch',
          base: 'main',
        })
      );
      expect(mockOutput.print).toHaveBeenCalledWith(createdPr.htmlUrl);
      expect(process.exitCode).toBeUndefined();
    });

    it('creates draft PR when --draft is specified', async () => {
      const createdPr = createMockCreatedPr({ draft: true });
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'Draft PR', '--draft']);

      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: true,
        })
      );
    });

    it('uses --fill to populate title and body from commits', async () => {
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--fill']);

      expect(mockGetCommitInfo).toHaveBeenCalledWith('main');
      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Commit title',
          body: 'Commit body',
        })
      );
    });

    it('uses custom head and base branches', async () => {
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '--title',
        'Custom branches',
        '--head',
        'my-feature',
        '--base',
        'develop',
      ]);

      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          head: 'my-feature',
          base: 'develop',
        })
      );
    });

    it('adds assignees, labels, and reviewers', async () => {
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '--title',
        'PR with metadata',
        '--assignee',
        'user1',
        '--assignee',
        'user2',
        '--label',
        'bug',
        '--label',
        'urgent',
        '--reviewer',
        'reviewer1',
      ]);

      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          assignees: ['user1', 'user2'],
          labels: ['bug', 'urgent'],
          reviewers: ['reviewer1'],
        })
      );
    });

    it('resolves @me to current user for assignee', async () => {
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'Self-assigned', '--assignee', '@me']);

      expect(mockPrApi.getCurrentUser).toHaveBeenCalled();
      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          assignees: ['octocat'],
        })
      );
    });

    it('opens browser when --web is specified', async () => {
      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--web']);

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/owner/repo/compare/main...feature-branch')
      );
      expect(mockPrApi.createPr).not.toHaveBeenCalled();
    });

    it('includes title and body in web URL when provided', async () => {
      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--web', '--title', 'My Title', '--body', 'My Body']);

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringMatching(/title=My%20Title.*body=My%20Body/)
      );
    });

    it('uses custom repository when --repo is specified', async () => {
      mockResolveRepository.mockResolvedValue({
        success: true,
        owner: 'other-owner',
        repo: 'other-repo',
      });
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync([
        'node',
        'test',
        '--repo',
        'other-owner/other-repo',
        '--title',
        'Custom repo PR',
      ]);

      expect(mockResolveRepository).toHaveBeenCalledWith('other-owner/other-repo');
      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'other-owner',
          repo: 'other-repo',
        })
      );
    });

    it('defaults maintainer edit permission to true', async () => {
      const createdPr = createMockCreatedPr();
      mockPrApi.createPr.mockResolvedValue(createdPr);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'Test']);

      expect(mockPrApi.createPr).toHaveBeenCalledWith(
        expect.objectContaining({
          maintainerCanModify: true,
        })
      );
    });
  });

  // ============================================================================
  // Error Cases
  // ============================================================================

  describe('error cases', () => {
    it('handles repository resolution failure', async () => {
      mockResolveRepository.mockResolvedValue({
        success: false,
        error: 'Not a git repository',
      });

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'Test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Not a git repository');
      expect(process.exitCode).toBe(1);
      expect(mockPrApi.createPr).not.toHaveBeenCalled();
    });

    it('requires title when --fill is not used', async () => {
      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--body', 'Just a body']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: --title is required (or use --fill to use commit info)'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles missing head branch', async () => {
      mockGetCurrentBranch.mockResolvedValue(null);

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'Test']);

      expect(mockOutput.printError).toHaveBeenCalledWith(
        'Error: Could not determine head branch. Use -H to specify.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('handles API error', async () => {
      mockPrApi.createPr.mockRejectedValue(new Error('Validation failed'));

      const cmd = createCreateCommand(
        mockOutput as unknown as Output,
        mockPrApi as unknown as PrApi
      );
      await cmd.parseAsync(['node', 'test', '--title', 'Test']);

      expect(mockOutput.printError).toHaveBeenCalledWith('Error: Validation failed');
      expect(process.exitCode).toBe(1);
    });
  });
});
