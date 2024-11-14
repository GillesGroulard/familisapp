import React, { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  const unreadCount = notifications.filter(n => n.status === 'PENDING').length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'REMINDER':
        return '⏰';
      case 'NEW_POST':
        return '📸';
      case 'STREAK_ALERT':
        return '🔥';
      default:
        return '📫';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    markAllAsRead();
                    setIsOpen(false);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-4">Loading...</p>
            ) : notifications.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg transition-colors ${
                      notification.status === 'PENDING'
                        ? 'bg-purple-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl" role="img" aria-label="notification type">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.sent_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {notification.status === 'PENDING' && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No notifications
              </p>
            )}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};