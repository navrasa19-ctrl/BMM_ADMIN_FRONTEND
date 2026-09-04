import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Info, AlertTriangle, Clock, User, FileText, DollarSign, Award } from 'lucide-react';


const AdminNotificationPanel = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/notifications');
      if (response.success) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/admin/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/admin/notifications/read-all');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type, category) => {
    const iconProps = { size: 20 };
    
    switch (category) {
      case 'new_user_registration':
        return <User {...iconProps} className="text-blue-500" />;
      case 'new_investment':
        return <DollarSign {...iconProps} className="text-green-500" />;
      case 'new_kyc_submission':
        return <Award {...iconProps} className="text-purple-500" />;
      case 'new_document_upload':
        return <FileText {...iconProps} className="text-orange-500" />;
      case 'deal_published':
        return <CheckCircle {...iconProps} className="text-green-600" />;
      default:
        switch (type) {
          case 'success':
            return <CheckCircle {...iconProps} className="text-green-500" />;
          case 'error':
            return <XCircle {...iconProps} className="text-red-500" />;
          case 'warning':
            return <AlertTriangle {...iconProps} className="text-yellow-500" />;
          default:
            return <Info {...iconProps} className="text-blue-500" />;
        }
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'new_user_registration':
        return 'bg-blue-50 border-l-blue-500';
      case 'new_investment':
        return 'bg-green-50 border-l-green-500';
      case 'new_kyc_submission':
        return 'bg-purple-50 border-l-purple-500';
      case 'new_document_upload':
        return 'bg-orange-50 border-l-orange-500';
      case 'deal_published':
        return 'bg-emerald-50 border-l-emerald-500';
      default:
        return 'bg-gray-50 border-l-gray-500';
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now - notificationDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Admin Notifications</h2>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Info size={48} className="mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? `${getCategoryColor(notification.category)} border-l-4` : ''
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type, notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        !notification.isRead ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {notification.message}
                      </p>
                      {notification.relatedUserId && (
                        <p className="text-xs text-gray-400 mt-1">
                          User: {notification.relatedUserId.name} ({notification.relatedUserId.email})
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Clock size={12} />
                        {getTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationPanel;