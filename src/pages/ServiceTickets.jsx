import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  RefreshCw,
  Car,
  User,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  Phone,
  ChevronRight,
  AlertCircle,
  CreditCard,
  Star,
  Image as ImageIcon,
  ClipboardList,
  Download,
  FileText,
  ExternalLink,
  Navigation,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Debounce hook for optimizing search performance
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "searching", label: "Searching" },
  { value: "declined", label: "Declined" },
  { value: "assigned", label: "Assigned" },
  { value: "arrived", label: "Arrived" },
  { value: "inspection_started", label: "Inspection Started" },
  { value: "waiting_for_approval", label: "Waiting for Approval" },
  { value: "approved", label: "Approved" },
  { value: "work_in_progress", label: "Work in Progress" },
  { value: "work_done", label: "Work Done" },
];

const BOOKING_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "instant", label: "Instant" },
  { value: "schedule", label: "Scheduled" },
  { value: "emergency", label: "Emergency" },
];

const EMPTY = "Not available";

const formatStatus = (status) =>
  (status || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatBookingType = (type) => {
  const map = { instant: "Instant", schedule: "Scheduled", emergency: "Emergency (SOS)" };
  return map[type] || formatStatus(type);
};

const formatLocationType = (type) => {
  const map = { home: "Home", current_location: "Current Location", workshop: "Workshop" };
  return map[type] || formatStatus(type);
};

const formatPaymentStatus = (status) => {
  const map = { paid: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded" };
  return map[status] || formatStatus(status);
};

const hasValue = (v) => v != null && v !== "" && String(v).trim() !== "";

const displayText = (v) => {
  if (!hasValue(v)) return EMPTY;
  if (typeof v === "object") return EMPTY;
  return String(v).trim();
};

const cleanMultiline = (text) => {
  if (!hasValue(text)) return "";
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
};

const formatCurrency = (amount) => {
  if (amount == null || amount === "") return EMPTY;
  const n = Number(amount);
  if (Number.isNaN(n)) return EMPTY;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const renderServiceTypePrice = (serviceType) => {
  const hasPrice = serviceType?.price != null && serviceType?.price !== "";
  const hasDiscountPrice = serviceType?.discountPrice != null && serviceType?.discountPrice !== "";

  const priceValue = hasPrice ? Number(serviceType.price) : null;
  const discountValue = hasDiscountPrice ? Number(serviceType.discountPrice) : null;

  const showPrice = hasPrice && !Number.isNaN(priceValue);
  const showDiscount = hasDiscountPrice && !Number.isNaN(discountValue);

  if (!showPrice && !showDiscount) return null;

  if (showPrice && showDiscount) {
    return (
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0 whitespace-nowrap">
        <span className="text-xs sm:text-sm font-bold text-red-600">{formatCurrency(discountValue)}</span>
        <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 line-through">{formatCurrency(priceValue)}</span>
      </div>
    );
  }

  if (showDiscount) {
    return (
      <span className="text-xs sm:text-sm font-bold text-red-600 flex-shrink-0 whitespace-nowrap">
        {formatCurrency(discountValue)}
      </span>
    );
  }

  return (
    <span className="text-xs sm:text-sm font-bold text-red-600 flex-shrink-0 whitespace-nowrap">
      {formatCurrency(priceValue)}
    </span>
  );
};

const formatPhone = (phone) => {
  if (!hasValue(phone)) return EMPTY;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
};

const formatDate = (iso) => {
  if (!hasValue(iso)) return EMPTY;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return displayText(iso);
    return d.toLocaleString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return displayText(iso);
  }
};

const formatBookingDate = (dateStr) => {
  if (!hasValue(dateStr)) return EMPTY;
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatTimeSlot = (slot) => {
  if (!slot?.from) return EMPTY;
  const to = slot.to ? ` – ${slot.to}` : "";
  return `${slot.from}${to}`;
};

const formatCoordinates = (lat, lng) => {
  if (lat == null || lng == null) return EMPTY;
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
};

const formatDistance = (km) => {
  if (km == null || km === "") return EMPTY;
  const n = Number(km);
  if (Number.isNaN(n)) return EMPTY;
  return n < 1 ? `${(n * 1000).toFixed(0)} m` : `${n.toFixed(1)} km`;
};

const getMechanicMapLink = (tracking) => {
  if (!tracking?.latitude || !tracking?.longitude) return null;
  return `https://www.google.com/maps/?q=${tracking.latitude},${tracking.longitude}`;
};

const MechanicLiveLocationCard = ({ tracking }) => {
  if (!tracking?.latitude || !tracking?.longitude) return null;

  const mapLink = getMechanicMapLink(tracking);
  const coordinates = formatCoordinates(tracking.latitude, tracking.longitude);
  const address = displayText(tracking.address);
  const isOnline = tracking.isOnline ? "Yes" : "No";
  const lastSeen = tracking.updatedAt ? formatDate(tracking.updatedAt) : EMPTY;

  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-red-100 border-b border-red-200 flex items-center gap-2">
        <Navigation size={16} className="text-red-600 flex-shrink-0" />
        <h4 className="text-xs sm:text-sm font-bold text-red-800">Mechanic Live Location</h4>
      </div>
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Coordinates with Map Link */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[9px] sm:text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">GPS Coordinates</p>
            <p className="text-xs sm:text-sm font-mono text-red-900 bg-white px-2 py-1 rounded border border-red-100 break-all">
              {coordinates}
            </p>
          </div>
          {mapLink && (
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold touch-target whitespace-nowrap"
            >
              <MapPin size={14} />
              View Map
            </a>
          )}
        </div>

        {/* Address */}
        {address !== EMPTY && (
          <div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">Location Address</p>
            <p className="text-xs sm:text-sm text-red-900 bg-white px-2 py-2 rounded border border-red-100 break-words">
              {address}
            </p>
          </div>
        )}

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white px-2 py-2 rounded border border-red-100">
            <p className="text-[8px] font-semibold text-red-600 uppercase tracking-wide mb-0.5">Online Status</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnline === "Yes" ? "bg-green-500" : "bg-gray-400"}`} />
              <p className="text-xs font-bold text-red-900">{isOnline}</p>
            </div>
          </div>
          <div className="bg-white px-2 py-2 rounded border border-red-100">
            <p className="text-[8px] font-semibold text-red-600 uppercase tracking-wide mb-0.5">Last Seen</p>
            <p className="text-[10px] font-semibold text-red-900 line-clamp-2">{lastSeen}</p>
          </div>
        </div>
      </div>
    </div>
  );
};


const uniqueNames = (items, key = "name") =>
  [...new Set((items || []).map((i) => i[key]).filter(Boolean))];

const getStatusStyle = (status) => {
  const map = {
    searching: "bg-slate-100 text-slate-700",
    declined: "bg-red-100 text-red-700",
    assigned: "bg-blue-100 text-blue-700",
    arrived: "bg-indigo-100 text-indigo-700",
    inspection_started: "bg-purple-100 text-purple-700",
    waiting_for_approval: "bg-amber-100 text-amber-800",
    approved: "bg-teal-100 text-teal-700",
    work_in_progress: "bg-orange-100 text-orange-800",
    work_done: "bg-green-100 text-green-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

const COMPLETED_STATUSES = new Set(["complete", "completed", "work_done", "done"]);

const getServiceStatusDisplay = (booking) => {
  const normalizedStatus = String(booking?.status || "").toLowerCase();

  if (COMPLETED_STATUSES.has(normalizedStatus)) {
    const paymentStatus = String(booking?.payment?.status || booking?.payment?.paymentStatus || "").toLowerCase();
    if (paymentStatus === "paid") {
      return {
        label: "Paid",
        style: "bg-green-100 text-green-700",
      };
    }

    return {
      label: "Unpaid",
      style: "bg-amber-100 text-amber-800",
    };
  }

  return {
    label: formatStatus(booking?.status),
    style: getStatusStyle(booking?.status),
  };
};

const getDisputeStatusStyle = (status) => {
  const map = {
    raised: "bg-red-100 text-red-700 border border-red-200",
    under_review: "bg-amber-100 text-amber-800 border border-amber-200",
    resolution_in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
    resolved: "bg-green-100 text-green-700 border border-green-200",
  };
  return map[status] || "bg-gray-100 text-gray-600 border border-gray-200";
};

const getBookingTypeStyle = (type) => {
  const map = {
    instant: "bg-blue-50 text-blue-700 border-blue-200",
    schedule: "bg-violet-50 text-violet-700 border-violet-200",
    emergency: "bg-red-50 text-red-700 border-red-200",
  };
  return map[type] || "bg-gray-50 text-gray-600 border-gray-200";
};

const getServiceNames = (booking) => {
  const details = booking.serviceDetails || [];
  if (details.length === 0) {
    if (booking.issueType) return formatStatus(booking.issueType);
    return EMPTY;
  }
  const names = [];
  details.forEach((svc) => {
    if (svc.types?.length) {
      svc.types.forEach((t) => names.push(t.name || svc.name));
    } else if (svc.name) {
      names.push(svc.name);
    }
  });
  return names.length ? names.join(", ") : EMPTY;
};

const getServiceDisplay = (booking) => {
  const names = getServiceNames(booking);
  if (names !== EMPTY) return names;
  const issue = booking.issueType || booking.issueDetails?.issueType;
  if (!hasValue(issue)) return EMPTY;
  const parts = [formatStatus(issue)];
  if (booking.price != null && booking.price !== "") parts.push(formatCurrency(booking.price));
  if (booking.visitCost != null && booking.visitCost !== "") parts.push(`Visit: ${formatCurrency(booking.visitCost)}`);
  return parts.join(" — ");
};

const getEstimatedCost = (booking) => {
  if (booking.jobSheet?.estimatedCost != null) {
    return formatCurrency(booking.jobSheet.estimatedCost);
  }
  const types = (booking.serviceDetails || []).flatMap((s) => s.types || []);
  const total = types.reduce((sum, t) => {
    const hasDiscount = t?.discountPrice != null && t?.discountPrice !== "";
    const raw = hasDiscount ? t.discountPrice : t.price;
    const value = Number(raw);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  return total > 0 ? formatCurrency(total) : EMPTY;
};

const SectionCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`bg-white border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden ${className}`}>
    <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-red-600 flex-shrink-0" />}
      <h4 className="text-xs sm:text-sm font-bold text-gray-800 truncate">{title}</h4>
    </div>
    <div className="p-3 sm:p-4">{children}</div>
  </div>
);

const InfoGrid = ({ items }) => {
  const visible = items.filter((item) => item.show !== false);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
      {visible.map(({ label, value, fullWidth, mono, render }) => (
        <div key={label} className={fullWidth ? "sm:col-span-2 lg:col-span-3" : ""}>
          <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <div
            className={`text-sm sm:text-base text-gray-900 break-words ${mono ? "font-mono text-xs sm:text-sm bg-gray-50 px-2 py-1 rounded" : ""} ${
              value === EMPTY ? "text-gray-400 italic" : "font-medium"
            }`}
          >
            {render ? render() : value}
          </div>
        </div>
      ))}
    </div>
  );
};

const StatusBadge = ({ status, styleFn = getStatusStyle }) => (
  <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${styleFn(status)}`}>
    {formatStatus(status)}
  </span>
);

const PersonCard = ({ title, name, phone, image, id, icon: Icon }) => {
  const displayName = hasValue(name) ? name : title === "Customer" ? "Customer (name not set)" : EMPTY;
  const phoneFormatted = formatPhone(phone);
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-gray-100">
        <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-red-600" />
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-gray-800 truncate">{title}</h4>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {hasValue(image) ? (
          <img src={image} alt="" className="w-12 sm:w-14 h-12 sm:h-14 rounded-full object-cover border-2 border-white shadow flex-shrink-0" />
        ) : (
          <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white flex-shrink-0">
            <Icon size={20} className="text-gray-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">{displayName}</p>
          {phoneFormatted !== EMPTY ? (
            <a
              href={`tel:${String(phone).replace(/\D/g, "")}`}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 flex items-center gap-1 mt-1 font-medium truncate"
            >
              <Phone size={12} className="flex-shrink-0" /> <span className="truncate">{phoneFormatted}</span>
            </a>
          ) : (
            <p className="text-[11px] sm:text-xs text-gray-400 italic mt-1">Phone not available</p>
          )}
          {hasValue(id) && (
            <p className="text-[8px] sm:text-[10px] text-gray-500 mt-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
              <span className="text-gray-400 font-sans mr-1">{title} ID:</span>
              {id}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={18}
        className={n <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}
      />
    ))}
    <span className="ml-2 text-sm font-bold text-gray-800">{rating}/5</span>
  </div>
);

