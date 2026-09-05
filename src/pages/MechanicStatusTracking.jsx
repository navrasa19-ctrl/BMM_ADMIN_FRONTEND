import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PERIOD_OPTIONS = [
  { value: "", label: "All Time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
];

const PAGE_SIZE = 20;

const formatDateTime = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
};

const formatPhone = (phone) => {
  if (!phone) return "—";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
};

const StatusBadge = ({ status }) => {
  const isOnline = String(status || "").toLowerCase() === "online";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isOnline ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
      {isOnline ? "Online" : "Offline"}
    </span>
  );
};

const SourceBadge = ({ source, changedBy }) => {
  const isAdmin = source === "admin" || changedBy === "admin";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isAdmin ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
      }`}
    >
      {isAdmin ? "Admin" : "Self"}
    </span>
  );
};

const MechanicActivityCard = ({ mechanic, defaultExpanded, onStatusChange }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const activity = mechanic.activity || [];

  const sessions = useMemo(() => {
    const events = [...activity].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ta - tb;
    });

    const res = [];
    let current = null;

    events.forEach((e) => {
      const status = String(e.status || "").toLowerCase();
      if (status === "online") {
        current = {
          historyId: e.historyId || `${e.timestamp}-online`,
          onlineAt: e.onlineAt || e.timestamp,
          offlineAt: null,
          source: e.source,
          changedBy: e.changedBy,
          reason: e.reason,
          timestamp: e.timestamp || e.onlineAt || null,
        };
        res.push(current);
      } else if (status === "offline") {
        if (current && !current.offlineAt) {
          current.offlineAt = e.offlineAt || e.timestamp;
          current.reason = current.reason || e.reason;
          current.source = current.source || e.source;
          current.changedBy = current.changedBy || e.changedBy;
        } else {
          res.push({
            historyId: e.historyId || `${e.timestamp}-offline`,
            onlineAt: null,
            offlineAt: e.offlineAt || e.timestamp,
            source: e.source,
            changedBy: e.changedBy,
            reason: e.reason,
            timestamp: e.timestamp || e.offlineAt || null,
          });
          current = null;
        }
      } else {
        res.push({
          historyId: e.historyId || `${e.timestamp}-event`,
          onlineAt: e.onlineAt || null,
          offlineAt: e.offlineAt || null,
          source: e.source,
          changedBy: e.changedBy,
          reason: e.reason,
          timestamp: e.timestamp || e.onlineAt || e.offlineAt || null,
        });
        current = null;
      }
    });

    return res.reverse();
  }, [activity]);

  const activitySummary = useMemo(() => {
    const online = activity.filter((a) => a.status === "online").length;
    const offline = activity.filter((a) => a.status === "offline").length;
    return { online, offline, total: activity.length };
  }, [activity]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {mechanic.profilePhoto ? (
            <img
              src={mechanic.profilePhoto}
              alt={mechanic.fullName}
              className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <User size={20} className="text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm sm:text-base font-semibold text-gray-800">{mechanic.fullName || "—"}</p>
              <StatusBadge status={mechanic.currentStatus} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{mechanic.mechanicNumber || mechanic.mechanicId}</p>
            <p className="text-xs text-gray-400">{formatPhone(mechanic.phone)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              {activitySummary.online} online
            </span>
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-semibold text-gray-600">
              {activitySummary.offline} offline
            </span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (updatingStatus) return;
              (async () => {
                const mechId = mechanic.mechanicId || mechanic.mechanicId;
                const current = String(mechanic.currentStatus || "").toLowerCase();
                const target = current === "online" ? "offline" : "online";
                try {
                  setUpdatingStatus(true);
                  const url = `${API_BASE_URL}/api/status/admin/${mechId}/${target}`;
                  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
                  const data = await res.json();
                  if (!res.ok || !data.success) throw new Error(data.message || `Failed to mark ${target}`);
                  if (typeof onStatusChange === "function") onStatusChange();
                } catch (err) {
                  console.error(err);
                  alert(err.message || "Failed to change status");
                } finally {
                  setUpdatingStatus(false);
                }
              })();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                if (updatingStatus) return;
                (async () => {
                  const mechId = mechanic.mechanicId || mechanic.mechanicId;
                  const current = String(mechanic.currentStatus || "").toLowerCase();
                  const target = current === "online" ? "offline" : "online";
                  try {
                    setUpdatingStatus(true);
                    const url = `${API_BASE_URL}/api/status/admin/${mechId}/${target}`;
                    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.message || `Failed to mark ${target}`);
                    if (typeof onStatusChange === "function") onStatusChange();
                  } catch (err) {
                    console.error(err);
                    alert(err.message || "Failed to change status");
                  } finally {
                    setUpdatingStatus(false);
                  }
                })();
              }
            }}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${
              updatingStatus ? "opacity-50 cursor-wait" : "hover:bg-gray-50"
            }`}
          >
            {String(mechanic.currentStatus || "").toLowerCase() === "online" ? (
              <>
                <Wifi size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">Set Offline</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-gray-600" />
                <span className="hidden sm:inline">Set Online</span>
              </>
            )}
          </div>

          {expanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {sessions.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">No activity recorded for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Online At</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Offline At</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Source</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Reason</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((item) => {
                    const statusForSession =
                      item.offlineAt && (!item.onlineAt || new Date(item.offlineAt) >= new Date(item.onlineAt))
                        ? "offline"
                        : "online";

                    return (
                      <tr key={item.historyId} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <StatusBadge status={statusForSession} />
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                          {item.onlineAt ? formatDateTime(item.onlineAt) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                          {item.offlineAt ? formatDateTime(item.offlineAt) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <SourceBadge source={item.source} changedBy={item.changedBy} />
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-sm text-gray-700 max-w-[180px] truncate" title={item.reason}>
                            {item.reason || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
                            <Clock size={13} className="text-gray-400 shrink-0" />
                            {formatDateTime(item.timestamp || item.offlineAt || item.onlineAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MechanicStatusTracking = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const fetchStatusHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const url = new URL(`${API_BASE_URL}/api/status/admin/mechanics/status`);
      if (period) url.searchParams.append("type", period);
      if (statusFilter) url.searchParams.append("status", statusFilter);
      url.searchParams.append("page", page);
      url.searchParams.append("limit", PAGE_SIZE);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMechanics(data.data);
        setTotal(data.total ?? data.data.length);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load mechanic status history");
      setMechanics([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [period, statusFilter, page]);

  useEffect(() => {
    fetchStatusHistory();
  }, [fetchStatusHistory]);

  useEffect(() => {
    setPage(1);
  }, [period, statusFilter, search]);

  const filteredMechanics = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return mechanics;

    return mechanics.filter((mechanic) => {
      const activityText = (mechanic.activity || [])
        .map((a) => [a.reason, a.status, a.source].filter(Boolean).join(" "))
        .join(" ");

      const haystack = [
        mechanic.fullName,
        mechanic.mechanicNumber,
        mechanic.phone,
        mechanic.mechanicId,
        activityText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [mechanics, search]);

  const summary = useMemo(() => {
    let onlineCount = 0;
    let offlineCount = 0;
    let totalEvents = 0;
    let currentlyOnline = 0;

    mechanics.forEach((m) => {
      if (String(m.currentStatus || "").toLowerCase() === "online") currentlyOnline += 1;
      (m.activity || []).forEach((a) => {
        totalEvents += 1;
        if (a.status === "online") onlineCount += 1;
        if (a.status === "offline") offlineCount += 1;
      });
    });

    return {
      onlineCount,
      offlineCount,
      totalEvents,
      uniqueMechanics: mechanics.length,
      currentlyOnline,
    };
  }, [mechanics]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || "All Time";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Mechanic Status Tracking</h1>
              <p className="text-sm text-gray-500 mt-1">
                Monitor mechanic online and offline status changes — {periodLabel.toLowerCase()} view
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search mechanic, number, phone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={fetchStatusHistory}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  period === opt.value
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-gray-400">Mechanics</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-emerald-600">Went Online</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.onlineCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-gray-500">Went Offline</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">{summary.offlineCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-amber-600">Currently Online</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{summary.currentlyOnline}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-600">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-red-500" />
              Loading status history...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">{error}</div>
          ) : filteredMechanics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              <Activity size={32} className="mx-auto mb-2 text-gray-300" />
              No mechanics found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMechanics.map((mechanic, index) => (
                <MechanicActivityCard
                  key={mechanic.mechanicId}
                  mechanic={mechanic}
                  defaultExpanded={index === 0}
                  onStatusChange={fetchStatusHistory}
                />
              ))}
            </div>
          )}

          {!loading && !error && total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} mechanics
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MechanicStatusTracking;
