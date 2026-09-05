import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Mail, Phone, Wrench, Car, FileText, Search,
  Users, Briefcase, MapPin, ShieldCheck, Calendar,
  Landmark, Smartphone, CheckCircle2, Clock3, Unlock, Wifi, WifiOff, Activity
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

/* ================= SKELETON ================= */
const MechanicSkeleton = () => (
  <div className="bg-white rounded-2xl border p-5 animate-pulse">
    <div className="flex justify-center mb-4">
      <div className="w-24 h-24 rounded-full bg-gray-200" />
    </div>
    <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
    <div className="h-10 bg-gray-200 rounded-lg mt-4" />
  </div>
);

const BOOKING_TIME_SLOT_OPTIONS = [
  { value: "all", label: "All Time Slots" },
  { value: "10-12", label: "10:00 AM to 12:00 PM" },
  { value: "12-2", label: "12:00 PM to 02:00 PM" },
  { value: "2-4", label: "02:00 PM to 04:00 PM" },
  { value: "4-6", label: "04:00 PM to 06:00 PM" },
];

const ACTIVE_BOOKING_STATUSES = new Set([
  "searching",
  "assigned",
  "arrived",
  "inspection_started",
  "waiting_for_approval",
  "job_sheet_rejected",
  "approved",
  "work_in_progress",
]);

const AdminMechanicProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mechanics, setMechanics] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveStatusFilter, setLiveStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [bookingTimeSlotFilter, setBookingTimeSlotFilter] = useState("all");
  const [bookingDateFrom, setBookingDateFrom] = useState("");
  const [bookingDateTo, setBookingDateTo] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchMechanics();
    fetchServiceBookings();
  }, []);

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/mechanics`);
      const data = await res.json();
      if (data.success) {
        setMechanics(data.data.map(m => ({
          ...m,
          name: m.fullName,
          experience: m.skills?.experience || "N/A",
          profileImage: m.profilePhoto,
        })));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchServiceBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/servicebookings/all-Admin_bookings`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch service bookings for availability", err);
    }
  };

  const fetchSingleMechanic = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/mechanics/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedMechanic({ ...data.data, name: data.data.fullName });
        setActiveTab("overview");
      }
    } catch (err) { console.error(err); }
  };

  const updateMechanicStatus = async (id, status) => {
    const remark = window.prompt(`Enter remark for ${status}:`, "Verified by Admin");
    if (remark === null) return;

    try {
      await fetch(`${API_BASE}/api/admin/mechanics/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remark }),
      });
      setSelectedMechanic(null);
      fetchMechanics();
    } catch (err) { console.error(err); }
  };

  const unlockMechanic = async (id) => {
    const confirmed = window.confirm(
      "Unlock and reactivate this mechanic? They will be able to go online immediately."
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/mechanics/${id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: "admin" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Mechanic unlocked and reactivated successfully.");
        fetchMechanics();
        if (selectedMechanic?.id === id) {
          fetchSingleMechanic(id);
        }
      } else {
        alert(data.message || "Failed to unlock mechanic");
      }
    } catch (err) {
      console.error(err);
      alert("Error unlocking mechanic");
    }
  };

  const getLiveStatusMeta = (mechanic, activeBookings = []) => {
    const status = resolveEffectiveLiveStatus(mechanic, activeBookings);
    const map = {
      online: {
        label: "Online",
        tone: "bg-green-50 text-green-700 border-green-200",
        icon: <Wifi size={14} />,
      },
      engaged: {
        label: "Engaged",
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <Activity size={14} />,
      },
      offline: {
        label: "Offline",
        tone: "bg-slate-100 text-slate-600 border-slate-200",
        icon: <WifiOff size={14} />,
      },
    };
    return map[status] || map.offline;
  };

  const formatLockedTill = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString("en-IN");
    } catch {
      return value;
    }
  };
  const suspendMechanic = async (id) => {
    const reason = window.prompt("Enter suspension reason:", "Fake documents submitted");
    if (reason === null) return;

    try {
      const res = await fetch(`${API_BASE}/api/master/suspend/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedMechanic(null);
        fetchMechanics();
      } else {
        alert("Failed to suspend mechanic");
      }
    } catch (err) { 
      console.error(err);
      alert("Error suspending mechanic");
    }
  };

  const generateMechanicId = async (id, fullName) => {
    const mechanicId = window.prompt("Enter Mechanic ID:", "");
    if (mechanicId === null || mechanicId.trim() === "") return;

    try {
      const res = await fetch(`${API_BASE}/api/master/generate-customer-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, mechanicId: mechanicId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Mechanic ID generated successfully");
        setSelectedMechanic(null);
        fetchMechanics();
      } else {
        alert("Failed to generate Mechanic ID: " + (data.message || "Unknown error"));
      }
    } catch (err) { 
      console.error(err);
      alert("Error generating Mechanic ID");
    }
  };

  // Export filtered mechanics to CSV
  const exportMechanicsToCSV = () => {
    if (!filteredMechanics || filteredMechanics.length === 0) {
      alert('No mechanics to export');
      return;
    }

    const rows = filteredMechanics.map(m => ({
      MechanicId: m.mechanicId || m.kyc?.mechanicId || m.id || '',
      Name: m.name || m.fullName || '',
      Email: m.email || '',
      Phone: m.phone || '',
      Status: m.status || '',
      LiveStatus: m.liveStatus || 'offline',
      IsLocked: m.isLocked ? 'Yes' : 'No',
      GarageName: m.garage?.name || '',
      City: m.garage?.city || '',
      State: m.garage?.state || '',
      PinCode: m.garage?.pin || '',
      Address: m.garage?.address || '',
      hasToolKit: m.hasToolKit ? 'Yes' : 'No',
      hasVehicle: m.hasVehicle ? 'Yes' : 'No',
      hasGarage: m.hasGarage ? 'Yes' : 'No',
      Skills: m.skills ? [
        ...(m.skills.services || []).map(s => `Service: ${s}`),
        ...(m.skills.expertise || []).map(e => `Expertise: ${e}`),
      ].join(', ') : '',
      vehiclesHandled: m.skills?.vehicles ? m.skills.vehicles.join(', ') : '',
      equipment: m.skills?.equipment ? m.skills.equipment.join(', ') : '',
      KYC_Aadhaar: m.kyc?.aadhaarNumber || '',
      KYC_PAN: m.kyc?.panNumber || '',
      KYC_DrivingLicense: m.kyc?.drivingLicenseNumber || '',
      BankName: m.bank?.bankName || '',
      AccountNumber: m.bank?.accountNumber || '',
      IFSC: m.bank?.ifsc || '',
    }));

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map(r => header.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mechanics_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const normalizeValue = (value) => String(value ?? "").toLowerCase().trim();

  const isMechanicApproved = (mechanic) =>
    normalizeValue(mechanic?.status) === "approved";

  const bookingBelongsToMechanic = (booking, mechanic) => {
    const bookingMechanic = booking?.mechanic || {};
    const bookingValues = [
      booking?.mechanicId,
      bookingMechanic.id,
      bookingMechanic._id,
      bookingMechanic.userId,
      bookingMechanic.mechanicID,
      bookingMechanic.mechanicId,
    ]
      .filter(Boolean)
      .map(normalizeValue);

    const mechanicValues = [
      mechanic?.id,
      mechanic?._id,
      mechanic?.userId,
      mechanic?.mechanicID,
      mechanic?.mechanicId,
      mechanic?.kyc?.mechanicId,
    ]
      .filter(Boolean)
      .map(normalizeValue);

    return bookingValues.some((value) => mechanicValues.includes(value));
  };

  const isActiveBookingStatus = (status) =>
    ACTIVE_BOOKING_STATUSES.has(normalizeValue(status));

  const resolveEffectiveLiveStatus = (mechanic, activeBookings = []) => {
    if (!isMechanicApproved(mechanic)) {
      return "offline";
    }

    if (activeBookings.length > 0) {
      return "engaged";
    }

    const raw = normalizeValue(mechanic?.rawStatus || mechanic?.liveStatus || "offline");
    return raw === "online" ? "online" : "offline";
  };

  const parseTimeToMinutes = (value) => {
    if (!value && value !== 0) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const match = raw.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const meridiem = (match[3] || "").toUpperCase();

    if (meridiem === "AM" && hours === 12) hours = 0;
    if (meridiem === "PM" && hours !== 12) hours += 12;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const getBookingTimeSlotBucket = (booking) => {
    const slot = booking?.timeSlot || {};
    const fromValue = slot?.from || slot?.start;
    const toValue = slot?.to || slot?.end;

    const from = parseTimeToMinutes(fromValue);
    const to = parseTimeToMinutes(toValue);

    if (from == null || to == null) return null;

    const ranges = [
      { value: "10-12", label: "10:00 AM to 12:00 PM", start: 10 * 60, end: 12 * 60 },
      { value: "12-2", label: "12:00 PM to 02:00 PM", start: 12 * 60, end: 14 * 60 },
      { value: "2-4", label: "02:00 PM to 04:00 PM", start: 14 * 60, end: 16 * 60 },
      { value: "4-6", label: "04:00 PM to 06:00 PM", start: 16 * 60, end: 18 * 60 },
    ];

    return ranges.find((range) => from < range.end && to > range.start)?.value || null;
  };

  const getBookingTimeSlotLabel = (booking) => {
    const bucket = getBookingTimeSlotBucket(booking);
    if (!bucket) {
      const slot = booking?.timeSlot || {};
      const from = slot?.from || slot?.start;
      const to = slot?.to || slot?.end;
      return from && to ? `${from} - ${to}` : "Not available";
    }

    return BOOKING_TIME_SLOT_OPTIONS.find((option) => option.value === bucket)?.label || "Not available";
  };

  const getActualBookingTime = (booking) => {
    const slot = booking?.timeSlot || {};
    const from = slot?.from || slot?.start;
    const to = slot?.to || slot?.end;
    return from && to ? `${from} - ${to}` : "Not available";
  };

  const getBookingDateValue = (booking) => {
    const rawDate = booking?.bookingDate || booking?.serviceDate || booking?.date || booking?.createdAt;
    if (!rawDate) return null;

    if (typeof rawDate === "object") {
      if (rawDate._seconds) return new Date(rawDate._seconds * 1000);
      if (rawDate.seconds) return new Date(rawDate.seconds * 1000);
      if (rawDate.toDate) return rawDate.toDate();
    }

    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatBookingDate = (booking) => {
    const date = getBookingDateValue(booking);
    return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date";
  };

  const sortBookingsByDateDesc = (bookingsList) => {
    return [...bookingsList].sort((a, b) => {
      const aDate = getBookingDateValue(a)?.getTime() || 0;
      const bDate = getBookingDateValue(b)?.getTime() || 0;
      return bDate - aDate;
    });
  };

  const bookingMatchesDateFilters = (booking) => {
    if (!bookingDateFrom && !bookingDateTo) return true;
    const date = getBookingDateValue(booking);
    if (!date) return false;

    if (bookingDateFrom) {
      const fromDate = new Date(bookingDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (date < fromDate) return false;
    }

    if (bookingDateTo) {
      const toDate = new Date(bookingDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }

    return true;
  };

  const getMechanicBookingContext = (mechanic, selectedTimeSlot = "all") => {
    if (!isMechanicApproved(mechanic)) {
      return {
        relatedBookings: [],
        activeBookings: [],
        available: false,
      };
    }

    const relatedBookings = bookings.filter((booking) => {
      if (!bookingMatchesDateFilters(booking)) return false;
      return bookingBelongsToMechanic(booking, mechanic);
    });

    const activeBookings = relatedBookings.filter((booking) => {
      const matchesSlot =
        selectedTimeSlot === "all" ||
        getBookingTimeSlotBucket(booking) === selectedTimeSlot;
      return matchesSlot && isActiveBookingStatus(booking.status);
    });

    return {
      relatedBookings,
      activeBookings,
      available: activeBookings.length === 0,
    };
  };

  const getMechanicAvailability = (mechanic, activeBookings = []) => {
    const approvalStatus = (mechanic?.status || "").toLowerCase();

    if (approvalStatus === "rejected") {
      return {
        key: "rejected",
        label: "Rejected",
        tone: "bg-red-50 text-red-700 border-red-200",
        available: false,
        icon: <X size={14} />,
      };
    }

    if (approvalStatus === "suspended") {
      return {
        key: "suspended",
        label: "Suspended",
        tone: "bg-orange-50 text-orange-700 border-orange-200",
        available: false,
        icon: <ShieldCheck size={14} />,
      };
    }

    if (approvalStatus && approvalStatus !== "approved") {
      const pendingLabel = approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1);
      return {
        key: "pending",
        label: pendingLabel,
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        available: false,
        icon: <Clock3 size={14} />,
      };
    }

    if (activeBookings.length > 0) {
      return {
        key: "busy",
        label: "Busy",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        available: false,
        icon: <Clock3 size={14} />,
      };
    }

    const live = resolveEffectiveLiveStatus(mechanic, activeBookings);

    if (live === "offline") {
      return {
        key: "offline",
        label: "Offline",
        tone: "bg-slate-100 text-slate-600 border-slate-200",
        available: false,
        icon: <WifiOff size={14} />,
      };
    }

    return {
      key: "available",
      label: "Available",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      available: true,
      icon: <CheckCircle2 size={14} />,
    };
  };

  const isDateFilterActive = Boolean(bookingDateFrom || bookingDateTo);
  const effectiveAvailabilityFilter = isDateFilterActive && availabilityFilter === 'all' ? 'busy' : availabilityFilter;

  const filteredMechanics = mechanics.filter((m) => {
    const mechanicId = (m.mechanicId || m.kyc?.mechanicId || m.id || "").toString().toLowerCase();
    const keyword = search.toLowerCase();
    const name = (m.name || m.fullName || "").toString().toLowerCase();
    const phone = (m.phone || "").toString();
    const { activeBookings } = getMechanicBookingContext(m, bookingTimeSlotFilter);
    const availability = getMechanicAvailability(m, activeBookings);
    const effectiveLiveStatus = resolveEffectiveLiveStatus(m, activeBookings);
    const matchesSearch = (
      name.includes(keyword) ||
      phone.includes(keyword) ||
      mechanicId.includes(keyword)
    );

    const matchesStatus = statusFilter === 'all' || (m.status && m.status.toLowerCase() === statusFilter.toLowerCase());
    const matchesLiveStatus = liveStatusFilter === 'all' || effectiveLiveStatus === liveStatusFilter.toLowerCase();
    const matchesAvailability =
      effectiveAvailabilityFilter === "all" ||
      availability.key === effectiveAvailabilityFilter;
    const matchesTimeSlot = bookingTimeSlotFilter === 'all' || activeBookings.length > 0;

    return matchesSearch && matchesStatus && matchesLiveStatus && matchesAvailability && matchesTimeSlot;
  });

  const onlineCount = filteredMechanics.filter((m) => {
    const { activeBookings } = getMechanicBookingContext(m, bookingTimeSlotFilter);
    return resolveEffectiveLiveStatus(m, activeBookings) === 'online';
  }).length;
  const engagedCount = filteredMechanics.filter((m) => {
    const { activeBookings } = getMechanicBookingContext(m, bookingTimeSlotFilter);
    return resolveEffectiveLiveStatus(m, activeBookings) === 'engaged';
  }).length;
  const offlineCount = filteredMechanics.filter((m) => {
    const { activeBookings } = getMechanicBookingContext(m, bookingTimeSlotFilter);
    return resolveEffectiveLiveStatus(m, activeBookings) === 'offline';
  }).length;
  const lockedCount = filteredMechanics.filter((m) => m.isLocked).length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Mechanic Management</h1>
              <p className="text-slate-500 text-sm">Review and manage professional mechanics</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, phone, or mechanic ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Online</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{onlineCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Engaged</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{engagedCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Offline</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{offlineCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Locked accounts</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{lockedCount}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total mechanics</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{mechanics.length}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={"px-3 py-2 rounded-lg text-sm " + (viewMode === 'grid' ? 'bg-slate-900 text-white' : 'bg-gray-100')}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={"px-3 py-2 rounded-lg text-sm " + (viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-gray-100')}
              >
                Table
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportMechanicsToCSV()}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Export CSV
              </button>

              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={bookingDateFrom}
                  onChange={(e) => setBookingDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={bookingDateTo}
                  onChange={(e) => setBookingDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    setBookingDateFrom("");
                    setBookingDateTo("");
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                >
                  Clear dates
                </button>
              </div>

              <select
                value={bookingTimeSlotFilter}
                onChange={(e) => setBookingTimeSlotFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                {BOOKING_TIME_SLOT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={liveStatusFilter}
                onChange={(e) => setLiveStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Live Status</option>
                <option value="online">Online</option>
                <option value="engaged">Engaged</option>
                <option value="offline">Offline</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading ? (
                [...Array(8)].map((_, i) => <MechanicSkeleton key={i} />)
              ) : filteredMechanics.map((m) => {
                const { activeBookings } = getMechanicBookingContext(m, bookingTimeSlotFilter);
                const availability = getMechanicAvailability(m, activeBookings);
                const liveStatus = getLiveStatusMeta(m, activeBookings);
                const effectiveLiveStatus = resolveEffectiveLiveStatus(m, activeBookings);
                return (
                  <div key={m.id || m.email || m.mechanicId} className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 h-1.5 w-full ${m.status === 'rejected' || m.status === 'suspended' ? 'bg-red-500' : m.status === 'approved' ? 'bg-green-500' : 'bg-amber-500'}`} />

                    <div className="flex flex-col items-center">
                      <div className="relative mt-2">
                        <img src={m.profilePhoto || 'https://via.placeholder.com/150'} className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm" alt={m.name} />
                        <span className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${effectiveLiveStatus === 'online' ? 'bg-green-500' : effectiveLiveStatus === 'engaged' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                      </div>
                      <h3 className="mt-4 font-bold text-slate-800 text-lg line-clamp-1">{m.name}</h3>
                      <div className="flex items-center text-slate-500 text-sm gap-1 mb-2">
                        <MapPin size={14} /> {m.garage?.city || "Unknown"}
                      </div>
                      <span className={`inline-flex items-center gap-1 mb-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${liveStatus.tone}`}>
                        {liveStatus.icon}
                        {liveStatus.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${availability.tone}`}>
                        {availability.icon}
                        {availability.label}
                      </span>
                      {m.isLocked && (
                        <p className="text-[11px] text-amber-700 mb-2 text-center px-2">
                          Locked until {formatLockedTill(m.lockedTill)}
                        </p>
                      )}
                      <p className="text-slate-400 text-xs mb-4">Mechanic ID: {m.mechanicId || m.kyc?.mechanicId || m.id || 'N/A'}</p>

                      {isMechanicApproved(m) && activeBookings.length > 0 && (
                        <div className="w-full mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1.5">Active Booking Slots</p>
                          <div className="flex flex-col gap-1.5">
                            {sortBookingsByDateDesc(activeBookings).slice(0, 2).map((booking) => {
                              const bookingId = booking.bookingId || booking._id || booking.id;
                              if (!bookingId) return null;
                              return (
                                <button
                                  key={bookingId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/service-tickets?bookingId=${encodeURIComponent(bookingId)}`);
                                  }}
                                  className="flex flex-col items-start gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-left"
                                >
                                  <span className="text-[11px] font-semibold text-amber-700 truncate">{bookingId}</span>
                                  <span className="text-[10px] text-slate-600">{formatBookingDate(booking)} · {getActualBookingTime(booking)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => fetchSingleMechanic(m.id)}
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : filteredMechanics.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No mechanics to display</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mechanic ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Live Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Approval</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Availability</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredMechanics.map((m) => {
                        const { activeBookings } = getMechanicBookingContext(m, bookingTimeSlotFilter);
                        const availability = getMechanicAvailability(m, activeBookings);
                        const liveStatus = getLiveStatusMeta(m, activeBookings);
                        return (
                          <tr key={m.id || m.email || m.mechanicId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{m.mechanicId || m.kyc?.mechanicId || m.id || ''}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{m.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{m.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{m.phone}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${liveStatus.tone}`}>
                                  {liveStatus.icon}
                                  {liveStatus.label}
                                </span>
                                {m.isLocked && (
                                  <p className="text-[10px] text-amber-700">Locked until {formatLockedTill(m.lockedTill)}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 capitalize">{m.status || "pending"}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="space-y-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${availability.tone}`}>
                                  {availability.icon}
                                  {availability.label}
                                </span>
                                {isMechanicApproved(m) && activeBookings.length > 0 && (
                                  <div className="flex flex-col gap-1.5">
                                    {activeBookings.map((booking) => {
                                      const bookingId = booking.bookingId || booking._id || booking.id;
                                      if (!bookingId) return null;
                                      return (
                                        <button
                                          key={bookingId}
                                          onClick={() => navigate(`/service-tickets?bookingId=${encodeURIComponent(bookingId)}`)}
                                          className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left"
                                        >
                                          <div className="text-[11px] font-semibold text-amber-700">{bookingId}</div>
                                          <div className="text-[10px] text-slate-600">{formatBookingDate(booking)} · {getActualBookingTime(booking)}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => fetchSingleMechanic(m.id)}
                                  className="px-3 py-1 rounded-lg bg-slate-900 text-white text-sm"
                                >
                                  View
                                </button>
                                {m.isLocked && (
                                  <button
                                    onClick={() => unlockMechanic(m.id)}
                                    className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 text-sm font-semibold"
                                  >
                                    Unlock
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {selectedMechanic && (() => {
            const { activeBookings: selectedActiveBookings } = getMechanicBookingContext(
              selectedMechanic,
              bookingTimeSlotFilter
            );
            const selectedAvailability = getMechanicAvailability(
              selectedMechanic,
              selectedActiveBookings
            );
            const selectedLiveStatus = getLiveStatusMeta(
              selectedMechanic,
              selectedActiveBookings
            );

            return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <img src={selectedMechanic.profilePhoto} className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedMechanic.name}</h2>
                      <p className="text-sm text-slate-500 mt-1">Mechanic ID: {selectedMechanic.mechanicId || selectedMechanic.kyc?.mechanicId || selectedMechanic.id || 'N/A'}</p>
                      <div className="flex flex-wrap gap-2 items-center mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          selectedMechanic.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : selectedMechanic.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : selectedMechanic.status === 'suspended'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedMechanic.status || "pending"}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${selectedLiveStatus.tone}`}>
                          {selectedLiveStatus.icon}
                          {selectedLiveStatus.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${selectedAvailability.tone}`}>
                          {selectedAvailability.icon}
                          {selectedAvailability.label}
                        </span>
                        {selectedMechanic.isLocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                            Locked until {formatLockedTill(selectedMechanic.lockedTill)}
                          </span>
                        )}
                        <span className="text-slate-400 text-xs">• Joined {new Date(selectedMechanic.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMechanic(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-100 px-6 overflow-x-auto no-scrollbar bg-white">
                  {['overview', 'garage', 'skills', 'documents', 'payout'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-4 text-sm font-bold border-b-2 mb-8 transition-all capitalize whitespace-nowrap ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
                  {isMechanicApproved(selectedMechanic) && selectedActiveBookings.length > 0 ? (
                      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock3 size={16} className="text-amber-600" />
                          <h3 className="text-sm font-semibold text-amber-800">Active Service Tickets</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          {selectedActiveBookings.map((booking) => {
                            const bookingId = booking.bookingId || booking._id || booking.id;
                            if (!bookingId) return null;
                            return (
                              <button
                                key={bookingId}
                                onClick={() => navigate(`/service-tickets?bookingId=${encodeURIComponent(bookingId)}`)}
                                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-left"
                              >
                                <span className="text-sm font-semibold text-amber-700">{bookingId}</span>
                                <span className="text-xs font-medium text-slate-600">{formatBookingDate(booking)} · {getActualBookingTime(booking)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <SectionTitle icon={<Users size={18} />} title="Basic Details" />
                        <div className="grid gap-4">
                            <InfoCard label="Email Address" value={selectedMechanic.email || "No Email Provided"} icon={<Mail size={16} />} />
                          <InfoCard label="Phone Number" value={selectedMechanic.phone} icon={<Phone size={16} />} />
                          <InfoCard label="Mechanic ID" value={selectedMechanic.mechanicId || selectedMechanic.kyc?.mechanicId || selectedMechanic.id || "N/A"} icon={<ShieldCheck size={16} />} />
                          <InfoCard label="User ID" value={selectedMechanic.id || "N/A"} icon={<FileText size={16} />} />
                          <InfoCard label="Live Status" value={selectedLiveStatus.label} icon={<Activity size={16} />} />
                          {selectedMechanic.isLocked && (
                            <InfoCard label="Locked Until" value={formatLockedTill(selectedMechanic.lockedTill)} icon={<Clock3 size={16} />} />
                          )}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <SectionTitle icon={<ShieldCheck size={18} />} title={selectedMechanic.status === 'suspended' ? 'Suspension Status' : selectedMechanic.status === 'rejected' ? 'Rejection Status' : 'Verification Logs'} />
                        {selectedMechanic.status === 'suspended' ? (
                          <div className="p-5 bg-red-50 rounded-2xl border border-red-100 border-l-4 border-l-red-500">
                            <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Status</p>
                            <p className="text-red-700 font-semibold text-sm">Suspended</p>
                            <p className="text-sm italic text-red-600 mt-2">Reason: {selectedMechanic.remarks?.suspended || selectedMechanic.suspended || selectedMechanic.adminRemark || selectedMechanic.reason || selectedMechanic.suspensionReason || 'No reason provided'}</p>
                            <p className="text-[10px] text-red-400 mt-4">Suspended On: {selectedMechanic.updatedAt ? new Date(selectedMechanic.updatedAt).toLocaleString() : 'N/A'}</p>
                          </div>
                        ) : selectedMechanic.status === 'rejected' ? (
                          <div className="p-5 bg-red-50 rounded-2xl border border-red-100 border-l-4 border-l-red-500">
                            <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Status</p>
                            <p className="text-red-700 font-semibold text-sm">Rejected</p>
                            <p className="text-sm italic text-red-600 mt-2">Reason: {selectedMechanic.adminRemark || selectedMechanic.remark || selectedMechanic.rejectionReason || 'No reason provided'}</p>
                            <p className="text-[10px] text-red-400 mt-4">Last Reviewed: {selectedMechanic.reviewedAt ? new Date(selectedMechanic.reviewedAt).toLocaleString() : 'N/A'}</p>
                          </div>
                        ) : (
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-blue-500">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Last Admin Remark</p>
                            <p className="text-slate-700 italic text-sm">"{selectedMechanic.adminRemark || (selectedMechanic.status === 'approved' ? 'Verified by Admin' : 'No remarks provided yet.')}"</p>
                            <p className="text-[10px] text-slate-400 mt-4">Last Reviewed: {selectedMechanic.reviewedAt ? new Date(selectedMechanic.reviewedAt).toLocaleString() : 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'garage' && (
                    <div className="space-y-6">
                      <SectionTitle icon={<MapPin size={18} />} title="Garage Location & Access" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InfoCard label="Garage Name" value={selectedMechanic.garage?.name} />
                        <InfoCard label="City" value={selectedMechanic.garage?.city} />
                        <InfoCard label="State" value={selectedMechanic.garage?.state} />
                        <InfoCard label="Pin Code" value={selectedMechanic.garage?.pin} />
                        <div className="md:col-span-2">
                          <InfoCard label="Full Address" value={selectedMechanic.garage?.address} />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className={`px-4 py-2 rounded-lg text-xs font-bold ${selectedMechanic.hasGarage ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600'}`}>
                          {selectedMechanic.hasGarage ? "✓ Has Physical Garage" : "✗ No Garage"}
                        </div>
                        <div className={`px-4 py-2 rounded-lg text-xs font-bold ${selectedMechanic.hasVehicle ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600'}`}>
                          {selectedMechanic.hasVehicle ? "✓ Owns Recovery Vehicle" : "✗ No Vehicle"}
                        </div>
                        <div className={`px-4 py-2 rounded-lg text-xs font-bold ${selectedMechanic.hasToolKit ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600'}`}>
                          {selectedMechanic.hasToolKit ? "✓ Has Tool Kit" : "✗ No Tool Kit"}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'skills' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <SectionTitle icon={<Wrench size={18} />} title="Service Capabilities" />
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">General Services</h4>
                          <TagList items={selectedMechanic.skills?.services} color="blue" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Area of Expertise</h4>
                          <TagList items={selectedMechanic.skills?.expertise} color="green" />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <SectionTitle icon={<Car size={18} />} title="Vehicles & Tools" />
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Vehicles Handled</h4>
                          <TagList items={selectedMechanic.skills?.vehicles} color="purple" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Equipment Available</h4>
                          <TagList items={selectedMechanic.skills?.equipment} color="amber" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div className="space-y-8">
                      <SectionTitle icon={<FileText size={18} />} title="KYC Documents" />

                      {/* Document Numbers */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InfoCard
                          label="Aadhaar Number"
                          value={selectedMechanic.kyc?.aadhaarNumber || "N/A"}
                        />

                        <InfoCard
                          label="PAN Number"
                          value={selectedMechanic.kyc?.panNumber || "N/A"}
                        />

                        <InfoCard
                          label="Driving License Number"
                          value={selectedMechanic.kyc?.drivingLicenseNumber || "N/A"}
                        />
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap gap-3">
                        <DocBadge
                          label="AADHAAR"
                          exists={!!selectedMechanic.kyc?.aadhaarImage}
                        />

                        <DocBadge
                          label="PAN"
                          exists={!!selectedMechanic.kyc?.panImage}
                        />

                        <DocBadge
                          label="LICENSE"
                          exists={!!selectedMechanic.kyc?.licenseImage}
                        />
                      </div>

                      {/* Document previews */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Aadhaar */}
                        {selectedMechanic.kyc?.aadhaarImage && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Aadhaar Card Preview
                            </p>

                            <a
                              href={selectedMechanic.kyc.aadhaarImage}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={selectedMechanic.kyc.aadhaarImage}
                                alt="Aadhaar"
                                className="w-full rounded-xl border-4 border-slate-50 shadow-lg hover:brightness-90 transition-all cursor-zoom-in"
                              />
                            </a>
                          </div>
                        )}

                        {/* PAN */}
                        {selectedMechanic.kyc?.panImage && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              PAN Card Preview
                            </p>

                            <a
                              href={selectedMechanic.kyc.panImage}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={selectedMechanic.kyc.panImage}
                                alt="PAN"
                                className="w-full rounded-xl border-4 border-slate-50 shadow-lg hover:brightness-90 transition-all cursor-zoom-in"
                              />
                            </a>
                          </div>
                        )}

                        {/* Driving License */}
                        {selectedMechanic.kyc?.licenseImage && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Driving License Preview
                            </p>

                            <a
                              href={selectedMechanic.kyc.licenseImage}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={selectedMechanic.kyc.licenseImage}
                                alt="License"
                                className="w-full rounded-xl border-4 border-slate-50 shadow-lg hover:brightness-90 transition-all cursor-zoom-in"
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'payout' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <SectionTitle icon={<Landmark size={18} />} title="Bank Account" />
                        {selectedMechanic.bank ? (
                          <div className="grid gap-4">
                            <InfoCard label="Bank Name" value={selectedMechanic.bank.bankName} />
                            <InfoCard label="Account Number" value={selectedMechanic.bank.accountNumber} />
                            <InfoCard label="IFSC Code" value={selectedMechanic.bank.ifsc} />
                          </div>
                        ) : <p className="text-slate-400 text-sm italic">Bank details not provided</p>}
                      </div>
                      <div className="space-y-6">
                        <SectionTitle icon={<Smartphone size={18} />} title="Digital Payments" />
                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                          <p className="text-indigo-600 text-[10px] font-bold uppercase mb-2">Primary UPI ID</p>
                          <p className="text-indigo-900 font-mono font-bold text-xl">{selectedMechanic.upi?.upiId || 'Not Setup'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50 flex-wrap">
                  {selectedMechanic.isLocked && (
                    <button
                      onClick={() => unlockMechanic(selectedMechanic.id)}
                      className="px-6 py-2.5 rounded-xl border border-amber-300 text-amber-700 font-bold hover:bg-amber-50 transition-colors inline-flex items-center gap-2"
                    >
                      <Unlock size={16} />
                      Unlock / Reactivate
                    </button>
                  )}
                  <button
                    onClick={() => suspendMechanic(selectedMechanic.id)}
                    className="px-6 py-2.5 rounded-xl border border-orange-200 text-orange-600 font-bold hover:bg-orange-50 transition-colors"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => updateMechanicStatus(selectedMechanic.id, "rejected")}
                    className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateMechanicStatus(selectedMechanic.id, "approved")}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-blue-600 transition-all shadow-lg"
                  >
                    Approve Mechanic
                  </button>
                </div>
              </div>
            </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
};

/* ================= HELPER COMPONENTS ================= */

const SectionTitle = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 mb-2">
    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">{icon}</div>
    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{title}</h3>
  </div>
);

const InfoCard = ({ label, value, icon }) => (
  <div className="p-3 bg-white border border-slate-100 rounded-xl">
    <div className="flex items-center gap-1.5 mb-0.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-slate-700 font-semibold text-sm break-all">{value || "—"}</div>
  </div>
);

const DocBadge = ({ label, exists }) => (
  <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${exists ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
    {label}: {exists ? 'PROVIDED' : 'MISSING'}
  </div>
);

const TagList = ({ items, color }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100"
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items?.length > 0 ? items.map((i, idx) => (
        <span key={idx} className={`px-2.5 py-1 ${colors[color]} rounded-md text-[11px] font-bold border`}>
          {i}
        </span>
      )) : <span className="text-slate-400 italic text-xs">No data</span>}
    </div>
  );
};

export default AdminMechanicProfile;
