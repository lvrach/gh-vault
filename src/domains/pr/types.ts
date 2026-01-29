/**
 * PR domain types - structured data returned by core functions.
 * These types represent the domain model, independent of presentation format.
 */

export interface PrUser {
  login: string;
  htmlUrl: string;
}

export interface PrLabel {
  name: string;
  color?: string | undefined;
}

export interface PrRef {
  ref: string;
  sha: string;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeableState: string;
  user: PrUser | null;
  head: PrRef;
  base: PrRef;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  htmlUrl: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: PrLabel[];
}

export interface PullRequestListItem {
  number: number;
  title: string;
  state: 'open' | 'closed';
  draft: boolean;
  user: PrUser | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  labels: PrLabel[];
  head: PrRef;
  base: PrRef;
  mergeable?: boolean | null | undefined;
  mergeableState?: string | undefined;
}

export interface PrComment {
  id: number;
  user: PrUser | null;
  body: string;
  createdAt: string;
  htmlUrl: string;
}

export interface PrReviewComment {
  id: number;
  user: PrUser | null;
  body: string;
  path: string;
  line: number | null;
  diffHunk: string;
  createdAt: string;
  htmlUrl: string;
  inReplyToId?: number | undefined;
}

export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';

export interface PrReview {
  id: number;
  user: PrUser | null;
  body: string | null;
  state: ReviewState;
  submittedAt: string | null;
  htmlUrl: string;
}

export interface PrFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  patch?: string | undefined;
}

export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface ListPrsInput {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all' | undefined;
  head?: string | undefined;
  base?: string | undefined;
  author?: string | undefined;
  assignee?: string | undefined;
  labels?: string[] | undefined;
  draft?: boolean | undefined;
  perPage?: number | undefined;
  search?: string | undefined;
}

export interface GetPrInput {
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface ListPrChecksInput {
  owner: string;
  repo: string;
  pullNumber: number;
  required?: boolean | undefined;
}

export interface CreateCommentInput {
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}

export interface UpdateCommentInput {
  owner: string;
  repo: string;
  commentId: number;
  body: string;
}

export interface DeleteCommentInput {
  owner: string;
  repo: string;
  commentId: number;
}

export interface CreateReviewInput {
  owner: string;
  repo: string;
  pullNumber: number;
  body: string;
  event: ReviewEvent;
}

export interface ListFilesInput {
  owner: string;
  repo: string;
  pullNumber: number;
  perPage?: number;
}

export interface ListCommentsInput {
  owner: string;
  repo: string;
  issueNumber: number;
  perPage?: number;
}

export interface ListReviewsInput {
  owner: string;
  repo: string;
  pullNumber: number;
  perPage?: number;
}

export interface ListReviewCommentsInput {
  owner: string;
  repo: string;
  pullNumber: number;
  perPage?: number;
}

export interface CreatePrInput {
  owner: string;
  repo: string;
  title: string;
  body?: string | undefined;
  head: string;
  base: string;
  draft?: boolean | undefined;
  assignees?: string[] | undefined;
  labels?: string[] | undefined;
  reviewers?: string[] | undefined;
  milestone?: string | undefined;
  maintainerCanModify?: boolean | undefined;
}

export interface CreatedPr {
  number: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed';
  draft: boolean;
}

export interface EditPrInput {
  owner: string;
  repo: string;
  pullNumber: number;
  title?: string | undefined;
  body?: string | undefined;
  base?: string | undefined;
  addLabels?: string[] | undefined;
  removeLabels?: string[] | undefined;
  addAssignees?: string[] | undefined;
  removeAssignees?: string[] | undefined;
  addReviewers?: string[] | undefined;
  removeReviewers?: string[] | undefined;
  milestone?: string | undefined;
  removeMilestone?: boolean | undefined;
}

export interface EditPrResult {
  number: number;
  title: string;
  htmlUrl: string;
  updatedFields: string[];
}

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export interface MergePrInput {
  owner: string;
  repo: string;
  pullNumber: number;
  mergeMethod?: MergeMethod | undefined;
  commitTitle?: string | undefined;
  commitMessage?: string | undefined;
  sha?: string | undefined;
  authorEmail?: string | undefined;
}

export interface MergeResult {
  sha: string;
  merged: boolean;
  message: string;
}

export interface AutoMergeInput {
  owner: string;
  repo: string;
  pullNumber: number;
  mergeMethod?: MergeMethod | undefined;
  commitTitle?: string | undefined;
  commitMessage?: string | undefined;
}

export interface AutoMergeResult {
  enabled: boolean;
  mergeMethod: MergeMethod;
}

export interface UpdatePrStateInput {
  owner: string;
  repo: string;
  pullNumber: number;
  state: 'open' | 'closed';
}

export interface UpdatePrDraftInput {
  owner: string;
  repo: string;
  pullNumber: number;
  draft: boolean;
}

export interface CheckRun {
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: string | null;
  detailsUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CommitStatus {
  state: 'error' | 'failure' | 'pending' | 'success';
  context: string;
  description: string | null;
  targetUrl: string | null;
}

export interface PrChecksResult {
  sha: string;
  overallState: 'pending' | 'success' | 'failure';
  checkRuns: CheckRun[];
  statuses: CommitStatus[];
  passing: number;
  failing: number;
  pending: number;
  total: number;
}

export interface PrStatusResult {
  currentBranchPr: PullRequestListItem | null;
  createdByYou: PullRequestListItem[];
  reviewRequested: PullRequestListItem[];
  assignedToYou: PullRequestListItem[];
}

export interface DeleteBranchInput {
  owner: string;
  repo: string;
  branch: string;
}
