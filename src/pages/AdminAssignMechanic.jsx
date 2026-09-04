import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Wrench, User, Car, MapPin, Clock, Phone, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const EMPTY = "Not available";

const formatStatus = (status) =>
  (status || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatBookingType = (type) => {
  const map = { instant: "Instant", schedule: "Scheduled", emergency: "Emergency (SOS)" };
  return map[type] || formatStatus(type);
};

const formatDate = (iso) => {
  if (!iso) return EMPTY;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatTimeSlot = (slot) => {
  if (!slot?.from) return EMPTY;
  const to = slot.to ? ` – ${slot.to}` : "";
  return `${slot.from}${to}`;
};

const formatPhone = (phone) => {
  if (!phone) return EMPTY;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
};

const displayText = (value) => {
  if (value == null || value === "") return EMPTY;
  if (typeof value === "object") return EMPTY;
  return String(value).trim();
};

const getServiceNames = (booking) => {
  const details = booking?.serviceDetails || [];
  if (details.length === 0) {
    return booking?.issueType || booking?.issueDetails?.issueType || EMPTY;
  }

  return details
    .map((item) => item?.name)
    .filter(Boolean)
    .join(", ") || EMPTY;
};

const getStatusStyle = (status) => {
  const map = {
    searching: "bg-slate-100 text-slate-700",
    assigned: "bg-blue-100 text-blue-700",
    arrived: "bg-indigo-100 text-indigo-700",
    inspection_started: "bg-purple-100 text-purple-700",
    waiting_for_approval: "bg-amber-100 text-amber-800",
    approved: "bg-teal-100 text-teal-700",
    work_in_progress: "bg-orange-100 text-orange-800",
    work_done: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

const AdminAssignMechanic = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/api/servicebookings/admin/all-admin-assigned-bookings`);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBookings(data.data);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load assigned bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return bookings;

    return bookings.filter((booking) => {
      const customer = booking.customer || {};
      const mechanic = booking.mechanic || {};
      const vehicle = booking.vehicle || {};
      const haystack = [
        booking.bookingId,
        booking.id,
        customer.name,
        customer.phone,
        mechanic.fullName,
        mechanic.mechanicId,
        vehicle.registrationNumber,
        vehicle.vehicleName,
        getServiceNames(booking),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [bookings, search]);

  const summary = useMemo(() => {
    const pending = bookings.filter((item) => String(item.acceptanceStatus || "").toLowerCase() === "pending").length;
    const accepted = bookings.filter((item) => String(item.acceptanceStatus || "").toLowerCase() === "accepted").length;
    return { total: bookings.length, pending, accepted };
  }, [bookings]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Assign Mechanic</h1>
              <p className="text-sm text-gray-500 mt-1">View bookings assigned by admin and track their mechanic assignment status.</p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking, customer, mechanic..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-amber-600">Pending Acceptance</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{summary.pending}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-emerald-600">Accepted</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.accepted}</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Loading assigned bookings...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">{error}</div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              No admin assigned bookings found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => {
                const customer = booking.customer || {};
                const mechanic = booking.mechanic || {};
                const vehicle = booking.vehicle || {};
                const statusStyle = getStatusStyle(String(booking.status || "").toLowerCase());

                return (
                  <div key={booking.bookingId} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/service-tickets?bookingId=${encodeURIComponent(booking.bookingId)}`)}
                            className="text-xs font-semibold uppercase tracking-wide text-red-600 hover:text-red-700 underline-offset-2 hover:underline"
                          >
                            {booking.bookingId}
                          </button>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>
                            {formatStatus(booking.status)}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {formatBookingType(booking.bookingType)}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <User size={15} className="mt-0.5 text-gray-400" />
                            <div>
                              <p className="text-[10px] uppercase text-gray-400">Customer</p>
                              <p className="font-semibold text-gray-800">{displayText(customer.name)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Car size={15} className="mt-0.5 text-gray-400" />
                            <div>
                              <p className="text-[10px] uppercase text-gray-400">Vehicle</p>
                              <p className="font-semibold text-gray-800">{displayText(vehicle.registrationNumber || vehicle.vehicleName)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Wrench size={15} className="mt-0.5 text-gray-400" />
                            <div>
                              <p className="text-[10px] uppercase text-gray-400">Mechanic</p>
                              <p className="font-semibold text-gray-800">{displayText(mechanic.fullName || mechanic.mechanicId)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin size={15} className="mt-0.5 text-gray-400" />
                            <div>
                              <p className="text-[10px] uppercase text-gray-400">Location</p>
                              <p className="font-semibold text-gray-800">{displayText(booking.location?.address)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={13} /> {formatDate(booking.bookingDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} /> {formatTimeSlot(booking.timeSlot)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone size={13} /> {formatPhone(customer.phone)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:min-w-[180px]">
                        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                          <p className="text-[10px] uppercase text-gray-400">Acceptance</p>
                          <p className="font-semibold text-gray-800">{formatStatus(booking.acceptanceStatus)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          View Details <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 p-4 sm:p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Booking Details</p>
                <h2 className="text-lg font-bold text-gray-900">{selectedBooking.bookingId}</h2>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="rounded-full p-2 hover:bg-gray-100">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(String(selectedBooking.status || "").toLowerCase())}`}>
                    {formatStatus(selectedBooking.status)}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {formatBookingType(selectedBooking.bookingType)}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Acceptance: {formatStatus(selectedBooking.acceptanceStatus)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Customer</p>
                    <p className="font-semibold text-gray-800">{displayText(selectedBooking.customer?.name)}</p>
                    <p className="text-sm text-gray-500">{displayText(selectedBooking.customer?.phone)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Assigned Mechanic</p>
                    <p className="font-semibold text-gray-800">{displayText(selectedBooking.mechanic?.fullName || selectedBooking.mechanic?.mechanicId)}</p>
                    <p className="text-sm text-gray-500">{displayText(selectedBooking.mechanic?.phone)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Vehicle</p>
                  <p className="mt-1 font-semibold text-gray-800">{displayText(selectedBooking.vehicle?.vehicleName)}</p>
                  <p className="text-sm text-gray-500">{displayText(selectedBooking.vehicle?.registrationNumber)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Service</p>
                  <p className="mt-1 font-semibold text-gray-800">{getServiceNames(selectedBooking)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-[10px] font-semibold uppercase text-gray-400">Location</p>
                <p className="mt-1 font-semibold text-gray-800">{displayText(selectedBooking.location?.address)}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1"><Calendar size={14} /> {formatDate(selectedBooking.bookingDate)}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={14} /> {formatTimeSlot(selectedBooking.timeSlot)}</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Notes</p>
                  <p className="mt-1 text-sm text-gray-700">{displayText(selectedBooking.notes)}</p>
                </div>
              )}

              {selectedBooking.jobTimeline?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-gray-400" />
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Timeline</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {selectedBooking.jobTimeline.slice(0, 6).map((step, index) => (
                      <div key={`${step.status}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        <span className="font-semibold text-gray-800">{formatStatus(step.status)}</span>
                        {step.time ? ` • ${formatDate(step.time)}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssignMechanic;
