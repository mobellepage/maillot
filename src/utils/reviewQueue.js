// A tiny localStorage-backed "human review" queue for the expert verification step.
// No backend (single device/browser only), but nothing here auto-resolves on a timer —
// an item only leaves 'pending'/'in_review' once a human actually acts on it from the
// /admin screen (see Admin.jsx). That's the real requirement of Phase 2: no fake delay
// standing in for a reviewer.
import { loadJSON, saveJSON } from './storage.js';

export const REVIEW_QUEUE_KEY = 'kv_review_queue_v1';

export function loadReviewQueue() {
  return loadJSON(REVIEW_QUEUE_KEY, []);
}

function saveReviewQueue(queue) {
  saveJSON(REVIEW_QUEUE_KEY, queue);
}

// Queues a new review request and returns its id so the submitter can track resolution.
export function enqueueReview(snapshot) {
  const queue = loadReviewQueue();
  const entry = { ...snapshot, id: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), status: 'pending', reason: '', submittedAt: Date.now(), reviewedAt: null };
  saveReviewQueue([...queue, entry]);
  return entry.id;
}

export function findReview(id) {
  return loadReviewQueue().find((q) => q.id === id) || null;
}

// A human opened the admin screen and is now looking at this item — a real signal,
// not a timer.
export function markInReview(id) {
  saveReviewQueue(loadReviewQueue().map((q) => (q.id === id && q.status === 'pending' ? { ...q, status: 'in_review' } : q)));
}

export function resolveReview(id, approved, reason) {
  saveReviewQueue(loadReviewQueue().map((q) => (q.id === id ? { ...q, status: approved ? 'approved' : 'rejected', reason: reason || '', reviewedAt: Date.now() } : q)));
}
