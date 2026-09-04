import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  FileText,
  RefreshCw,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const STATUS_OPTIONS = ["Pending", "Open", "In Progress", "Resolved", "Closed"];
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const getTicketDocId = (ticket) =>
  ticket?.ticketDocId || ticket?._id || ticket?.id;
const normalizeStatusKey = (status) =>
  String(status || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getStatusStyle = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-800 border border-amber-200",
    open: "bg-red-100 text-red-700 border border-red-200",
    "in progress": "bg-blue-100 text-blue-700 border border-blue-200",
    resolved: "bg-green-100 text-green-700 border border-green-200",
    closed: "bg-gray-100 text-gray-600 border border-gray-200",
  };
  return map[normalizeStatusKey(status)] || "bg-gray-100 text-gray-600 border border-gray-200";
};

const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-gray-400">-</span>;
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}
    >
      {status}
    </span>
  );
};

const Reports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedReplyIndex, setSelectedReplyIndex] = useState(0);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  /* ================= FILTER LOGIC ================= */

  const filteredReports = reports.filter((r) => {
    const searchText = searchQuery.toLowerCase();
    const userName = String(r.userDetails?.name || "").toLowerCase();
    const contactEmail = String(r.userDetails?.email || "").toLowerCase();
    const contactPhone = String(r.userDetails?.phone || "").toLowerCase();
    const ticketId = String(r.ticketId || "").toLowerCase();
    const issueType = String(r.issueType || "").toLowerCase();
    const description = String(r.description || "").toLowerCase();

    const matchSearch =
      userName.includes(searchText) ||
      contactEmail.includes(searchText) ||
      contactPhone.includes(searchText) ||
      ticketId.includes(searchText) ||
      issueType.includes(searchText) ||
      description.includes(searchText);

    const matchStatus =
      filterStatus === "all" || normalizeStatusKey(r.status) === filterStatus;
    const matchCategory =
      filterCategory === "all" ||
      String(r.issueType || "").toLowerCase() === filterCategory.toLowerCase();

    return matchSearch && matchStatus && matchCategory;
  });

  /* ================= UPDATE STATUS (LOCAL) ================= */

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/support/admin/support-tickets`);
      const data = await res.json();
      if (data.success) {
        const tickets = Array.isArray(data.data) ? data.data : [];
        setReports(tickets);
        return tickets;
      }
      setError(data.message || "Failed to load support tickets");
      return [];
    } catch (err) {
      setError(err.message || "Unable to fetch support tickets");
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    setReplyMessage("");
    setSelectedReplyIndex(0);
  }, [selectedReport]);

  const updateStatus = async (ticketDocId, status) => {
    if (!ticketDocId) {
      setError("Ticket document ID not found");
      return;
    }

    setUpdatingStatus(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/support/admin/update-ticket-status/${ticketDocId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update status");

      setReports((prev) =>
        prev.map((r) =>
          getTicketDocId(r) === ticketDocId ? { ...r, status } : r
        )
      );

      const tickets = await fetchTickets(true);
      const updated = tickets.find((t) => getTicketDocId(t) === ticketDocId);
      if (updated) setSelectedReport(updated);
    } catch (err) {
      setError(err.message || "Unable to update ticket status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const replyToTicket = async () => {
    if (!selectedReport || !replyMessage.trim()) return;

    const ticketDocId = getTicketDocId(selectedReport);
    if (!ticketDocId) {
      setError("Ticket document ID not found");
      return;
    }

    setReplying(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/support/admin/reply-ticket/${ticketDocId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: replyMessage.trim() }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to send reply");

      setReplyMessage("");
      const tickets = await fetchTickets(true);
      const updated = tickets.find((t) => getTicketDocId(t) === ticketDocId);
      if (updated) setSelectedReport(updated);
    } catch (err) {
      setError(err.message || "Unable to send reply");
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="p-6">
          {/* HEADER */}
          <div className="flex justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Support Tickets
              </h1>
              <p className="text-sm text-gray-500">
                Manage customer support issues · {reports.length} ticket
                {reports.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={fetchTickets}
              disabled={loading}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* SEARCH & FILTER */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email or ticket ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full py-2 border rounded-lg"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={normalizeStatusKey(status)}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="all">All Categories</option>
              <option value="Payment Issue">Payment Issue</option>
              <option value="Booking Issue">Booking Issue</option>
              <option value="Service Quality">Service Quality</option>
              <option value="App Issue">App Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">Ticket ID</th>
                  <th className="p-4 text-left">User</th>
                  <th className="p-4 text-left">Role</th>
                  <th className="p-4 text-left">Issue</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Date</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length ? (
                  filteredReports.map((r) => (
                    <tr key={getTicketDocId(r)} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-800">
                        {r.ticketId || "-"}
                      </td>
                      <td className="p-4">
                        <p className="font-medium">
                          {r.userDetails?.name || "-"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.userDetails?.email ||
                            r.userDetails?.phone ||
                            "-"}
                        </p>
                      </td>
                      <td className="p-4 capitalize">
                        {r.userDetails?.role || "-"}
                      </td>
                      <td className="p-4">{r.issueType || "-"}</td>
                      <td className="p-4 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="p-4 text-center">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="text-red-600 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-gray-500">
                      Loading tickets...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="7" className="p-12 text-center">
                      <FileText size={40} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">No reports found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* ================= MODAL ================= */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold">Ticket Details</h2>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <span>{selectedReport.ticketId}</span>
                  <StatusBadge status={selectedReport.status} />
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)}>
                <X />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-red-50 p-4 rounded-xl">
                  <p className="text-sm font-medium">Ticket ID</p>
                  <p className="text-sm text-gray-600">{selectedReport.ticketId || "-"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm font-medium">Issue Type</p>
                    <p className="text-sm text-gray-600">{selectedReport.issueType || "-"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm font-medium">Created At</p>
                    <p className="text-sm text-gray-600">{formatDate(selectedReport.createdAt)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl overflow-auto max-h-48">
                  <p className="text-sm font-medium mb-3">User Details</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    {Object.entries(
                      selectedReport.userDetails || { userId: selectedReport.userId }
                    ).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-4 rounded-lg bg-white px-3 py-2 border border-gray-100"
                      >
                        <span className="text-gray-500 capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="font-medium text-gray-800 text-right break-words">
                          {value == null || value === "" ? "-" : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedReport.booking && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm font-medium">Booking</p>
                    <p className="text-sm text-gray-600">{selectedReport.booking?.service || "-"}</p>
                    <p className="text-xs text-gray-500">{selectedReport.booking?.vehicle || ""}</p>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-medium">Updated At</p>
                  <p className="text-sm text-gray-600">{formatDate(selectedReport.updatedAt)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm text-gray-700">{selectedReport.description || "No description provided."}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Timeline</h3>
                <div className="space-y-2">
                  {Array.isArray(selectedReport.timeline) && selectedReport.timeline.length > 0 ? (
                    selectedReport.timeline.map((event, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border p-3 bg-white"
                      >
                        <StatusBadge status={event.status} />
                        <span className="text-xs text-gray-500">
                          {formatDate(event.time)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No timeline data available.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Admin Replies</h3>
                <div className="space-y-2">
                  {Array.isArray(selectedReport.replies) &&
                  selectedReport.replies.length > 0 ? (
                    <>
                      <select
                        value={selectedReplyIndex}
                        onChange={(e) => setSelectedReplyIndex(Number(e.target.value))}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        {selectedReport.replies.map((reply, idx) => {
                          const by = (reply.repliedBy || "Admin").toString();
                          const isAdmin = /admin/i.test(by);
                          const short = String(reply.message || "").slice(0, 60);
                          return (
                            <option key={idx} value={idx}>
                              {isAdmin ? "Admin: " : `${by}: `}{short}{reply.message && reply.message.length > 60 ? '...' : ''}
                            </option>
                          );
                        })}
                      </select>

                      {/* selected reply display */}
                      {selectedReport.replies[selectedReplyIndex] ? (
                        (() => {
                          const reply = selectedReport.replies[selectedReplyIndex];
                          const by = reply.repliedBy || "Admin";
                          const isAdmin = /admin/i.test(by);
                          return (
                            <div className="rounded-xl border p-3 bg-white mt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isAdmin ? 'text-red-600' : 'text-gray-700'}`}>
                                    {isAdmin ? 'Admin Reply' : String(by)}
                                  </span>
                                  <span className="text-xs text-gray-500">· {formatDate(reply.repliedAt)}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">{reply.message}</p>
                            </div>
                          );
                        })()
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No replies yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Update Status</h3>
                <select
                  value={selectedReport.status || ""}
                  onChange={(e) =>
                    updateStatus(getTicketDocId(selectedReport), e.target.value)
                  }
                  disabled={updatingStatus}
                  className="w-full border rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="font-medium mb-2">Reply to Ticket</h3>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="We are investigating your issue."
                  rows={3}
                  className="w-full border rounded-lg px-4 py-2 resize-none"
                />
                <button
                  onClick={replyToTicket}
                  disabled={replying || !replyMessage.trim()}
                  className="w-full mt-2 bg-red-600 text-white py-3 rounded-xl disabled:opacity-50"
                >
                  {replying ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
