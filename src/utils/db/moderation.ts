// Reporting and blocking (App Store guideline 1.2). Reports go to the admins;
// a block hides the other member's content for the blocker and stops
// comments, inquiries and follows between the two (enforced in the database).
import { sb } from '../supabase.ts';

export type ReportKind = 'profile' | 'shirt' | 'comment' | 'inquiry';
export type ReportReason = 'spam' | 'offensive' | 'scam' | 'other';
export const REPORT_REASONS: ReportReason[] = ['offensive', 'spam', 'scam', 'other'];

export interface BlockedMember {
  handle: string;
  avatar: string | null;
  blocked_at: string;
}

export interface ContentReport {
  id: number;
  kind: ReportKind;
  target_id: string;
  reason: ReportReason;
  note: string | null;
  snapshot: string | null;
  status: 'open' | 'removed' | 'dismissed';
  created_at: string;
  reporter: string | null;
  target_handle: string | null;
  item_id: string | null;
  reports_on_user: number;
}

/** Report a profile (by handle), a shirt (item id), a comment or an inquiry (id). */
export async function reportContent(kind: ReportKind, target: string, reason: ReportReason, note?: string): Promise<void> {
  const { error } = await (await sb()).rpc('report_content', { p_kind: kind, p_target: target, p_reason: reason, p_note: note ?? null });
  if (error) throw error;
}

export async function blockUser(handle: string): Promise<void> {
  const { error } = await (await sb()).rpc('block_user', { p_handle: handle });
  if (error) throw error;
}

export async function unblockUser(handle: string): Promise<void> {
  const { error } = await (await sb()).rpc('unblock_user', { p_handle: handle });
  if (error) throw error;
}

export async function loadMyBlocks(): Promise<BlockedMember[]> {
  const { data, error } = await (await sb()).rpc('my_blocks');
  if (error) throw error;
  return data || [];
}

/** Admin: reports by status ('open', 'removed', 'dismissed' or 'all'). */
export async function loadReports(status: 'open' | 'all' = 'open'): Promise<ContentReport[]> {
  const { data, error } = await (await sb()).rpc('admin_reports', { p_status: status });
  if (error) throw error;
  return (data || []) as ContentReport[];
}

/** Admin: 'removed' takes the content down, 'dismissed' keeps it. */
export async function resolveReport(id: number, action: 'removed' | 'dismissed'): Promise<void> {
  const { error } = await (await sb()).rpc('admin_resolve_report', { p_id: id, p_action: action });
  if (error) throw error;
}
