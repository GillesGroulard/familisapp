export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  streak_count: number;
  last_post_date: string | null;
  notification_daily_reminder: boolean;
  notification_new_content: boolean;
  notification_streak_alert: boolean;
}

export interface Post {
  id: string;
  username: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string;
  avatar_url: string;
  timestamp: string;
  user_id: string;
  family_id: string;
  streak_count: number;
  is_favorite: boolean;
  viewed_by_senior: boolean;
  reactions: Reaction[];
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  elderly_reactions: Reaction[];
}

export interface NewPost {
  media_url: string;
  media_type: 'image' | 'video';
  caption: string;
}

export interface Reaction {
  id: string;
  user_id: string;
  reaction_type: 'LIKE' | 'COMMENT' | 'SLIDESHOW';
  emoji_type?: 'LOVE' | 'SMILE' | 'HUG' | 'PROUD';
  comment?: string;
  created_at: string;
  user?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface Family {
  id: string;
  name: string;
  display_name: string;
  color: string;
  join_code: string;
  family_picture: string | null;
  slideshow_photo_limit: number;
  slideshow_speed: number;
}

export interface Reminder {
  id: string;
  family_id: string;
  user_id: string;
  description: string;
  date: string;
  time: string | null;
  target_audience: 'ELDER' | 'FAMILY';
  recurrence_type: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrence_day: number | null;
  is_acknowledged: boolean;
  created_at: string;
}