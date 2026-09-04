import React, { useState, useEffect } from "react";
import {
  Menu,
  ChevronDown,
  Bell,
  X,
  CheckCircle,
  User,
  FileText,
  DollarSign,
  Award,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase.js";
import { signOut } from "firebase/auth";

const TopBar = ({ toggleSidebar }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  /* ================= PAGE INFO ================= */

  const pageInfo = {
    "/customer-profile": {
      title: "Customer Profile",
      subtitle: "A complete overview of platform activity, growth, and performance",
    },

    "/mechanic-profile": {
      title: "Mechanic Profiles",
      subtitle: "View, verify, and manage registered mechanics and their details",
    },

    "/mechanicaservices": {
      title: "Mechanic Services",
      subtitle: "Manage service categories, skills, and offerings by mechanics",
    },

    "/service": {
      title: "Create Service",
      subtitle: "Add and configure new services available on the platform",
    },

    "/job-part": {
      title: "Job Parts",
      subtitle: "Create and manage job parts for each vehicle type",
    },

    "/help": {
      title: "Support Tickets",
      subtitle: "Track, respond to, and resolve customer support requests",
    },

    "/dispute": {
      title: "Dispute Management",
      subtitle: "Review, track, and resolve disputes raised by customers",
    },

    "/plan": {
      title: "Subscriptions",
      subtitle: "Create and manage subscription plans and pricing",
    },

    "/add-banner": {
      title: "Media & Banners",
      subtitle: "Upload, manage, and control promotional banners and media assets",
    },

    "/add-review": {
      title: "Reviews & Ratings",
      subtitle: "Manage customer video testimonials, ratings, and feedback profiles",
    },
  };


  const currentPage = pageInfo[location.pathname] || {
    title: "Admin Panel",
    subtitle: "Manage system operations",
  };

  /* ================= LOGOUT ================= */

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      localStorage.clear();
      navigate("/");
    }
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-red-50 active:bg-red-100 transition"
          >
            <Menu size={22} className="text-gray-800 hover:text-red-600" />
          </button>

          <div>
            <h1 className="text-lg lg:text-xl font-semibold text-gray-800 relative">
              {currentPage.title}
              {/* red underline */}
              <span className="absolute left-0 -bottom-1 h-0.5 w-10 bg-red-600 rounded-full"></span>
            </h1>
            <p className="hidden sm:block mt-2 text-gray-500 text-xs lg:text-sm">
              {currentPage.subtitle}
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">

          {/* NOTIFICATIONS */}
          <div className="relative">
            {/*<button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 border border-gray-200 rounded-full hover:bg-red-50 relative transition"
            >
              <Bell size={18} className="text-gray-800 hover:text-red-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              </button>*/}

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-xl shadow-xl">
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Notifications
                  </h2>
                  <X
                    size={18}
                    onClick={() => setShowNotifications(false)}
                    className="cursor-pointer text-gray-500 hover:text-red-600"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center p-6">
                      <div className="animate-spin h-6 w-6 border-b-2 border-red-600 rounded-full"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center p-6 text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-4 border-b cursor-pointer hover:bg-red-50 flex gap-3 ${!n.isRead
                          ? "bg-red-50 border-l-4 border-red-600"
                          : ""
                          }`}
                      >
                        <Info size={18} className="text-red-600" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {n.title}
                          </p>
                          <p className="text-sm text-gray-600">{n.message}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Clock size={12} />
                            {n.createdAt}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button className="w-full py-2 text-sm text-red-600 hover:bg-red-50 border-t font-medium">
                  Mark all as read
                </button>
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1 hover:bg-red-50 transition"
            >
              <img
                src="/admin.png"
                alt="Admin"
                className="w-8 h-8 rounded-full"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-black tracking-wide">
                  BOOK MY MECHANIK<span className="align-top text-md ml-0">™</span>
                </p>
                <p className="text-xs text-gray-500">
                  Admin Panel
                </p>
              </div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default TopBar;
