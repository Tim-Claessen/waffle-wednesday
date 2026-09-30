/**
 * The shape of the database, by hand.
 *
 * Note that every row is a `type` and not an `interface`. It has to be: Supabase constrains
 * a schema to `Record<string, unknown>`, and TypeScript gives an implicit index signature to
 * a type alias but never to an interface. Declare a row as an interface and every query in
 * the app silently resolves to `never`.
 *
 * Normally this file is generated with `supabase gen types typescript`, and once the
 * project exists it should be — see docs/setup.md. It is written out here so the app
 * type-checks before the Supabase project is created, and it matches
 * supabase/migrations/ exactly. If you change the migration, change this.
 */

export type Provider = 'r2' | 'bunny';
export type Container = 'mp4' | 'mov' | 'webm';
export type WaffleStatus = 'uploading' | 'ready' | 'failed';
export type MemberRole = 'admin' | 'member';
export type ReminderRecipients = 'admins' | 'everyone';

/** The fixed set of reactions. No emoji keyboard, so no way to be unkind. */
export const REACTIONS = ['cuppa', 'hug', 'laugh', 'cheers', 'waffle'] as const;
export type Reaction = (typeof REACTIONS)[number];

/** What each reaction looks like, and what it is for. */
export const REACTION_GLYPHS: Record<Reaction, { glyph: string; label: string }> = {
  cuppa: { glyph: '☕', label: 'Cuppa' },
  hug: { glyph: '🫂', label: 'Hug' },
  laugh: { glyph: '😂', label: 'Laugh' },
  cheers: { glyph: '🍻', label: 'Cheers' },
  waffle: { glyph: '🧇', label: 'Waffle' },
};

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  mobile: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type GroupRow = {
  id: string;
  name: string;
  slug: string;
  week_start_day: number;
  timezone: string;
  morning_reminder_at: string;
  evening_reminder_at: string;
  reminders_enabled: boolean;
  reminder_recipients: ReminderRecipients;
  first_week_start: string;
  created_by: string | null;
  created_at: string;
  invite_token_hash: string | null;
  invite_created_at: string | null;
}

export type MembershipRow = {
  group_id: string;
  profile_id: string;
  role: MemberRole;
  joined_at: string;
}

export type WaffleRow = {
  id: string;
  group_id: string;
  profile_id: string;
  week_start: string;
  provider: Provider;
  provider_asset_id: string;
  storage_tier: string;
  container: Container;
  duration_seconds: number;
  size_bytes: number;
  thumbnail_asset_id: string | null;
  caption: string | null;
  status: WaffleStatus;
  created_at: string;
  updated_at: string;
}

export type ReactionRow = {
  id: string;
  waffle_id: string;
  profile_id: string;
  emoji: Reaction;
  created_at: string;
}

export type ViewRow = {
  waffle_id: string;
  profile_id: string;
  first_seen_at: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      groups: Table<GroupRow>;
      memberships: Table<MembershipRow>;
      waffles: Table<
        WaffleRow,
        Omit<WaffleRow, 'id' | 'created_at' | 'updated_at' | 'storage_tier' | 'status'> &
          Partial<Pick<WaffleRow, 'id' | 'storage_tier' | 'status'>>
      >;
      reactions: Table<ReactionRow, Omit<ReactionRow, 'id' | 'created_at'>>;
      views: Table<ViewRow, Omit<ViewRow, 'first_seen_at'>>;
    };
    Views: Record<string, never>;
    Functions: {
      week_start_for: {
        Args: { p_at?: string; p_start_day?: number; p_timezone?: string };
        Returns: string;
      };
      current_week_start: { Args: { p_group_id: string }; Returns: string };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean };
      can_see_waffle: { Args: { p_waffle_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
