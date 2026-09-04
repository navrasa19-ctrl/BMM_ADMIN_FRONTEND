import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import {
  Activity,
  Wifi,
  WifiOff,
  Wrench,
  Users,
  Ticket,
  Unlock,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    online: 0,
    engaged: 0,
    offline: 0,
    locked: 0,
    total: 0,
    date: "",
  });
  const [recentMechanics, setRecentMechanics] = useState([]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [summaryRes, mechanicsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/mechanics/status-summary`),
          fetch(`${API_BASE_URL}/api/admin/mechanics`),
        ]);

        const summaryData = await summaryRes.json();
        const mechanicsData = await mechanicsRes.json();

        if (summaryData.success) {
          setSummary(summaryData.data);
        } else {
          throw new Error(summaryData.message || "Failed to load summary");
        }

        if (mechanicsData.success) {
          const sorted = [...mechanicsData.data]
            .sort((a, b) => {
              const priority = { online: 0, engaged: 1, offline: 2 };
              const aRank = priority[a.liveStatus] ?? 3;
              const bRank = priority[b.liveStatus] ?? 3;
              return aRank - bRank;
            })
            .slice(0, 8);
          setRecentMechanics(sorted);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getLiveStatusStyle = (status) => {
    const map = {
      online: "bg-green-100 text-green-700",
      engaged: "bg-blue-100 text-blue-700",
      offline: "bg-slate-100 text-slate-600",
    };
    return map[status] || map.offline;
  };

  const todayLabel = summary.date
    ? new Date(summary.date).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Today";

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-60" : "ml-0"
        }`}
      >
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-[#0A1E3A]">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Today&apos;s mechanic activity summary — {todayLabel}
              </p>
            </div>
            {loading && (
              <span className="text-xs sm:text-sm text-gray-500">
                Syncing latest data...
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600">
                  <Wifi size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Online Mechanics
                  </p>
                  <p className="text-3xl font-semibold text-[#0A1E3A]">
                    {summary.online}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <Activity size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Engaged Mechanics
                  </p>
                  <p className="text-3xl font-semibold text-[#0A1E3A]">
                    {summary.engaged}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-slate-100 text-slate-600">
                  <WifiOff size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Offline Mechanics
                  </p>
                  <p className="text-3xl font-semibold text-[#0A1E3A]">
                    {summary.offline}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                  <Unlock size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Locked Accounts
                  </p>
                  <p className="text-3xl font-semibold text-[#0A1E3A]">
                    {summary.locked}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border shadow-sm p-5 lg:col-span-1">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                Today&apos;s Summary
              </p>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Total mechanics</span>
                  <span className="font-semibold">{summary.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-700">Currently online</span>
                  <span className="font-semibold text-green-700">{summary.online}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Currently engaged</span>
                  <span className="font-semibold text-blue-700">{summary.engaged}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Available for jobs</span>
                  <span className="font-semibold">{summary.online}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Working on jobs</span>
                  <span className="font-semibold">{summary.engaged}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#0A1E3A]">
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/mechanic-profile")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Wrench className="text-red-600" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Manage Mechanics</p>
                    <p className="text-xs text-gray-500">View status and unlock accounts</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/service-tickets")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Ticket className="text-red-600" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Service Tickets</p>
                    <p className="text-xs text-gray-500">Track active bookings</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/customer-profile")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Users className="text-red-600" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Customer Profiles</p>
                    <p className="text-xs text-gray-500">View registered customers</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/admin-assign-mechanic")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Activity className="text-red-600" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Assign Mechanic</p>
                    <p className="text-xs text-gray-500">Admin assigned bookings</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#0A1E3A]">
                Mechanic Live Status
              </h2>
              <button
                onClick={() => navigate("/mechanic-profile")}
                className="text-sm text-red-600 hover:text-red-700 underline underline-offset-2"
              >
                View all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-gray-600">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Mechanic ID</th>
                    <th className="py-2 px-3">Live Status</th>
                    <th className="py-2 px-3">Active Jobs</th>
                    <th className="py-2 px-3">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMechanics.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-gray-500">
                        No mechanics found.
                      </td>
                    </tr>
                  ) : (
                    recentMechanics.map((mechanic) => (
                      <tr
                        key={mechanic.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3 font-medium text-gray-800">
                          {mechanic.fullName || mechanic.name || "N/A"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {mechanic.mechanicId || mechanic.id}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getLiveStatusStyle(
                              mechanic.liveStatus
                            )}`}
                          >
                            {mechanic.liveStatus || "offline"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {mechanic.activeJobCount || 0}
                        </td>
                        <td className="py-3 px-3">
                          {mechanic.isLocked ? (
                            <span className="text-xs font-semibold text-amber-700">
                              Locked
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-green-700">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
