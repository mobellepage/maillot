// Likes and comments on the shirts in other members' collections.
import { sb } from '../supabase.ts';

export interface ItemComment {
  id: string;
  handle: string | null;
  avatar: string | null;
  body: string;
  created_at: string;
  can_delete: boolean;
}

export interface ItemSocial {
  likes: number;
  liked: boolean;
  isOwner: boolean;
  comments: ItemComment[];
}

/** Null when the shirt isn't shown (private, or gone). */
export async function loadItemSocial(itemId: string): Promise<ItemSocial | null> {
  const { data, error } = await (await sb()).rpc('item_social', { p_item: itemId });
  if (error) throw error;
  const row = data?.[0];
  return row ? { likes: row.likes, liked: row.liked, isOwner: row.is_owner, comments: (row.comments ?? []) as unknown as ItemComment[] } : null;
}

export async function setItemLike(itemId: string, like: boolean): Promise<number> {
  const { data, error } = await (await sb()).rpc('set_item_like', { p_item: itemId, p_like: like });
  if (error) throw error;
  return data ?? 0;
}

export async function addItemComment(itemId: string, body: string): Promise<void> {
  const { error } = await (await sb()).rpc('add_item_comment', { p_item: itemId, p_body: body });
  if (error) throw error;
}

export async function deleteItemComment(id: string): Promise<void> {
  const { error } = await (await sb()).rpc('delete_item_comment', { p_id: id });
  if (error) throw error;
}
