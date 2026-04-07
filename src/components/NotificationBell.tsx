import React, { useEffect, useState, useRef } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Trash2, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification, setUnreadCount, markAsRead, deleteNotification, clearNotifications } from '@/slices/notificationSlice';
import { getSocket } from '@/services/socketService';
import { notificationService } from '@/services/notificationService';
import toast from 'react-hot-toast';

const NotificationBell: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount } = useAppSelector((state) => state.notifications);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const listenersSetupRef = useRef(false);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await notificationService.getAll(1, 50);
        if (response.data && Array.isArray(response.data)) {
          let unreadCounter = 0;
          response.data.forEach((notification: any) => {
            dispatch(addNotification(notification));
            if (!notification.isRead) {
              unreadCounter += 1;
            }
          });
          dispatch(setUnreadCount(unreadCounter));
        }
      } catch (error) {
        console.error('[NOTIFICATION] Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [dispatch]);

  // Setup socket listeners - only once using ref
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const setupListeners = () => {
      // Skip if already setup
      if (listenersSetupRef.current) {
        console.log('[NOTIFICATION] Listeners already setup, skipping');
        return;
      }

      const socket = getSocket();
      
      if (socket && socket.connected) {
        console.log('[NOTIFICATION] Setting up socket listeners');
        
        // Remove any existing listeners first
        socket.off('new_notification');
        socket.off('unread_notifications_count');
        
        // Add new listeners
        socket.on('new_notification', (notification) => {
          console.log('[NOTIFICATION] Received new notification:', notification);
          dispatch(addNotification(notification));
          toast.success(notification.title);
        });

        socket.on('unread_notifications_count', (count) => {
          console.log('[NOTIFICATION] Unread count updated:', count);
          dispatch(setUnreadCount(count));
        });

        listenersSetupRef.current = true;
        if (interval) clearInterval(interval);
        console.log('[NOTIFICATION] Listeners setup complete');
      }
    };

    // Try to setup listeners immediately
    setupListeners();

    // Also try every 500ms for first 5 seconds in case socket is still initializing
    if (!listenersSetupRef.current) {
      interval = setInterval(() => {
        setupListeners();
      }, 500);

      // Clear interval after 5 seconds
      const timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
        if (!listenersSetupRef.current) {
          console.warn('[NOTIFICATION] Failed to setup listeners after 5 seconds');
        }
      }, 5000);

      return () => {
        clearTimeout(timeout);
        if (interval) clearInterval(interval);
      };
    }
  }, [dispatch]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      dispatch(markAsRead(notificationId));
      
      const socket = getSocket();
      if (socket) {
        socket.emit('mark_notification_read', notificationId);
      }
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await notificationService.delete(notificationId);
      dispatch(deleteNotification(notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      dispatch(setUnreadCount(0));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all notifications?')) return;
    try {
      setLoading(true);
      await notificationService.deleteAll();
      dispatch(clearNotifications());
      toast.success('All notifications deleted');
    } catch (error) {
      toast.error('Failed to delete all notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all disabled:opacity-50"
                    title="Mark all as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={loading}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all disabled:opacity-50"
                    title="Delete all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex-1 flex items-center justify-center">
                <div>
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors group ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {notification.type === 'NEW_LEAD' ? (
                          <AlertCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
