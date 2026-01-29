/**
 * GitHub Pull Request API types
 *
 * These interfaces model the GitHub REST API responses for PR operations.
 * Used for type-safe interactions with GitHub's pull request endpoints.
 */

/**
 * Represents a GitHub user account.
 */
export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

/**
 * Represents a Git reference (branch) with its associated repository.
 */
export interface GitHubRef {
  ref: string;
  sha: string;
  repo: {
    full_name: string;
  };
}

/**
 * Represents a GitHub Pull Request with full metadata.
 *
 * The `mergeable` field may be null while GitHub calculates mergeability.
 * The `mergeable_state` provides more detailed merge status information.
 */
export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  user: GitHubUser;
  head: GitHubRef;
  base: GitHubRef;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

/**
 * Represents a review submitted on a pull request.
 *
 * Review states:
 * - APPROVED: Reviewer approved the changes
 * - CHANGES_REQUESTED: Reviewer requested changes before approval
 * - COMMENTED: Reviewer left comments without explicit approval/rejection
 * - DISMISSED: Review was dismissed by a maintainer
 * - PENDING: Review is in draft state and not yet submitted
 */
export interface PullRequestReview {
  id: number;
  user: GitHubUser;
  body: string | null;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  submitted_at: string | null;
  html_url: string;
}

/**
 * Represents a general comment on a pull request (not tied to specific code).
 * These are the comments that appear in the main PR conversation thread.
 */
export interface IssueComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * Represents an inline comment on a specific line in the pull request diff.
 *
 * The `line` field is the line number in the new version of the file.
 * The `original_line` is the line number in the original version.
 * Either may be null depending on whether the comment is on added/removed lines.
 * The `in_reply_to_id` is set when this comment is a reply to another review comment.
 */
export interface ReviewComment {
  id: number;
  user: GitHubUser;
  body: string;
  path: string;
  line: number | null;
  original_line: number | null;
  diff_hunk: string;
  in_reply_to_id?: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * Input parameters for listing pull requests in a repository.
 */
export interface ListPullRequestsInput {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  head?: string;
  base?: string;
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  direction?: 'asc' | 'desc';
  per_page?: number;
}

/**
 * Input parameters for fetching a single pull request.
 */
export interface GetPullRequestInput {
  owner: string;
  repo: string;
  pull_number: number;
}

/**
 * Input parameters for creating a review on a pull request.
 *
 * Event types:
 * - APPROVE: Approve the pull request
 * - REQUEST_CHANGES: Request changes before the PR can be merged
 * - COMMENT: Leave feedback without explicit approval
 */
export interface CreateReviewInput {
  owner: string;
  repo: string;
  pull_number: number;
  body: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}

/**
 * Input parameters for creating a comment on a pull request.
 * Note: Uses issue_number because PR comments use the Issues API.
 */
export interface CreateCommentInput {
  owner: string;
  repo: string;
  issue_number: number;
  body: string;
}