const TicketDetailModal = ({ booking, onClose, onViewDispute, onBookingUpdate }) => {
  if (!booking) return null;

  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [assigningMechanic, setAssigningMechanic] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignedMechanic, setAssignedMechanic] = useState(booking?.mechanic || null);
  const [bookingStatus, setBookingStatus] = useState(booking?.status);
  const [liveBooking, setLiveBooking] = useState(booking);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const customer = liveBooking.customer || {};
  const mechanic = assignedMechanic || liveBooking.mechanic || {};
  const vehicle = liveBooking.vehicle || {};
  const location = liveBooking.location || {};
  const timeSlot = liveBooking.timeSlot || {};
  const dispute = liveBooking.dispute || {};
  const payment = liveBooking.payment || {};
  const feedback = liveBooking.feedback || {};
  const jobSheet = liveBooking.jobSheet || {};
  const tracking = liveBooking.tracking || {};

  const vehicleLabel = [vehicle.brand, vehicle.model || vehicle.vehicleName]
    .filter(Boolean)
    .join(" ")
    .trim() || vehicle.vehicleName || EMPTY;

  const notesText = cleanMultiline(liveBooking.notes || liveBooking.note);
  const equipmentItems = liveBooking.equipmentDetails || [];
  const hasJobSheet = jobSheet.estimatedCost != null || hasValue(jobSheet.description);
  const hasPayment = payment.amount != null || hasValue(payment.orderId || payment.method);
  const hasExistingMechanic = Boolean(
    assignedMechanic?.fullName || assignedMechanic?.mechanicID || assignedMechanic?.id || booking?.mechanicId || booking?.assignedMechanicId
  );
  const isMechanicAccepted = String(booking?.acceptanceStatus || "").toLowerCase() === "accepted";
  const showAssignMechanic = !isMechanicAccepted && (String(bookingStatus || "").toLowerCase() === "searching" || hasExistingMechanic);
  const paymentStatusStyle = (s) =>
    s === "paid"
      ? "bg-green-100 text-green-800"
      : s === "pending"
        ? "bg-amber-100 text-amber-800"
        : "bg-gray-100 text-gray-600";

  useEffect(() => {
    setLiveBooking(booking);
    setAssignedMechanic(booking?.mechanic || null);
    setBookingStatus(booking?.status);
    setAssignmentMessage("");
    setAssignmentError("");
    setDeleteError("");
    setSelectedMechanicId("");
  }, [booking?.bookingId, booking?.status, booking?.mechanic, booking?.serviceDetails, booking?.equipmentDetails, booking?.totalAmount]);

  useEffect(() => {
    if (!showAssignMechanic) {
      setMechanics([]);
      return;
    }

    const fetchMechanics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/mechanics`);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setMechanics(list.filter(Boolean));
      } catch (err) {
        console.error("Failed to load mechanics", err);
      }
    };

    fetchMechanics();
  }, [showAssignMechanic]);

  const copyBookingId = () => {
    navigator.clipboard?.writeText(liveBooking.bookingId);
  };

  const handleRemoveBookingItem = async (itemId, type = "serviceType") => {
    setDeletingItemId(itemId);
    setDeleteError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/servicebookings/${liveBooking.bookingId}/service/${itemId}?type=${type}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove item");
      }

      const updatedBooking = {
        ...liveBooking,
        serviceIds: data.data.serviceIds,
        serviceTypeIds: data.data.serviceTypeIds,
        serviceDetails: data.data.serviceDetails,
        equipmentIds: data.data.equipmentIds,
        equipmentDetails: data.data.equipmentDetails,
        totalAmount: data.data.totalAmount,
        updatedAt: data.data.updatedAt,
      };

      setLiveBooking(updatedBooking);
      onBookingUpdate?.(updatedBooking);
    } catch (err) {
      setDeleteError(err.message || "Failed to remove item");
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleAssignMechanic = async () => {
    if (isMechanicAccepted) {
      setAssignmentError("This mechanic has already accepted the assignment, so it cannot be reassigned.");
      return;
    }

    if (!selectedMechanicId) return;

    setAssigningMechanic(true);
    setAssignmentError("");
    setAssignmentMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/servicebookings/${booking.bookingId}/assign-mechanic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanicId: selectedMechanicId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to assign mechanic");
      }

      const selected = mechanics.find(
        (m) => String(m.userId || m.id || m._id || m.mechanicId || m.mechanicID || "") === String(selectedMechanicId)
      );

      setAssignedMechanic({
        ...(selected || {}),
        fullName: selected?.name || selected?.fullName || selected?.garage?.name || "Mechanic",
        mechanicID: selected?.mechanicId || selected?.kyc?.mechanicId || selected?.mechanicID || selected?.id || selectedMechanicId,
        id: selected?.id || selected?.userId || selected?.userID || selectedMechanicId,
      });
      setBookingStatus("assigned");
      setAssignmentMessage(
        hasExistingMechanic ? (data.message || "Mechanic reassigned successfully.") : (data.message || "Mechanic assigned successfully.")
      );
      setSelectedMechanicId("");
    } catch (err) {
      setAssignmentError(err.message || "Failed to assign mechanic");
    } finally {
      setAssigningMechanic(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-5 border-b bg-white flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Booking ID</p>
            <button
              type="button"
              onClick={copyBookingId}
              title="Click to copy"
              className="text-[11px] sm:text-xs font-mono text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded mt-0.5 break-all text-left w-full max-w-full"
            >
              {booking.bookingId}
            </button>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-2">Service Ticket</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={booking.status} />
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getBookingTypeStyle(booking.bookingType)}`}
              >
                {formatBookingType(booking.bookingType)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {booking.dispute?.isRaised && (
              <button
                type="button"
                onClick={onViewDispute}
                className="text-[10px] sm:text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-2 rounded-lg"
              >
                View Dispute
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0 border touch-target" aria-label="Close modal">
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Quick summary */}
        <div className="px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 bg-white border-b grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] text-gray-400 uppercase font-semibold">Estimated</p>
            <p className="text-xs sm:text-sm font-bold text-red-600">{getEstimatedCost(liveBooking)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] text-gray-400 uppercase font-semibold">Scheduled</p>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-800 line-clamp-2">{formatBookingDate(liveBooking.bookingDate)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] text-gray-400 uppercase font-semibold">Vehicle</p>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate">{vehicle.registrationNumber || EMPTY}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 min-w-0">
            <p className="text-[8px] sm:text-[10px] text-gray-400 uppercase font-semibold">Time slot</p>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate">{formatTimeSlot(timeSlot)}</p>
          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          {showAssignMechanic && (
            <SectionCard title="Assign Mechanic" icon={Wrench}>
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-gray-600">
                  {hasExistingMechanic
                    ? "This booking already has a mechanic. You can select a different mechanic to reassign it."
                    : "This booking is still in searching status. Select a mechanic to assign to this booking."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedMechanicId}
                    onChange={(e) => setSelectedMechanicId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Select mechanic</option>
                    {mechanics.map((m) => {
                      const mechanicValue = m.userId || m.id || m._id || m.mechanicId || m.mechanicID || "";
                      const mechanicCode = m.mechanicId || m.kyc?.mechanicId || m.mechanicID || m.id || m.userId || "";
                      const mechanicName = m.name || m.fullName || m.garage?.name || "Unnamed mechanic";
                      if (!mechanicValue) return null;
                      return (
                        <option key={mechanicValue} value={mechanicValue}>
                          {mechanicCode ? `${mechanicCode} - ${mechanicName}` : mechanicName}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignMechanic}
                    disabled={assigningMechanic || !selectedMechanicId}
                    className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {assigningMechanic ? (hasExistingMechanic ? "Reassigning..." : "Assigning...") : (hasExistingMechanic ? "Reassign Mechanic" : "Assign Mechanic")}
                  </button>
                </div>
                {assignmentError && <p className="text-sm text-red-600">{assignmentError}</p>}
                {assignmentMessage && <p className="text-sm text-green-600">{assignmentMessage}</p>}
              </div>
            </SectionCard>
          )}

          {isMechanicAccepted && assignedMechanic?.fullName && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              This assignment has already been accepted by the mechanic, so it cannot be reassigned.
            </div>
          )}

          {!showAssignMechanic && !isMechanicAccepted && assignedMechanic?.fullName && (
            <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
              Assigned mechanic: {assignedMechanic.fullName || assignedMechanic.name}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <PersonCard
              title="Customer"
              name={customer.name}
              phone={customer.phone}
              image={customer.profileImage}
              id={customer.customerID}
              icon={User}
            />
            <PersonCard
              title="Mechanic"
              name={mechanic.fullName}
              phone={mechanic.phone}
              image={mechanic.profilePhoto}
              id={mechanic.mechanicID}
              icon={Wrench}
            />
          </div>

          <SectionCard title="Vehicle & Booking" icon={Car}>
            <InfoGrid
              items={[
                { label: "Vehicle", value: vehicleLabel },
                { label: "Registration No.", value: displayText(vehicle.registrationNumber) },
                { label: "Vehicle Type", value: displayText(vehicle.vehicleType) },
                { label: "Booking Date", value: formatBookingDate(booking.bookingDate) },
                { label: "Time Slot", value: formatTimeSlot(timeSlot) },
                { label: "Created On", value: formatDate(booking.createdAt) },
                { label: "Last Updated", value: formatDate(booking.updatedAt) },
                {
                  label: "Issue / SOS Type",
                  value: formatStatus(booking.issueType || booking.issueDetails?.issueType),
                  show: hasValue(booking.issueType || booking.issueDetails?.issueType),
                },
                {
                  label: "Customer Notes",
                  value: notesText || EMPTY,
                  fullWidth: true,
                  show: hasValue(notesText),
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Services & Equipment" icon={ClipboardList}>
            {deleteError && <p className="text-sm text-red-600 mb-3">{deleteError}</p>}
            {(liveBooking.serviceDetails || []).length === 0 ? (
              hasValue(liveBooking.issueType || liveBooking.issueDetails?.issueType) ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-gray-100 p-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-sm font-bold text-gray-800 truncate">{formatStatus(liveBooking.issueType || liveBooking.issueDetails?.issueType)}</p>
                        <p className="text-[9px] text-gray-500 mt-1">Emergency issue</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{liveBooking.price != null && liveBooking.price !== "" ? formatCurrency(liveBooking.price) : EMPTY}</p>
                        <p className="text-[11px] text-gray-500 mt-1">Visit: {liveBooking.visitCost != null && liveBooking.visitCost !== "" ? formatCurrency(liveBooking.visitCost) : EMPTY}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No service details available</p>
              )
            ) : (
              <div className="space-y-3">
                {liveBooking.serviceDetails.map((svc) => (
                  <div key={svc.id} className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 bg-gray-50 border-b border-gray-100">
                      {svc.iconUrl && (
                        <img src={svc.iconUrl} alt="" className="w-7 sm:w-8 h-7 sm:h-8 object-contain flex-shrink-0" />
                      )}
                      <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{svc.name}</p>
                    </div>
                    {(svc.types || []).length > 0 ? (
                      <ul className="divide-y divide-gray-50">
                        {svc.types.map((t) => (
                          <li key={t.id} className="flex items-start gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5">
                            {t.imageUrl && (
                              <img src={t.imageUrl} alt="" className="w-9 sm:w-10 h-9 sm:h-10 rounded object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-800">{t.name}</p>
                              {hasValue(t.description) && (
                                <p className="text-[11px] sm:text-xs text-gray-500 mt-1 line-clamp-2 sm:line-clamp-3 whitespace-pre-line">
                                  {cleanMultiline(t.description).slice(0, 150)}
                                  {cleanMultiline(t.description).length > 150 ? "…" : ""}
                                </p>
                              )}
                            </div>
                            <div className="flex items-start gap-2 flex-shrink-0">
                              {renderServiceTypePrice(t)}
                              <button
                                type="button"
                                onClick={() => handleRemoveBookingItem(t.id, "serviceType")}
                                disabled={deletingItemId === t.id}
                                title="Remove service"
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-2 sm:px-3 py-2 text-[11px] sm:text-xs text-gray-400 italic">Category selected — no sub-service</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {equipmentItems.length > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 border-t">
                <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase mb-2">Equipment Required</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {equipmentItems.map((item) => (
                    <div
                      key={item.id || item.name}
                      className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs bg-gray-100 text-gray-700 px-2 sm:px-2.5 py-1 rounded-full font-medium"
                    >
                      <span>{item.name}</span>
                      {item.id && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBookingItem(item.id, "equipment")}
                          disabled={deletingItemId === item.id}
                          title="Remove equipment"
                          className="p-0.5 rounded text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Location & Live Tracking" icon={MapPin}>
            <div className="space-y-4">
              {/* Service Location */}
              <div>
                <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Service Location</p>
                <InfoGrid
                  items={[
                    { label: "Service Address", value: displayText(location.address), fullWidth: true },
                    { label: "Location Type", value: formatLocationType(location.type) },
                    {
                      label: "GPS Coordinates",
                      value: formatCoordinates(location.latitude, location.longitude),
                      mono: true,
                      show: location.latitude != null,
                    },
                    {
                      label: "Distance to Customer",
                      value: formatDistance(tracking.distanceFromCustomerKm),
                      show: tracking.enabled && tracking.distanceFromCustomerKm != null,
                    },
                  ]}
                />
              </div>

              {/* Mechanic Live Location */}
              {(tracking.latitude != null || tracking.mechanicLocation?.latitude != null) && (
                <MechanicLiveLocationCard tracking={tracking.mechanicLocation || tracking} />
              )}
            </div>
          </SectionCard>

          {(booking.jobTimeline || []).length > 0 && (
            <SectionCard title="Job Timeline" icon={Clock}>
              <div className="relative pl-4 border-l-2 border-red-200 space-y-4">
                {booking.jobTimeline.map((step, i) => (
                  <div key={i} className="relative pl-4">
                    <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white" />
                    <StatusBadge status={step.status} />
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">{formatDate(step.time)}</p>
                    {step.mechanicId && (
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Mechanic: {step.mechanicId}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {hasJobSheet && (
            <SectionCard title="Job Sheet & Estimate" icon={ClipboardList}>
              {hasValue(jobSheet.description) && (
                <p className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded-lg border">
                  {displayText(jobSheet.description)}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
                {[
                  { label: "Service", amount: jobSheet.serviceCost },
                  { label: "Parts", amount: jobSheet.partsCost },
                  { label: "Labour", amount: jobSheet.labourCharge },
                  { label: "Total", amount: jobSheet.estimatedCost, highlight: true },
                ].map(({ label, amount, highlight }) => (
                  <div
                    key={label}
                    className={`rounded-lg p-2 sm:p-3 text-center ${highlight ? "bg-red-50 border border-red-100" : "bg-gray-50 border border-gray-100"}`}
                  >
                    <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-semibold">{label}</p>
                    <p className={`text-xs sm:text-sm font-bold mt-0.5 ${highlight ? "text-red-600" : "text-gray-800"}`}>
                      {formatCurrency(amount)}
                    </p>
                  </div>
                ))}
              </div>
              {(jobSheet.parts || []).length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Part</th>
                        <th className="px-3 py-2 font-semibold text-center">Qty</th>
                        <th className="px-3 py-2 font-semibold text-right">Unit Price</th>
                        <th className="px-3 py-2 font-semibold text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {jobSheet.parts.map((p) => {
                        const qty = Number(p.qty) || 1;
                        const price = Number(p.price) || 0;
                        return (
                          <tr key={p.id} className="text-gray-800">
                            <td className="px-3 py-2 font-medium">{p.name}</td>
                            <td className="px-3 py-2 text-center">{qty}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(price)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatCurrency(qty * price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {(jobSheet.images || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                  {jobSheet.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="touch-target">
                      <img src={url} alt="" className="w-14 sm:w-16 h-14 sm:h-16 object-cover rounded-lg border" />
                    </a>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {hasPayment && (
            <SectionCard title="Payment" icon={CreditCard}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold">Amount Paid</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(payment.amount)}
                    {payment.currency && payment.currency !== "INR" && (
                      <span className="text-xs text-gray-500 ml-1">{payment.currency}</span>
                    )}
                  </p>
                </div>
                {hasValue(payment.status) && (
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${paymentStatusStyle(payment.status)}`}>
                    {formatPaymentStatus(payment.status)}
                  </span>
                )}
              </div>
              <InfoGrid
                items={[
                  { label: "Payment Method", value: displayText(payment.method), mono: true, fullWidth: true },
                  
                  {
                    label: "Order ID",
                    value: displayText(payment.orderId),
                    mono: true,
                    fullWidth: true,
                    show: String(payment.method || "").toLowerCase() !== "cash",
                  },
                  {
                    label: "Payment ID",
                    value: displayText(payment.paymentId),
                    mono: true,
                    fullWidth: true,
                    show: String(payment.method || "").toLowerCase() !== "cash",
                  },
                  { label: "Service Cost", value: formatCurrency(payment.serviceCost) },
                  { label: "Parts Cost", value: formatCurrency(payment.partsCost) },
                  { label: "Labour Charge", value: formatCurrency(payment.labourCharge) },
                  { label: "Payment Created", value: formatDate(payment.createdAt) },
                  { label: "Paid At", value: formatDate(payment.paidAt) },
                ]}
              />
            </SectionCard>
          )}

          {feedback?.isSubmitted && (
            <SectionCard title="Customer Feedback" icon={Star}>
              <StarRating rating={feedback.rating || 0} />
              <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-semibold mt-4 mb-1">Review</p>
              <p className="text-xs sm:text-sm text-gray-700 italic line-clamp-4">
                {hasValue(feedback.review) ? feedback.review : "No written review"}
              </p>
              <p className="text-xs text-gray-500 mt-2">Submitted: {formatDate(feedback.submittedAt)}</p>
            </SectionCard>
          )}

          {dispute?.isRaised && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 overflow-hidden">
              <div className="px-4 py-3 bg-red-100 border-b border-red-200">
                <h4 className="text-sm font-bold text-red-800">Dispute Raised</h4>
              </div>
              <div className="p-4">
                <InfoGrid
                  items={[
                    { label: "Reason", value: displayText(dispute.reason), fullWidth: true },
                    { label: "Description", value: displayText(dispute.description), fullWidth: true },
                    {
                      label: "Dispute Status",
                      fullWidth: true,
                      render: () => (
                        <span className={`inline-flex text-xs px-3 py-2 rounded-full font-semibold ${getDisputeStatusStyle(dispute.status)}`}>
                          {formatStatus(dispute.status)}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {(booking.images || []).length > 0 && (
            <SectionCard title={`Booking Images (${booking.images.length})`} icon={ImageIcon}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
                {booking.images.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-red-400 touch-target"
                  >
                    <img src={url} alt={`Booking ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center text-white text-[10px] sm:text-xs font-bold opacity-0 group-hover:opacity-100">
                      View
                    </span>
                  </a>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

const ExportModal = ({ allCount, onClose, onExport }) => {
  const [fileName, setFileName] = useState(`ServiceTickets_Export_${new Date().toISOString().split("T")[0]}`);
  const [sheetName, setSheetName] = useState("Service Tickets");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Download size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Export to Excel</h3>
              <p className="text-xs text-slate-400">Configure your export settings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">File Name</label>
            <div className="flex items-center gap-2">
              <input value={fileName} onChange={e => setFileName(e.target.value)} className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter file name..." />
              <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-2.5 rounded-lg flex-shrink-0">.xlsx</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Sheet Name</label>
            <input value={sheetName} onChange={e => setSheetName(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Sheet name..." />
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
            <FileText size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Will export <span className="font-bold text-slate-800">{allCount} ticket{allCount !== 1 ? "s" : ""}</span> with <span className="font-bold text-slate-800">18 columns</span> (including mechanic live location, service price & visit cost) into <span className="font-mono text-green-700 font-bold">{fileName || "export"}.xlsx</span>.
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">Cancel</button>
          <button onClick={() => onExport({ fileName: fileName || "export", sheetName: sheetName || "Sheet1" })} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2 text-sm">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>
    </div>
  );
};

const buildAndExport = (bookingsToExport, { fileName, sheetName }) => {
  const rows = bookingsToExport.map((b) => {
    const customer = b.customer || {};
    const mechanic = b.mechanic || {};
    const vehicle = b.vehicle || {};
    const location = b.location || {};
    const tracking = b.tracking || {};
    const mechanicLocation = tracking.mechanicLocation || tracking;

    return {
      // "Booking ID": displayText(b.bookingId),
      "Status": formatStatus(b.status),
      "Booking Type": formatBookingType(b.bookingType),
      "Customer Name": displayText(customer.name),
      "Customer Phone": formatPhone(customer.phone),
      "Customer ID": displayText(customer.customerID),
      "Mechanic Name": displayText(mechanic.fullName),
      "Mechanic Phone": formatPhone(mechanic.phone),
      "Mechanic ID": displayText(mechanic.mechanicID),
      "Vehicle": `${vehicle.brand || ""} ${vehicle.model || vehicle.vehicleName || ""}`.trim() || EMPTY,
      "Registration Number": displayText(vehicle.registrationNumber),
      "Services": getServiceNames(b),
      "Service Price": b.price != null && b.price !== "" ? formatCurrency(b.price) : EMPTY,
      "Visit Cost": b.visitCost != null && b.visitCost !== "" ? formatCurrency(b.visitCost) : EMPTY,
      "Estimated Cost": getEstimatedCost(b),
      "Service Address": displayText(location.address),
      "Mechanic Live Coordinates": mechanicLocation.latitude && mechanicLocation.longitude 
        ? formatCoordinates(mechanicLocation.latitude, mechanicLocation.longitude)
        : EMPTY,
      "Mechanic Location": displayText(mechanicLocation.address),
      "Mechanic Online": mechanicLocation.isOnline ? "Yes" : "No",
      "Booking Date": formatDate(b.createdAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 40 },
    { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } }) };
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const RowSkeleton = () => (
  <tr className="animate-pulse border-b">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="p-4">
        <div className="h-4 bg-gray-200 rounded" />
      </td>
    ))}
  </tr>
);

const ServiceTickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [lastDocId, setLastDocId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 50;
  const abortControllerRef = useRef(null);
  const debouncedSearch = useDebounce(search, 300);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const fetchBookings = useCallback(async (cursor = null, resetData = true) => {
    if (resetData) {
      setLoading(true);
      setError(null);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    } else {
      setLoadingMore(true);
    }

    try {
      // Create URL with pagination parameters
      const url = new URL(`${API_BASE_URL}/api/servicebookings/all-Admin_bookings`);
      url.searchParams.append("limit", pageSize);
      if (cursor) {
        url.searchParams.append("lastDocId", cursor);
      }

      const controller = abortControllerRef.current;
      const res = await Promise.race([
        fetch(url.toString(), { signal: controller?.signal }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 15000)
        ),
      ]);

      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        if (resetData) {
          setBookings(data.data);
        } else {
          // Dedupe against already-loaded bookings so a backend that
          // returns an overlapping/duplicate page (e.g. tied createdAt
          // values) never produces repeated rows in the UI.
          setBookings((prev) => {
            const seen = new Set(prev.map((b) => b.bookingId));
            const newItems = data.data.filter((b) => !seen.has(b.bookingId));
            return [...prev, ...newItems];
          });
        }
        setLastDocId(data.lastDocId || null);
        setHasMore(!!data.hasMore);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err);
        if (resetData) {
          setError(err.message || "Failed to load service tickets");
        }
      }
    } finally {
      if (resetData) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    fetchBookings(null, true);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const bookingIdParam = searchParams.get("bookingId");
    if (!bookingIdParam || bookings.length === 0) return;

    const match = bookings.find((b) => b.bookingId === bookingIdParam);
    if (match) {
      setSelectedBooking(match);
      setSearch(bookingIdParam);
    } else {
      setSearch(bookingIdParam);
    }

    setSearchParams({}, { replace: true });
  }, [bookings, searchParams, setSearchParams]);

  const filteredBookings = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase().trim();
    return bookings.filter((b) => {
      const normalizedStatus = String(b.status || "").toLowerCase();
      const paymentStatus = String(b.payment?.status || b.payment?.paymentStatus || "").toLowerCase();
      const isCompleted = COMPLETED_STATUSES.has(normalizedStatus);
      let matchStatus = false;
      if (statusFilter === "all") {
        matchStatus = true;
      } else if (statusFilter === "paid") {
        matchStatus = isCompleted && paymentStatus === "paid";
      } else if (statusFilter === "unpaid") {
        matchStatus = isCompleted && paymentStatus !== "paid";
      } else {
        matchStatus = b.status === statusFilter;
      }
      const matchType = typeFilter === "all" || b.bookingType === typeFilter;

      if (!keyword) return matchStatus && matchType;

      const customer = b.customer || {};
      const mechanic = b.mechanic || {};
      const vehicle = b.vehicle || {};
      const haystack = [
        b.bookingId,
        customer.name,
        customer.phone,
        customer.userId,
        customer.customerID,
        mechanic.fullName,
        mechanic.phone,
        mechanic.userId,
        mechanic.mechanicID,
        vehicle.registrationNumber,
        vehicle.vehicleName,
        vehicle.brand,
        getServiceNames(b),
        b.notes,
        b.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchStatus && matchType && haystack.includes(keyword);
    });
  }, [bookings, debouncedSearch, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length, paid: 0, unpaid: 0 };
    bookings.forEach((b) => {
      const s = b.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;

      const normalizedStatus = String(b.status || "").toLowerCase();
      const isCompleted = COMPLETED_STATUSES.has(normalizedStatus);
      if (isCompleted) {
        const paymentStatus = String(b.payment?.status || b.payment?.paymentStatus || "").toLowerCase();
        if (paymentStatus === "paid") {
          counts.paid += 1;
        } else {
          counts.unpaid += 1;
        }
      }
    });
    return counts;
  }, [bookings]);

  const handleExport = ({ fileName, sheetName }) => {
    buildAndExport(bookings, { fileName, sheetName });
    setShowExportModal(false);
  };

  const handleLoadMore = () => {
    fetchBookings(lastDocId, false);
  };

  const handleBookingUpdate = (updatedBooking) => {
    setSelectedBooking(updatedBooking);
    setBookings((prev) =>
      prev.map((b) => (b.bookingId === updatedBooking.bookingId ? { ...b, ...updatedBooking } : b))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Service Tickets</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                All service bookings with customer & mechanic details
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => fetchBookings(null, true)}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 disabled:opacity-60 touch-target whitespace-nowrap flex-shrink-0"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={bookings.length === 0}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 disabled:opacity-60 touch-target whitespace-nowrap flex-shrink-0"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-red-800 text-xs sm:text-sm font-medium">{error}</p>
                <button onClick={fetchBookings} className="text-red-600 text-xs sm:text-sm underline mt-1 touch-target">
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl border p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">Total</p>
              <p className="text-lg sm:text-xl font-bold text-gray-800">{bookings.length}</p>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl border p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">Filtered</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">{filteredBookings.length}</p>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl border p-2 sm:p-3 col-span-2 sm:col-span-2 lg:col-span-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">By status (sample)</p>
              <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                Assigned: {statusCounts.assigned || 0} · Work done: {statusCounts.work_done || 0} · Searching:{" "}
                {statusCounts.searching || 0}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl shadow-sm border mb-6 flex flex-col lg:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search booking ID, customer, mechanic, vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm min-w-[150px] sm:min-w-[180px] touch-target"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.value !== "all" && statusCounts[opt.value] != null
                    ? ` (${statusCounts[opt.value]})`
                    : opt.value === "all"
                      ? ` (${statusCounts.all})`
                      : ""}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] touch-target"
            >
              {BOOKING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-sm">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[10px] sm:text-xs">BookingID</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[10px] sm:text-xs">Booking</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[10px] sm:text-xs">Customer</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[10px] sm:text-xs">Mechanic</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[10px] sm:text-xs hidden md:table-cell">Vehicle</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[10px] sm:text-xs hidden lg:table-cell">Services</th>
                    <th className="p-2 sm:p-3 text-center font-semibold text-[10px] sm:text-xs">Type</th>
                    <th className="p-2 sm:p-3 text-center font-semibold text-[10px] sm:text-xs">Dispute</th>
                    <th className="p-2 sm:p-3 text-center font-semibold text-[10px] sm:text-xs">Status</th>
                    <th className="p-2 sm:p-3 text-center font-semibold text-[10px] sm:text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => <RowSkeleton key={i} />)
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 sm:p-12 text-center text-xs sm:text-sm text-gray-500">
                        No service tickets found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const customer = b.customer || {};
                      const mechanic = b.mechanic || {};
                      const vehicle = b.vehicle || {};
                      return (
                        <tr
                          key={b.bookingId}
                          className="border-t border-gray-100 hover:bg-red-50/30 transition-colors"
                        >
                          <td className="p-2 sm:p-3">
                            <p className="text-[11px] sm:text-xs font-medium text-gray-700 mt-0.5">{b.bookingId}</p>
                          </td>
                          <td className="p-2 sm:p-3">
                            <p className="text-[9px] sm:text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Calendar size={10} />
                              {formatDate(b.createdAt).split(",")[0]}
                            </p>
                            <p className="text-[11px] sm:text-xs font-medium text-gray-700 mt-0.5">{getEstimatedCost(b)}</p>
                          </td>
                          <td className="p-2 sm:p-3 min-w-0">
                            <p className="font-medium text-gray-800 truncate text-xs sm:text-sm">
                              {customer.name || "Customer"}
                            </p>
                            <p className="text-[9px] sm:text-xs text-gray-500 truncate">{formatPhone(customer.phone)}</p>
                          </td>
                          <td className="p-2 sm:p-3 min-w-0">
                            <p className="font-medium text-gray-800 truncate text-xs sm:text-sm">
                              {mechanic.fullName || EMPTY}
                            </p>
                            <p className="text-[9px] sm:text-xs text-gray-500 truncate">{formatPhone(mechanic.phone)}</p>
                          </td>
                          <td className="p-2 sm:p-3 hidden md:table-cell min-w-0">
                            <p className="text-xs sm:text-sm text-gray-800 truncate">
                              {vehicle.brand} {vehicle.model || vehicle.vehicleName}
                            </p>
                            <p className="text-[9px] sm:text-xs text-gray-500 truncate">{vehicle.registrationNumber || EMPTY}</p>
                          </td>
                          <td className="p-2 sm:p-3 hidden lg:table-cell min-w-0">
                            <p className="text-[9px] sm:text-xs text-gray-600 line-clamp-2 max-w-[200px]">{getServiceDisplay(b)}</p>
                          </td>
                          <td className="p-2 sm:p-3 text-center">
                            <span
                              className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border font-medium capitalize ${getBookingTypeStyle(b.bookingType)}`}
                            >
                              {formatBookingType(b.bookingType)}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 text-center">
                            {b.dispute?.isRaised ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-semibold border ${getDisputeStatusStyle(b.dispute?.status || "raised")}`}>
                                  {formatStatus(b.dispute?.status || "raised")}
                                </span>
                                <button
                                  onClick={() => navigate(`/dispute?bookingId=${encodeURIComponent(b.bookingId)}`)}
                                  className="text-[10px] sm:text-[11px] text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg"
                                >
                                  View
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled
                                className="text-[10px] sm:text-[11px] bg-gray-200 text-gray-500 px-2 py-1 rounded-lg cursor-not-allowed"
                              >
                                No Dispute
                              </button>
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-center">
                            <span
                              className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getServiceStatusDisplay(b).style}`}
                            >
                              {getServiceStatusDisplay(b).label}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 text-center">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="inline-flex items-center gap-0.5 sm:gap-1 text-red-600 hover:text-red-800 text-xs sm:text-sm font-semibold touch-target"
                            >
                              View <ChevronRight size={14} className="hidden sm:inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/*
            NOTE: uses `bookings.length` (the full loaded set), not
            `filteredBookings.length`. Otherwise an active status/search
            filter that happens to match 0 rows on the current page would
            hide "Load More" even though the server still has more data.
          */}
          {hasMore && bookings.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 touch-target"
              >
                <RefreshCw size={16} className={loadingMore ? "animate-spin" : ""} />
                {loadingMore ? "Loading More..." : "Load More"}
              </button>
            </div>
          )}
        </main>
      </div>

      {selectedBooking && (
        <TicketDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onViewDispute={() => navigate(`/dispute?bookingId=${encodeURIComponent(selectedBooking.bookingId)}`)}
          onBookingUpdate={handleBookingUpdate}
        />
      )}

      {showExportModal && (
        <ExportModal allCount={bookings.length} onClose={() => setShowExportModal(false)} onExport={handleExport} />
      )}
    </div>
  );
};

export default ServiceTickets;