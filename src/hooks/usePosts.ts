import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Post, NewPost } from '../types';

export function usePosts(familyId: string | null) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) {
      fetchPosts(familyId);
      setupRealtimeSubscription();
    }
  }, [familyId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          if (familyId) fetchPosts(familyId);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        () => {
          if (familyId) fetchPosts(familyId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchPosts = async (currentFamilyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_families!inner (
            family_id
          ),
          reactions (
            id,
            user_id,
            reaction_type,
            emoji_type,
            comment,
            created_at,
            users (
              name,
              avatar_url
            )
          )
        `)
        .eq('post_families.family_id', currentFamilyId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setPosts(
        data?.map((post) => {
          const reactions = post.reactions || [];
          const likes = reactions.filter((r) => r.reaction_type === 'LIKE');
          const comments = reactions.filter((r) => r.reaction_type === 'COMMENT');

          return {
            ...post,
            family_id: currentFamilyId,
            reactions,
            likes_count: likes.length,
            comments_count: comments.length,
            user_has_liked: likes.some((r) => r.user_id === user.id),
            elderly_reactions: reactions.filter((r) => r.reaction_type === 'SLIDESHOW')
          };
        }) || []
      );
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (post: NewPost, familyIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('name, avatar_url, streak_count, last_post_date')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Calculate streak based on last post date
      const today = new Date().toISOString().split('T')[0];
      const lastPostDate = userProfile.last_post_date 
        ? new Date(userProfile.last_post_date).toISOString().split('T')[0]
        : null;
      
      let newStreakCount = 0;
      
      if (lastPostDate) {
        const daysSinceLastPost = Math.floor(
          (new Date(today).getTime() - new Date(lastPostDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // If posted yesterday, increment streak
        if (daysSinceLastPost === 1) {
          newStreakCount = userProfile.streak_count + 1;
        }
        // If posted today, maintain current streak
        else if (daysSinceLastPost === 0) {
          newStreakCount = userProfile.streak_count;
        }
        // If missed a day, start new streak
        else {
          newStreakCount = 1;
        }
      } else {
        // First post ever
        newStreakCount = 1;
      }

      // Create the post
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([
          {
            username: userProfile.name,
            media_url: post.media_url,
            media_type: post.media_type,
            caption: post.caption,
            avatar_url: userProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100',
            user_id: user.id,
            streak_count: newStreakCount
          }
        ])
        .select()
        .single();

      if (postError) throw postError;

      // Create family relationships
      const postFamilies = familyIds.map(familyId => ({
        post_id: newPost.id,
        family_id: familyId
      }));

      const { error: familyError } = await supabase
        .from('post_families')
        .insert(postFamilies);

      if (familyError) throw familyError;

      // Update user profile with new streak count and last post date
      const { error: updateError } = await supabase
        .from('users')
        .update({
          streak_count: newStreakCount,
          last_post_date: today
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return newPost;
    } catch (err) {
      console.error('Error creating post:', err);
      throw new Error('Failed to create post');
    }
  };

  const toggleFavorite = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) throw new Error('Post not found');

      const { error } = await supabase
        .from('posts')
        .update({ is_favorite: !post.is_favorite })
        .eq('id', postId);

      if (error) throw error;

      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, is_favorite: !p.is_favorite }
            : p
        )
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
      throw new Error('Failed to update favorite status');
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    refreshPosts: () => familyId && fetchPosts(familyId),
    toggleFavorite
  };
}