/**
 * PR domain API class - fetch data from GitHub and return structured types.
 * These methods are presentation-agnostic and can be used by both CLI and MCP.
 */

import type { Octokit } from '../../shared/github.js';
import type {
  AutoMergeInput,
  AutoMergeResult,
  CheckRun,
  CommitStatus,
  CreateCommentInput,
  CreatedPr,
  CreatePrInput,
  CreateReviewInput,
  DeleteBranchInput,
  DeleteCommentInput,
  EditPrInput,
  EditPrResult,
  GetPrInput,
  ListCommentsInput,
  ListFilesInput,
  ListPrChecksInput,
  ListPrsInput,
  ListReviewCommentsInput,
  ListReviewsInput,
  MergePrInput,
  MergeResult,
  PrChecksResult,
  PrComment,
  PrFile,
  PrReview,
  PrReviewComment,
  PrStatusResult,
  PullRequest,
  PullRequestListItem,
  ReviewState,
  UpdateCommentInput,
  UpdatePrDraftInput,
  UpdatePrStateInput,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

/** Default number of items per page for paginated API calls */
const DEFAULT_PAGE_SIZE = 30;

/** Maximum number of items per page for paginated API calls */
const MAX_PAGE_SIZE = 100;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Validate PR state from GitHub API.
 */
function toPrState(state: string): 'open' | 'closed' {
  if (state === 'open' || state === 'closed') {
    return state;
  }
  // Default to 'open' for unexpected values (shouldn't happen with GitHub API)
  return 'open';
}

/**
 * Validate review state from GitHub API.
 */
function toReviewState(state: string): ReviewState {
  const validStates: ReviewState[] = [
    'APPROVED',
    'CHANGES_REQUESTED',
    'COMMENTED',
    'DISMISSED',
    'PENDING',
  ];
  if (validStates.includes(state as ReviewState)) {
    return state as ReviewState;
  }
  return 'COMMENTED';
}

/**
 * Validate commit status state from GitHub API.
 */
function toCommitStatusState(state: string): CommitStatus['state'] {
  const validStates: CommitStatus['state'][] = ['error', 'failure', 'pending', 'success'];
  if (validStates.includes(state as CommitStatus['state'])) {
    return state as CommitStatus['state'];
  }
  return 'pending';
}

// ============================================================================
// Helper Functions
// ============================================================================

function toUser(
  user: { login: string; html_url?: string } | null
): { login: string; htmlUrl: string } | null {
  if (!user) return null;
  return { login: user.login, htmlUrl: user.html_url ?? '' };
}

function buildSearchQuery(input: ListPrsInput): string {
  const parts: string[] = [`repo:${input.owner}/${input.repo}`, 'is:pr'];

  if (input.state && input.state !== 'all') {
    parts.push(`is:${input.state}`);
  }
  if (input.author) {
    parts.push(`author:${input.author}`);
  }
  if (input.assignee) {
    parts.push(`assignee:${input.assignee}`);
  }
  if (input.labels) {
    for (const label of input.labels) {
      parts.push(`label:"${label}"`);
    }
  }
  if (input.base) {
    parts.push(`base:${input.base}`);
  }
  if (input.head) {
    parts.push(`head:${input.head}`);
  }
  if (input.draft !== undefined) {
    parts.push(input.draft ? 'draft:true' : 'draft:false');
  }
  if (input.search) {
    parts.push(input.search);
  }

  return parts.join(' ');
}

// ============================================================================
// PrApi Class
// ============================================================================

/**
 * PR domain API with constructor-injected Octokit client.
 * All methods use the injected client for GitHub API calls.
 */
export class PrApi {
  constructor(private readonly client: Octokit) {}

  async getPr(input: GetPrInput): Promise<PullRequest> {
    const { data } = await this.client.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      draft: data.draft ?? false,
      merged: data.merged,
      mergeable: data.mergeable,
      mergeableState: data.mergeable_state,
      user: toUser(data.user),
      head: { ref: data.head.ref, sha: data.head.sha },
      base: { ref: data.base.ref, sha: data.base.sha },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      mergedAt: data.merged_at,
      htmlUrl: data.html_url,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
      labels: data.labels.map((l) => ({ name: l.name, color: l.color })),
    };
  }

  async listPrs(input: ListPrsInput): Promise<PullRequestListItem[]> {
    // Use search API when filters are provided that the REST API doesn't support natively.
    // This ensures we search across all PRs, not just the first page.
    const hasFilterRequiringSearch =
      input.search !== undefined ||
      input.author !== undefined ||
      input.assignee !== undefined ||
      input.labels !== undefined ||
      input.draft !== undefined;

    if (hasFilterRequiringSearch) {
      const query = buildSearchQuery(input);
      const { data } = await this.client.rest.search.issuesAndPullRequests({
        q: query,
        per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
      });

      return data.items
        .filter((item) => item.pull_request)
        .map((item) => ({
          number: item.number,
          title: item.title,
          state: toPrState(item.state),
          draft: item.draft ?? false,
          user: toUser(item.user),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          htmlUrl: item.html_url,
          labels: item.labels.map((l) =>
            typeof l === 'string'
              ? { name: l }
              : { name: l.name ?? '', color: l.color ?? undefined }
          ),
          head: { ref: '', sha: '' },
          base: { ref: '', sha: '' },
        }));
    }

    const params: {
      owner: string;
      repo: string;
      state: 'open' | 'closed' | 'all';
      per_page: number;
      head?: string;
      base?: string;
    } = {
      owner: input.owner,
      repo: input.repo,
      state: input.state ?? 'open',
      per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
    };
    if (input.head) params.head = input.head;
    if (input.base) params.base = input.base;

    const { data } = await this.client.rest.pulls.list(params);

    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: toPrState(pr.state),
      draft: pr.draft ?? false,
      user: toUser(pr.user),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
      labels: pr.labels.map((l) => ({ name: l.name, color: l.color })),
      head: { ref: pr.head.ref, sha: pr.head.sha },
      base: { ref: pr.base.ref, sha: pr.base.sha },
    }));
  }

  async listPrComments(input: ListCommentsInput): Promise<PrComment[]> {
    const { data } = await this.client.rest.issues.listComments({
      owner: input.owner,
      repo: input.repo,
      issue_number: input.issueNumber,
      per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
    });

    return data.map((c) => ({
      id: c.id,
      user: toUser(c.user),
      body: c.body ?? '',
      createdAt: c.created_at,
      htmlUrl: c.html_url,
    }));
  }

  async listPrReviewComments(input: ListReviewCommentsInput): Promise<PrReviewComment[]> {
    const { data } = await this.client.rest.pulls.listReviewComments({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
    });

    return data.map((c) => ({
      id: c.id,
      user: toUser(c.user),
      body: c.body,
      path: c.path,
      line: c.line ?? null,
      diffHunk: c.diff_hunk,
      createdAt: c.created_at,
      htmlUrl: c.html_url,
      inReplyToId: c.in_reply_to_id,
    }));
  }

  async listPrReviews(input: ListReviewsInput): Promise<PrReview[]> {
    const { data } = await this.client.rest.pulls.listReviews({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
    });

    return data.map((r) => ({
      id: r.id,
      user: toUser(r.user),
      body: r.body,
      state: toReviewState(r.state),
      submittedAt: r.submitted_at ?? null,
      htmlUrl: r.html_url,
    }));
  }

  async listPrFiles(input: ListFilesInput): Promise<PrFile[]> {
    const { data } = await this.client.rest.pulls.listFiles({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      per_page: input.perPage ?? DEFAULT_PAGE_SIZE,
    });

    return data.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }));
  }

  async createPrComment(input: CreateCommentInput): Promise<PrComment> {
    const { data } = await this.client.rest.issues.createComment({
      owner: input.owner,
      repo: input.repo,
      issue_number: input.issueNumber,
      body: input.body,
    });

    return {
      id: data.id,
      user: toUser(data.user),
      body: data.body ?? '',
      createdAt: data.created_at,
      htmlUrl: data.html_url,
    };
  }

  async updatePrComment(input: UpdateCommentInput): Promise<PrComment> {
    const { data } = await this.client.rest.issues.updateComment({
      owner: input.owner,
      repo: input.repo,
      comment_id: input.commentId,
      body: input.body,
    });

    return {
      id: data.id,
      user: toUser(data.user),
      body: data.body ?? '',
      createdAt: data.created_at,
      htmlUrl: data.html_url,
    };
  }

  async deletePrComment(input: DeleteCommentInput): Promise<void> {
    await this.client.rest.issues.deleteComment({
      owner: input.owner,
      repo: input.repo,
      comment_id: input.commentId,
    });
  }

  async createPrReview(input: CreateReviewInput): Promise<PrReview> {
    const { data } = await this.client.rest.pulls.createReview({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      body: input.body,
      event: input.event,
    });

    return {
      id: data.id,
      user: toUser(data.user),
      body: data.body,
      state: toReviewState(data.state),
      submittedAt: data.submitted_at ?? null,
      htmlUrl: data.html_url,
    };
  }

  async createPr(input: CreatePrInput): Promise<CreatedPr> {
    const { data } = await this.client.rest.pulls.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body ?? '',
      head: input.head,
      base: input.base,
      draft: input.draft ?? false,
      maintainer_can_modify: input.maintainerCanModify ?? true,
    });

    const pullNumber = data.number;

    if (input.labels && input.labels.length > 0) {
      await this.client.rest.issues.addLabels({
        owner: input.owner,
        repo: input.repo,
        issue_number: pullNumber,
        labels: input.labels,
      });
    }

    if (input.assignees && input.assignees.length > 0) {
      await this.client.rest.issues.addAssignees({
        owner: input.owner,
        repo: input.repo,
        issue_number: pullNumber,
        assignees: input.assignees,
      });
    }

    if (input.reviewers && input.reviewers.length > 0) {
      await this.client.rest.pulls.requestReviewers({
        owner: input.owner,
        repo: input.repo,
        pull_number: pullNumber,
        reviewers: input.reviewers,
      });
    }

    if (input.milestone) {
      const { data: milestones } = await this.client.rest.issues.listMilestones({
        owner: input.owner,
        repo: input.repo,
        state: 'open',
      });
      const found = milestones.find((m) => m.title === input.milestone);
      if (found) {
        await this.client.rest.issues.update({
          owner: input.owner,
          repo: input.repo,
          issue_number: pullNumber,
          milestone: found.number,
        });
      }
    }

    return {
      number: data.number,
      title: data.title,
      htmlUrl: data.html_url,
      state: data.state,
      draft: data.draft ?? false,
    };
  }

  /**
   * Edit a pull request. Handles multiple API calls for different fields.
   */
  async editPr(input: EditPrInput): Promise<EditPrResult> {
    const updatedFields: string[] = [];

    if (input.title !== undefined || input.body !== undefined || input.base !== undefined) {
      await this.client.rest.pulls.update({
        owner: input.owner,
        repo: input.repo,
        pull_number: input.pullNumber,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.body !== undefined && { body: input.body }),
        ...(input.base !== undefined && { base: input.base }),
      });
      if (input.title !== undefined) updatedFields.push('title');
      if (input.body !== undefined) updatedFields.push('body');
      if (input.base !== undefined) updatedFields.push('base');
    }

    if (input.addLabels && input.addLabels.length > 0) {
      await this.client.rest.issues.addLabels({
        owner: input.owner,
        repo: input.repo,
        issue_number: input.pullNumber,
        labels: input.addLabels,
      });
      updatedFields.push('labels (added)');
    }

    if (input.removeLabels && input.removeLabels.length > 0) {
      for (const label of input.removeLabels) {
        try {
          await this.client.rest.issues.removeLabel({
            owner: input.owner,
            repo: input.repo,
            issue_number: input.pullNumber,
            name: label,
          });
        } catch {
          // Expected: label may not exist on the PR, continue with other labels
        }
      }
      updatedFields.push('labels (removed)');
    }

    if (input.addAssignees && input.addAssignees.length > 0) {
      await this.client.rest.issues.addAssignees({
        owner: input.owner,
        repo: input.repo,
        issue_number: input.pullNumber,
        assignees: input.addAssignees,
      });
      updatedFields.push('assignees (added)');
    }

    if (input.removeAssignees && input.removeAssignees.length > 0) {
      await this.client.rest.issues.removeAssignees({
        owner: input.owner,
        repo: input.repo,
        issue_number: input.pullNumber,
        assignees: input.removeAssignees,
      });
      updatedFields.push('assignees (removed)');
    }

    if (input.addReviewers && input.addReviewers.length > 0) {
      await this.client.rest.pulls.requestReviewers({
        owner: input.owner,
        repo: input.repo,
        pull_number: input.pullNumber,
        reviewers: input.addReviewers,
      });
      updatedFields.push('reviewers (added)');
    }

    if (input.removeReviewers && input.removeReviewers.length > 0) {
      await this.client.rest.pulls.removeRequestedReviewers({
        owner: input.owner,
        repo: input.repo,
        pull_number: input.pullNumber,
        reviewers: input.removeReviewers,
      });
      updatedFields.push('reviewers (removed)');
    }

    if (input.milestone !== undefined || input.removeMilestone) {
      let milestoneNumber: number | null = null;

      if (input.milestone && !input.removeMilestone) {
        const { data: milestones } = await this.client.rest.issues.listMilestones({
          owner: input.owner,
          repo: input.repo,
          state: 'open',
        });
        const found = milestones.find((m) => m.title === input.milestone);
        if (found) {
          milestoneNumber = found.number;
        } else {
          throw new Error(`Milestone '${input.milestone}' not found`);
        }
      }

      await this.client.rest.issues.update({
        owner: input.owner,
        repo: input.repo,
        issue_number: input.pullNumber,
        milestone: milestoneNumber,
      });
      updatedFields.push(input.removeMilestone ? 'milestone (removed)' : 'milestone');
    }

    const { data: pr } = await this.client.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
    });

    return {
      number: pr.number,
      title: pr.title,
      htmlUrl: pr.html_url,
      updatedFields,
    };
  }

  /**
   * Merge a pull request.
   */
  async mergePr(input: MergePrInput): Promise<MergeResult> {
    const { data } = await this.client.rest.pulls.merge({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      merge_method: input.mergeMethod ?? 'merge',
      ...(input.commitTitle !== undefined && { commit_title: input.commitTitle }),
      ...(input.commitMessage !== undefined && { commit_message: input.commitMessage }),
      ...(input.sha !== undefined && { sha: input.sha }),
    });

    return {
      sha: data.sha,
      merged: data.merged,
      message: data.message,
    };
  }

  /**
   * Delete a remote branch.
   */
  async deleteBranch(input: DeleteBranchInput): Promise<void> {
    await this.client.rest.git.deleteRef({
      owner: input.owner,
      repo: input.repo,
      ref: `heads/${input.branch}`,
    });
  }

  /**
   * Enable auto-merge on a PR using GraphQL.
   */
  async enableAutoMerge(input: AutoMergeInput): Promise<AutoMergeResult> {
    const { data: pr } = await this.client.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
    });

    const mergeMethodMap = {
      merge: 'MERGE',
      squash: 'SQUASH',
      rebase: 'REBASE',
    } as const;

    const mutation = `
      mutation EnableAutoMerge($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!, $commitHeadline: String, $commitBody: String) {
        enablePullRequestAutoMerge(input: {
          pullRequestId: $pullRequestId,
          mergeMethod: $mergeMethod,
          commitHeadline: $commitHeadline,
          commitBody: $commitBody
        }) {
          pullRequest {
            autoMergeRequest {
              enabledAt
              mergeMethod
            }
          }
        }
      }
    `;

    await this.client.graphql(mutation, {
      pullRequestId: pr.node_id,
      mergeMethod: mergeMethodMap[input.mergeMethod ?? 'merge'],
      commitHeadline: input.commitTitle,
      commitBody: input.commitMessage,
    });

    return {
      enabled: true,
      mergeMethod: input.mergeMethod ?? 'merge',
    };
  }

  /**
   * Disable auto-merge on a PR using GraphQL.
   */
  async disableAutoMerge(input: {
    owner: string;
    repo: string;
    pullNumber: number;
  }): Promise<void> {
    const { data: pr } = await this.client.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
    });

    const mutation = `
      mutation DisableAutoMerge($pullRequestId: ID!) {
        disablePullRequestAutoMerge(input: {
          pullRequestId: $pullRequestId
        }) {
          pullRequest {
            id
          }
        }
      }
    `;

    await this.client.graphql(mutation, {
      pullRequestId: pr.node_id,
    });
  }

  /**
   * Update PR state (close or reopen).
   */
  async updatePrState(input: UpdatePrStateInput): Promise<PullRequest> {
    const { data } = await this.client.rest.pulls.update({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      state: input.state,
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      draft: data.draft ?? false,
      merged: data.merged,
      mergeable: data.mergeable,
      mergeableState: data.mergeable_state,
      user: toUser(data.user),
      head: { ref: data.head.ref, sha: data.head.sha },
      base: { ref: data.base.ref, sha: data.base.sha },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      mergedAt: data.merged_at,
      htmlUrl: data.html_url,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
      labels: data.labels.map((l) => ({ name: l.name, color: l.color })),
    };
  }

  /**
   * Mark PR as ready for review or convert to draft using GraphQL.
   */
  async updatePrDraft(input: UpdatePrDraftInput): Promise<PullRequest> {
    const { data: pr } = await this.client.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
    });

    if (input.draft) {
      const mutation = `
        mutation ConvertToDraft($pullRequestId: ID!) {
          convertPullRequestToDraft(input: {
            pullRequestId: $pullRequestId
          }) {
            pullRequest {
              id
            }
          }
        }
      `;
      await this.client.graphql(mutation, { pullRequestId: pr.node_id });
    } else {
      const mutation = `
        mutation MarkReady($pullRequestId: ID!) {
          markPullRequestReadyForReview(input: {
            pullRequestId: $pullRequestId
          }) {
            pullRequest {
              id
            }
          }
        }
      `;
      await this.client.graphql(mutation, { pullRequestId: pr.node_id });
    }

    return this.getPr({ owner: input.owner, repo: input.repo, pullNumber: input.pullNumber });
  }

  /**
   * Get check runs and commit statuses for a PR.
   */
  async listPrChecks(input: ListPrChecksInput): Promise<PrChecksResult> {
    const { data: pr } = await this.client.rest.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
    });

    const sha = pr.head.sha;
    const baseBranch = pr.base.ref;

    let requiredContexts: Set<string> | null = null;
    if (input.required) {
      try {
        const { data: protection } = await this.client.rest.repos.getBranchProtection({
          owner: input.owner,
          repo: input.repo,
          branch: baseBranch,
        });
        if (protection.required_status_checks?.contexts) {
          requiredContexts = new Set(protection.required_status_checks.contexts);
        }
      } catch {
        // Expected: branch protection may not be enabled, or user may lack permission to view it.
        // Keep requiredContexts as null to skip filtering (show all checks).
        // Note: requiredContexts remains null, so no filtering will be applied.
      }
    }

    const { data: checksData } = await this.client.rest.checks.listForRef({
      owner: input.owner,
      repo: input.repo,
      ref: sha,
      per_page: MAX_PAGE_SIZE,
    });

    const { data: statusData } = await this.client.rest.repos.getCombinedStatusForRef({
      owner: input.owner,
      repo: input.repo,
      ref: sha,
    });

    let checkRuns: CheckRun[] = checksData.check_runs.map((c) => ({
      name: c.name,
      status: c.status,
      conclusion: c.conclusion,
      detailsUrl: c.details_url,
      startedAt: c.started_at,
      completedAt: c.completed_at,
    }));

    let statuses: CommitStatus[] = statusData.statuses.map((s) => ({
      state: toCommitStatusState(s.state),
      context: s.context,
      description: s.description,
      targetUrl: s.target_url,
    }));

    if (requiredContexts !== null) {
      checkRuns = checkRuns.filter((c) => requiredContexts.has(c.name));
      statuses = statuses.filter((s) => requiredContexts.has(s.context));
    }

    let passing = 0;
    let failing = 0;
    let pending = 0;

    for (const check of checkRuns) {
      if (check.status !== 'completed') {
        pending++;
      } else if (check.conclusion === 'success' || check.conclusion === 'skipped') {
        passing++;
      } else if (
        check.conclusion === 'failure' ||
        check.conclusion === 'cancelled' ||
        check.conclusion === 'timed_out'
      ) {
        failing++;
      } else {
        pending++;
      }
    }

    for (const status of statuses) {
      if (status.state === 'success') {
        passing++;
      } else if (status.state === 'failure' || status.state === 'error') {
        failing++;
      } else {
        pending++;
      }
    }

    const total = checkRuns.length + statuses.length;
    let overallState: 'pending' | 'success' | 'failure' = 'success';
    if (failing > 0) {
      overallState = 'failure';
    } else if (pending > 0) {
      overallState = 'pending';
    }

    return {
      sha,
      overallState,
      checkRuns,
      statuses,
      passing,
      failing,
      pending,
      total,
    };
  }

  /**
   * Get PR status - PRs created by you, review requested, assigned to you.
   */
  async getPrStatus(input: {
    owner: string;
    repo: string;
    username: string;
    currentBranch?: string | undefined;
    includeConflictStatus?: boolean | undefined;
  }): Promise<PrStatusResult> {
    let currentBranchPr: PullRequestListItem | null = null;
    if (input.currentBranch) {
      const branchPrs = await this.listPrs({
        owner: input.owner,
        repo: input.repo,
        head: `${input.owner}:${input.currentBranch}`,
        state: 'open',
      });
      currentBranchPr = branchPrs[0] ?? null;
    }

    const createdByYou = await this.listPrs({
      owner: input.owner,
      repo: input.repo,
      state: 'open',
      author: input.username,
    });

    const reviewQuery = `repo:${input.owner}/${input.repo} is:pr is:open review-requested:${input.username}`;
    const { data: reviewData } = await this.client.rest.search.issuesAndPullRequests({
      q: reviewQuery,
      per_page: DEFAULT_PAGE_SIZE,
    });
    const reviewRequested: PullRequestListItem[] = reviewData.items
      .filter((item) => item.pull_request)
      .map((item) => ({
        number: item.number,
        title: item.title,
        state: toPrState(item.state),
        draft: item.draft ?? false,
        user: toUser(item.user),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        htmlUrl: item.html_url,
        labels: item.labels.map((l) =>
          typeof l === 'string' ? { name: l } : { name: l.name ?? '', color: l.color ?? undefined }
        ),
        head: { ref: '', sha: '' },
        base: { ref: '', sha: '' },
      }));

    const assignedToYou = await this.listPrs({
      owner: input.owner,
      repo: input.repo,
      state: 'open',
      assignee: input.username,
    });

    if (input.includeConflictStatus) {
      const enrichWithConflictStatus = async (
        prs: PullRequestListItem[]
      ): Promise<PullRequestListItem[]> => {
        return Promise.all(
          prs.map(async (pr) => {
            try {
              const fullPr = await this.getPr({
                owner: input.owner,
                repo: input.repo,
                pullNumber: pr.number,
              });
              return {
                ...pr,
                mergeable: fullPr.mergeable,
                mergeableState: fullPr.mergeableState,
              };
            } catch {
              // Expected: PR may have been closed/merged between list and fetch, return without conflict status
              return pr;
            }
          })
        );
      };

      if (currentBranchPr) {
        const [enriched] = await enrichWithConflictStatus([currentBranchPr]);
        currentBranchPr = enriched ?? currentBranchPr;
      }

      return {
        currentBranchPr,
        createdByYou: await enrichWithConflictStatus(createdByYou),
        reviewRequested: await enrichWithConflictStatus(reviewRequested),
        assignedToYou: await enrichWithConflictStatus(assignedToYou),
      };
    }

    return {
      currentBranchPr,
      createdByYou,
      reviewRequested,
      assignedToYou,
    };
  }

  /**
   * Get the authenticated user's login.
   */
  async getCurrentUser(): Promise<string> {
    const { data } = await this.client.rest.users.getAuthenticated();
    return data.login;
  }
}
