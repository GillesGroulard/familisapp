import React, { useState, useEffect } from 'react';
import { Users, Clock, ChevronRight, X } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { usePosts } from '../hooks/usePosts';
import { useReminders } from '../hooks/useReminders';
import { formatDistanceToNow } from 'date-fns';

interface FeedScreenProps {
  familyId: string | null;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ familyId }) => {
  const { posts, loading, error, refreshPosts } = usePosts(familyId);
  const { getActiveReminders, acknowledgeReminder } = useReminders(familyId || '');
  const [reminders, setReminders] = useState<any[]>([]);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    if (familyId) {
      fetchReminders();
      const interval = setInterval(fetchReminders, 60000);
      return () => clearInterval(interval);
    }
  }, [familyId]);

  const fetchReminders = async () => {
    try {
      const activeReminders = await getActiveReminders();
      const familyReminders = activeReminders?.filter(r => r.target_audience === 'FAMILY') || [];
      setReminders(familyReminders);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  };

  const handlePostDelete = () => {
    refreshPosts();
  };

  const handleReminderAcknowledge = async (reminderId: string) => {
    try {
      await acknowledgeReminder(reminderId);
      await fetchReminders();
    } catch (err) {
      console.error('Error acknowledging reminder:', err);
    }
  };

  if (!familyId) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 transition-all duration-300">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Choisisez une famille
          </h2>
          <p className="text-gray-600 mb-6">
            Choisisez une famille pour y voir les posts !
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 transition-all duration-300">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 transition-all duration-300">
        <div className="bg-red-50 rounded-xl p-6 text-red-600 text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 transition-all duration-300">
      {/* Reminders Menu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Family Reminders</h3>
                <p className="text-sm text-gray-500">
                  {reminders.length} active {reminders.length === 1 ? 'reminder' : 'reminders'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              <span className="text-sm font-medium">View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Reminders List */}
          {showReminders && reminders.length > 0 && (
            <div className="mt-4 space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{reminder.description}</p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(reminder.date), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReminderAcknowledge(reminder.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Supprimer le rappel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Pas encore de post
          </h2>
          <p className="text-gray-600 mb-6">
            Soyez le premier à poster pour votre famille !
          </p>
          <button
            onClick={() => window.location.hash = 'photos'}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Partagez une photo !
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onDelete={handlePostDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
