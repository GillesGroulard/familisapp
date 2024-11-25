import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, Heart, Lock, Unlock } from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import { useReactions } from '../hooks/useReactions';
import { useReminders } from '../hooks/useReminders';
import { ReminderAnimation } from '../components/ReminderAnimation';
import { GiftBoxAnimation } from '../components/GiftBoxAnimation';
import { ReactionOverlay } from '../components/ReactionOverlay';
import { useAudio } from '../hooks/useAudio';
import { supabase } from '../lib/supabase';
import type { Reminder, Family, Post } from '../types';

interface SlideshowScreenProps {
  familyId: string | null;
  setActiveTab: (tab: string) => void;
}

export const SlideshowScreen: React.FC<SlideshowScreenProps> = ({ familyId, setActiveTab }) => {
  const { posts, loading, error, toggleFavorite } = usePosts(familyId);
  const { addElderlyReaction, getCurrentReaction } = useReactions();
  const { getActiveReminders, acknowledgeReminder } = useReminders(familyId || '');
  const { play: playNewPhotoSound } = useAudio('/sounds/new-photo.mp3');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [processedPosts, setProcessedPosts] = useState<Set<string>>(new Set());
  const [familySettings, setFamilySettings] = useState<Family | null>(null);
  const [lastPostTimestamp, setLastPostTimestamp] = useState<string | null>(null);

  // New photo adjustment states
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const unlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unlockStartTimeRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getFilteredPosts = (): Post[] => {
    if (!posts || !familySettings) return posts || [];
    
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedPosts.slice(0, familySettings.slideshow_photo_limit);
  };

  useEffect(() => {
    if (familyId) {
      fetchFamilySettings();
      loadCurrentReaction();
    }
  }, [familyId, currentIndex]);

  useEffect(() => {
    if (posts?.length > 0) {
      const latestPost = posts[0];
      const isNewPost = latestPost.timestamp !== lastPostTimestamp && !processedPosts.has(latestPost.id);
      
      if (isNewPost) {
        setCurrentIndex(0);
        setShowGift(true);
        setAutoplay(false);
        playNewPhotoSound();
        setProcessedPosts(prev => new Set([...prev, latestPost.id]));
        setLastPostTimestamp(latestPost.timestamp);
      }
    }
  }, [posts]);

  useEffect(() => {
    if (autoplay && !showGift && !showReactions && !showReminder) {
      const filteredPosts = getFilteredPosts();
      if (filteredPosts.length > 0) {
        const currentPost = filteredPosts[currentIndex];
        
        if (autoplayTimerRef.current) {
          clearTimeout(autoplayTimerRef.current);
        }

        if (currentPost?.media_type === 'video' && videoRef.current) {
          videoRef.current.play().catch(console.error);
        } else {
          const duration = familySettings?.slideshow_speed 
            ? familySettings.slideshow_speed * 1000 
            : 15000;

          autoplayTimerRef.current = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % filteredPosts.length);
          }, duration);
        }
      }
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [currentIndex, autoplay, familySettings, showGift, showReactions, showReminder]);

  useEffect(() => {
    const checkReminders = async () => {
      if (!showGift && !showReactions) {
        const reminders = await getActiveReminders();
        const elderReminders = reminders?.filter(r => r.target_audience === 'ELDER');
        const nextReminder = elderReminders?.[0];
        if (nextReminder && !showReminder) {
          setCurrentReminder(nextReminder);
          setShowReminder(true);
          setAutoplay(false);
        }
      }
    };

    const interval = setInterval(checkReminders, 30000);
    checkReminders();

    return () => clearInterval(interval);
  }, [showGift, showReactions]);

  const fetchFamilySettings = async () => {
    try {
      if (!familyId) return;

      const { data, error } = await supabase
        .from('families')
        .select('slideshow_photo_limit, slideshow_speed')
        .eq('id', familyId)
        .single();

      if (error) throw error;
      setFamilySettings(data);
    } catch (err) {
      console.error('Error fetching family settings:', err);
    }
  };

  const loadCurrentReaction = async () => {
    const filteredPosts = getFilteredPosts();
    if (!filteredPosts?.[currentIndex]) return;
    
    const reaction = await getCurrentReaction(filteredPosts[currentIndex].id);
    setCurrentReaction(reaction);
  };

  // Reset adjustments when changing photos
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Calculate bounds
      const container = containerRef.current;
      const image = imageRef.current;
      if (container && image) {
        const maxX = (image.width * zoom - container.clientWidth) / 2;
        const maxY = (image.height * zoom - container.clientHeight) / 2;
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleLockPress = () => {
    unlockStartTimeRef.current = Date.now();
    unlockTimerRef.current = setInterval(() => {
      if (!unlockStartTimeRef.current) return;
      
      const elapsed = Date.now() - unlockStartTimeRef.current;
      const progress = Math.min((elapsed / 5000) * 100, 100);
      setUnlockProgress(progress);
      
      if (progress >= 100) {
        clearInterval(unlockTimerRef.current!);
        unlockTimerRef.current = null;
        unlockStartTimeRef.current = null;
        setUnlockProgress(0);
        exitFullscreen();
      }
    }, 50);
  };

  const handleLockRelease = () => {
    if (unlockTimerRef.current) {
      clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    unlockStartTimeRef.current = null;
    setUnlockProgress(0);
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msFullscreenElement) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
    } finally {
      setIsLocked(false);
      setActiveTab('feed');
    }
  };

  const handleReactionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAutoplay(false);
    setShowReactions(true);
  };

  const handleReaction = async (emojiType: string) => {
    try {
      const filteredPosts = getFilteredPosts();
      const currentPost = filteredPosts[currentIndex];
      if (!currentPost) return;

      await addElderlyReaction(currentPost.id, emojiType);
      setCurrentReaction(emojiType);
      setShowReactions(false);
      setAutoplay(true);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const handleGiftOpen = () => {
    setShowGift(false);
    setAutoplay(true);
  };

  const handlePrevious = () => {
    const filteredPosts = getFilteredPosts();
    if (!filteredPosts?.length) return;
    setCurrentIndex((prev) => (prev - 1 + filteredPosts.length) % filteredPosts.length);
    setAutoplay(false);
  };

  const handleNext = () => {
    const filteredPosts = getFilteredPosts();
    if (!filteredPosts?.length) return;
    setCurrentIndex((prev) => (prev + 1) % filteredPosts.length);
    setAutoplay(false);
  };

  const handleFavorite = async () => {
    const filteredPosts = getFilteredPosts();
    if (!filteredPosts?.[currentIndex]) return;
    await toggleFavorite(filteredPosts[currentIndex].id);
  };

  const handleReminderAcknowledge = async () => {
    if (currentReminder) {
      await acknowledgeReminder(currentReminder.id);
      setShowReminder(false);
      setCurrentReminder(null);
      setAutoplay(true);
    }
  };

  const renderMedia = () => {
    const filteredPosts = getFilteredPosts();
    const currentPost = filteredPosts[currentIndex];
    
    if (currentPost.media_type === 'video') {
      return (
        <video
          ref={videoRef}
          src={currentPost.media_url}
          className="w-full h-full object-contain"
          controls={false}
          playsInline
          onEnded={() => {
            handleNext();
            setAutoplay(true);
          }}
        />
      );
    }

    return (
      <div 
        className="relative w-full h-full overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={currentPost.media_url}
          alt={currentPost.caption}
          className={`w-full h-full transition-transform duration-200 ${
            fitMode === 'contain' ? 'object-contain' : 'object-cover'
          }`}
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            cursor: zoom > 1 ? 'grab' : 'default'
          }}
          draggable={false}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-white text-xl">Loading photos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-red-500 text-xl">Failed to load photos</p>
      </div>
    );
  }

  const filteredPosts = getFilteredPosts();
  if (!filteredPosts || filteredPosts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-white text-xl">No photos to display yet</p>
      </div>
    );
  }

  const currentPost = filteredPosts[currentIndex];

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      <button
        onMouseDown={handleLockPress}
        onMouseUp={handleLockRelease}
        onTouchStart={handleLockPress}
        onTouchEnd={handleLockRelease}
        className="absolute top-4 right-4 z-50 p-4 text-white/50 hover:text-white/75 transition-colors rounded-full"
        style={{
          background: unlockProgress > 0 
            ? `linear-gradient(to right, rgba(59, 130, 246, 0.5) ${unlockProgress}%, transparent ${unlockProgress}%)` 
            : undefined
        }}
      >
        {isLocked ? (
          <Lock className="w-8 h-8" />
        ) : (
          <Unlock className="w-8 h-8" />
        )}
      </button>

      <div className={`relative w-full h-full ${showReactions ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}>
        {renderMedia()}

        <button
          onClick={handleFavorite}
          className={`absolute top-4 left-4 p-4 transition-all duration-300 favorite-star ${
            currentPost.is_favorite ? 'active scale-110 drop-shadow-glow' : 'text-white/50 hover:text-white/75'
          }`}
        >
          <Star className={`w-8 h-8 ${currentPost.is_favorite ? 'fill-yellow-400' : ''}`} />
        </button>

        <button
          onClick={handleReactionClick}
          className={`absolute bottom-8 right-8 p-6 rounded-full shadow-lg z-10
            transform transition-all duration-300 hover:scale-105 active:scale-95
            ${currentReaction 
              ? 'bg-white/20 backdrop-blur-sm hover:bg-white/30' 
              : 'bg-primary-500 hover:bg-primary-600'}`}
        >
          {currentReaction ? (
            <span className="text-4xl filter drop-shadow-lg">
              {{'LOVE': '❤️', 'SMILE': '😊', 'HUG': '🤗', 'PROUD': '👏'}[currentReaction]}
            </span>
          ) : (
            <Heart className="w-12 h-12 text-white" />
          )}
        </button>

        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-4 rounded-full
            hover:bg-black/75 transition-colors transform hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-4 rounded-full
            hover:bg-black/75 transition-colors transform hover:scale-105 active:scale-95"
        >
          <ChevronRight className="w-10 h-10" />
        </button>

        <div className="absolute bottom-8 left-8 right-8">
          <div className="inline-flex items-start gap-4 p-4 rounded-2xl bg-black/40 backdrop-blur-sm">
            <img
              src={currentPost.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100'}
              alt={currentPost.username}
              className="w-16 h-16 rounded-full border-2 border-white object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-semibold text-white">
                {currentPost.username}
              </h3>
              <p className="text-xl text-white mt-1 line-clamp-2 break-words">
                {currentPost.caption}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showReactions && (
        <ReactionOverlay
          onReact={handleReaction}
          onClose={() => {
            setShowReactions(false);
            setAutoplay(true);
          }}
          currentReaction={currentReaction}
        />
      )}

      {showGift && (
        <GiftBoxAnimation onOpen={handleGiftOpen} />
      )}

      {showReminder && currentReminder && (
        <ReminderAnimation
          reminder={currentReminder}
          onAcknowledge={handleReminderAcknowledge}
        />
      )}
    </div>
  );
};
