import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Search, Trash2, Car, Calendar, Clock, Phone,
  User, Wrench, Fuel, MapPin, Hash, FileText,
  ChevronRight, AlertCircle, X, CheckCircle,
  Download, CheckSquare, Copy, MessageCircle,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
const getRowStyle = (status) => {
  switch (status) {
    case "Pending":
      return "bg-blue-50 border-l-4 border-blue-500";
    case "Completed":
      return "bg-green-50 border-l-4 border-green-500";
    case "Cancelled":
      return "bg-red-50 border-l-4 border-red-500";
    case "Rescheduled":
      return "bg-yellow-50 border-l-4 border-yellow-400";
    default:
      return "";
  }
};
/* ================= SKELETON ================= */
const BookingSkeleton = () => (
  <tr className="animate-pulse border-b border-slate-100">
    {[...Array(9)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-slate-200 rounded w-full" />
      </td>
    ))}
  </tr>
);
const getStatusColor = (status) => {
  switch (status) {
    case "Pending": return "text-blue-600";
    case "Completed": return "text-green-600";
    case "Cancelled": return "text-red-600";
    case "Rescheduled": return "text-yellow-600";
    default: return "text-gray-500";
  }
};


const CardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-200 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-slate-200 rounded" />)}
    </div>
  </div>
);

/* ================= CONFIRM DELETE MODAL ================= */
const ConfirmModal = ({ booking, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
    <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 flex flex-col items-center text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Booking?</h3>
      <p className="text-slate-500 text-sm mb-1">You're about to delete the booking for</p>
      <p className="font-bold text-slate-800 text-sm mb-5">"{booking.fullName}"</p>
      <p className="text-xs text-slate-400 mb-6">This action cannot be undone.</p>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors text-sm">Delete</button>
      </div>
    </div>
  </div>
);

/* ================= WHATSAPP MESSAGE PANEL ================= */
const WhatsAppMessagePanel = ({ label, message, accent }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isGreen = accent === "green";
  const lines = message.split("\n");

  return (
    <div className={`rounded-2xl border overflow-hidden ${isGreen ? "border-green-200" : "border-amber-200"}`}>
      {/* Panel header */}
      <div className={`flex items-center justify-between px-4 py-3 ${isGreen ? "bg-green-50 border-b border-green-100" : "bg-amber-50 border-b border-amber-100"}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isGreen ? "bg-green-500" : "bg-amber-500"}`}>
            <MessageCircle size={14} className="text-white" />
          </div>
          <span className={`text-xs font-bold ${isGreen ? "text-green-800" : "text-amber-800"}`}>{label}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${copied
            ? isGreen ? "bg-green-600 text-white border-green-600" : "bg-amber-600 text-white border-amber-600"
            : isGreen
              ? "bg-white text-green-700 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600"
              : "bg-white text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600"
            }`}
        >
          {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Bubble area */}
      <div className={`p-3 ${isGreen ? "bg-[#e5ddd5]" : "bg-[#ddd5e5]"}`}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        {/* Message bubble */}
        <div
          className={`max-w-full rounded-xl rounded-tl-sm px-4 py-3 shadow-sm ${isGreen ? "bg-[#dcf8c6]" : "bg-[#fff8dc]"}`}
        >
          <div className="space-y-0.5">
            {lines.map((line, i) => {
              if (line === "") return <div key={i} className="h-2" />;
              return (
                <p
                  key={i}
                  className="text-[13px] text-slate-800 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
                      .replace(
                        /(https?:\/\/[^\s]+)/g,
                        '<span style="color:#1a73e8;text-decoration:underline;word-break:break-all;font-size:11px">$1</span>'
                      ),
                  }}
                />
              );
            })}
          </div>
          {/* WhatsApp-style timestamp */}
          <div className="flex justify-end mt-2 gap-1 items-center">
            <span className="text-[10px] text-slate-500">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <svg viewBox="0 0 16 11" width="14" height="10" className="text-blue-500 fill-current">
              <path d="M11.071.653a.75.75 0 0 1 .052 1.059l-5.5 6a.75.75 0 0 1-1.123-.013l-2.5-3a.75.75 0 1 1 1.15-.96l1.95 2.34L10.012.705a.75.75 0 0 1 1.059-.052zm3 0a.75.75 0 0 1 .052 1.059l-5.5 6a.75.75 0 0 1-1.1.013L9.5 9.5a.75.75 0 1 1 1.15-.96l-.413.495 4.775-5.323a.75.75 0 0 1 1.059-.059z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= DETAIL MODAL ================= */
const DetailCard = ({ label, value, icon }) => (
  <div className="p-3 bg-white border border-slate-100 rounded-xl">
    <div className="flex items-center gap-1.5 mb-0.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-slate-700 font-semibold text-sm break-words">{value || "—"}</div>
  </div>
);

const DetailModal = ({ booking, serialNo, onClose, onDelete }) => {
  const [activeTab, setActiveTab] = useState("details");

  if (!booking) return null;

  const createdAt = booking.createdAt?._seconds
    ? new Date(booking.createdAt._seconds * 1000).toLocaleString()
    : "N/A";
  const formattedID = `BMM-${formatDateForID(booking.createdAt)}-${serialNo}`;
  const customerMsg = generateWhatsAppMessage(booking, serialNo - 1);
  const mechanicMsg = generateMechanicMessage(booking, serialNo - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Car size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">{booking.fullName}</h2>
              <span className="text-xs text-slate-400">{formattedID}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button onClick={() => onDelete(booking)} title="Delete Booking" className="p-2 hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white flex-shrink-0 px-4 sm:px-6 gap-1">
          {[
            { id: "details", label: "Details", badge: null },
            { id: "whatsapp", label: "WhatsApp Messages", badge: "2" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 py-3 px-1 mr-4 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="inline-flex items-center justify-center w-4 h-4 bg-green-100 text-green-700 text-[9px] font-bold rounded-full">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1">

          {/* ── DETAILS TAB ── */}
          {activeTab === "details" && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <DetailCard label="Full Name" value={booking.fullName} icon={<User size={14} />} />
                <DetailCard label="Phone" value={booking.phone} icon={<Phone size={14} />} />
                <DetailCard label="Vehicle Brand" value={booking.vehicleBrand} icon={<Car size={14} />} />
                <DetailCard label="Vehicle Type" value={booking.vehicleType} icon={<Car size={14} />} />
                <DetailCard label="Fuel Type" value={booking.fuelType} icon={<Fuel size={14} />} />
                <DetailCard label="Reg. Number" value={booking.regNumber} icon={<Hash size={14} />} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <DetailCard label="Service Type" value={booking.serviceType} icon={<Wrench size={14} />} />
                <DetailCard label="Rate Category" value={typeof booking.selectedRate === "object" ? `${booking.selectedRate.label} — ${booking.selectedRate.sub}` : booking.selectedRate} icon={<FileText size={14} />} />
                <DetailCard label="Service Date" value={booking.serviceDate} icon={<Calendar size={14} />} />
                <DetailCard label="Time Slot" value={booking.timeSlot} icon={<Clock size={14} />} />
              </div>
              <DetailCard label="Address" value={`Flat ${booking.flatNo}, ${booking.address}`} icon={<MapPin size={14} />} />
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Reported Issues</p>
                <div className="flex flex-wrap gap-2">
                  {booking.issues?.map((issue, i) => (
                    <span key={i} className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-semibold">{issue}</span>
                  ))}
                </div>
                {booking.additionalIssues && (
                  <p className="text-xs text-slate-500 mt-3 italic">Additional: "{booking.additionalIssues}"</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <DetailCard label="Booked At" value={createdAt} icon={<Calendar size={14} />} />
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <CheckCircle size={16} className={booking.agreed ? "text-green-500" : "text-slate-300"} />
                  <span className="text-sm font-semibold text-slate-700">{booking.agreed ? "Terms Agreed" : "Not Agreed"}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── WHATSAPP MESSAGES TAB ── */}
          {activeTab === "whatsapp" && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Hint */}
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <MessageCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Tap <span className="font-bold">Copy</span> on any message below to copy it and send directly via WhatsApp.
                </p>
              </div>

              {/* Customer message */}
              <WhatsAppMessagePanel
                label="Customer Message"
                message={customerMsg}
                accent="green"
              />

              {/* Mechanic message */}
              <WhatsAppMessagePanel
                label="Mechanic Message"
                message={mechanicMsg}
                accent="amber"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= TOAST ================= */
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold ${type === "success" ? "bg-green-600" : "bg-red-600"}`}>
    {type === "success" ? <CheckCircle size={18} className="flex-shrink-0" /> : <AlertCircle size={18} className="flex-shrink-0" />}
    <span className="flex-1">{message}</span>
    <button onClick={onClose} className="ml-1 hover:opacity-70 flex-shrink-0"><X size={16} /></button>
  </div>
);

/* ================= EXPORT MODAL ================= */
const ExportModal = ({ selectedCount, allCount, onClose, onExport }) => {
  const [fileName, setFileName] = useState(`Bookings_Export_${new Date().toISOString().split("T")[0]}`);
  const [sheetName, setSheetName] = useState("Customer Bookings");
  const [exportScope, setExportScope] = useState(selectedCount > 0 ? "selected" : "all");
  const count = exportScope === "selected" ? selectedCount : allCount;

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
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Export Scope</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setExportScope("all")} className={`py-3 px-3 sm:px-4 rounded-xl border-2 text-sm font-bold transition-all ${exportScope === "all" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                All Bookings<span className="block text-[10px] font-normal mt-0.5 opacity-70">{allCount} records</span>
              </button>
              <button onClick={() => setExportScope("selected")} disabled={selectedCount === 0} className={`py-3 px-3 sm:px-4 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${exportScope === "selected" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                Selected Only<span className="block text-[10px] font-normal mt-0.5 opacity-70">{selectedCount} records</span>
              </button>
            </div>
          </div>
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
              Will export <span className="font-bold text-slate-800">{count} booking{count !== 1 ? "s" : ""}</span> with <span className="font-bold text-slate-800">20 columns</span> into <span className="font-mono text-green-700 font-bold">{fileName || "export"}.xlsx</span>.
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">Cancel</button>
          <button onClick={() => onExport({ scope: exportScope, fileName: fileName || "export", sheetName: sheetName || "Sheet1" })} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2 text-sm">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= INDETERMINATE CHECKBOX ================= */
const Checkbox = ({ checked, indeterminate, onChange }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer" />
  );
};

/* ================= UTILS ================= */
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const formatCreatedAt = (ts) => {
  if (!ts?._seconds) return "—";
  return new Date(ts._seconds * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const getRateLabel = (rate) => {
  if (!rate) return "—";
  if (typeof rate === "object") return `${rate.label}${rate.sub ? ` (${rate.sub})` : ""}`;
  return rate;
};
const formatDateForID = (ts) => {
  if (!ts?._seconds) return "N/A";
  const d = new Date(ts._seconds * 1000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const convertDateInputToFormat = (dateInputValue) => {
  if (!dateInputValue) return "";
  const [year, month, day] = dateInputValue.split('-');
  return `${day}/${month}/${year}`;
};
const formatServiceDateForMsg = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleDateString("en-US", { month: "short" })}-${d.getFullYear()}`;
};

const generateWhatsAppMessage = (b, idx) => {
  const ticketID = `BMM-${formatDateForID(b.createdAt)}-${idx + 1}`;
  const vehicle = `${b.vehicleBrand} ${b.vehicleType}`;
  const serviceSchedule = `${formatServiceDateForMsg(b.serviceDate)} | ${b.timeSlot}`;
  const rate = b.selectedRate && typeof b.selectedRate === "object"
    ? `${b.selectedRate.label} -  (${b.selectedRate.sub})`
    : b.selectedRate || "N/A";
  return `Hello *${b.fullName}* 👋\n\nThank you for choosing Book My Mechanik 🔧\nYour service request has been successfully confirmed.\n\n🧾 Ticket ID: ${ticketID}\n🚲 Vehicle: ${vehicle}\n📅 Service Schedule: ${serviceSchedule}\n\n⚙️ Engine Selected CC & Price: ${rate}\n\nOur mechanic will reach out to you on the scheduled date and time.\n\n— Team Book My Mechanik`;
};

const generateMechanicMessage = (b, idx) => {
  const ticketID = `BMM-${formatDateForID(b.createdAt)}-${idx + 1}`;
  const issues = (b.issues || []).join(", ");
  const additional = b.additionalIssues || "None";
  const address = `Flat ${b.flatNo}, ${b.address}`;
  const rate = b.selectedRate && typeof b.selectedRate === "object"
    ? `${b.selectedRate.label} -  (${b.selectedRate.sub})`
    : b.selectedRate || "N/A";
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return `🛠 Book My Mechanik – Service Request\n\n🔧 New Service Ticket Assigned\n\n🎫 Ticket ID: ${ticketID}\n👤 Customer: ${b.fullName}\n📞 Phone: ${b.phone}\n\n🏍 Vehicle: ${b.vehicleBrand} ${b.vehicleType}\n🔢 Reg No: ${b.regNumber}\n\n📅 Service Date: ${formatServiceDateForMsg(b.serviceDate)}\n⏰ Time Slot: ${b.timeSlot}\n\n⚙️ Engine Selected CC & Price: ${rate}\n\n🛠 Issues: ${issues}\n➕ Additional: ${additional}\n\n🏢 Flat / Address: ${address}\n📍 Location Details: ${mapLink}`;
};

/* ================= EXCEL EXPORT ENGINE ================= */
const buildAndExport = (bookingsToExport, allBookings, { fileName, sheetName }) => {
  // Create a function to get serial number based on full bookings list
  const getSerialForExport = (bookingId) => {
    const sortedBookings = [...allBookings].sort((a, b) => (a.createdAt?._seconds || 0) - (b.createdAt?._seconds || 0));
    const index = sortedBookings.findIndex(b => b.id === bookingId);
    return index + 1;
  };
  
  const rows = bookingsToExport.map((b) => ({
    "S.No": getSerialForExport(b.id),
    "Booking ID": `BMM-${formatDateForID(b.createdAt)}-${getSerialForExport(b.id)}`,
    "Customer Name": b.fullName, "Phone": b.phone, "Flat No": b.flatNo, "Address": b.address,
    "Vehicle Brand": b.vehicleBrand, "Vehicle Type": b.vehicleType, "Reg. Number": b.regNumber,
    "Fuel Type": b.fuelType, "Service Type": b.serviceType, "Rate Category": getRateLabel(b.selectedRate),
    "Service Date": b.serviceDate, "Time Slot": b.timeSlot, "Issues": (b.issues || []).join(", "),
    "Additional Issues": b.additionalIssues || "", "Terms Agreed": b.agreed ? "Yes" : "No",
    "Booked On": b.createdAt?._seconds ? new Date(b.createdAt._seconds * 1000).toLocaleDateString("en-IN") : "N/A",
    "Customer WhatsApp Message": generateWhatsAppMessage(b, getSerialForExport(b.id) - 1),
    "Mechanic WhatsApp Message": generateMechanicMessage(b, getSerialForExport(b.id) - 1),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 6 }, { wch: 26 }, { wch: 22 }, { wch: 15 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 16 },
    { wch: 52 }, { wch: 26 }, { wch: 13 }, { wch: 14 }, { wch: 100 }, { wch: 100 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/* ================= DESKTOP STATUS DROPDOWN ================= */
const DesktopStatusDropdown = ({ status, bookingId, updateStatus }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`
          w-full text-xs font-bold border border-slate-200 rounded-md px-2 py-1
          ${getStatusColor(status)}
          bg-white shadow-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400
        `}
      >
        {status}
      </button>
      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden">
          {["Pending", "Completed", "Cancelled", "Rescheduled"].map(statusOption => {
            let bgColor = "bg-white";
            let textColor = "text-slate-600";
            if (statusOption === "Pending") {
              bgColor = "bg-blue-50 hover:bg-blue-100";
              textColor = "text-blue-700";
            } else if (statusOption === "Completed") {
              bgColor = "bg-green-50 hover:bg-green-100";
              textColor = "text-green-700";
            } else if (statusOption === "Cancelled") {
              bgColor = "bg-red-50 hover:bg-red-100";
              textColor = "text-red-700";
            } else if (statusOption === "Rescheduled") {
              bgColor = "bg-yellow-50 hover:bg-yellow-100";
              textColor = "text-yellow-700";
            }
            return (
              <button
                key={statusOption}
                onClick={() => {
                  updateStatus(bookingId, statusOption);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 last:border-0 ${bgColor} ${textColor} transition-colors`}
              >
                {statusOption}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ================= MOBILE BOOKING CARD ================= */
const BookingCard = ({ booking, isSelected, onSelect, onView, onDelete, updateStatus, getSerialNumber }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div
      className={`
      relative rounded-2xl border p-4 transition-all font-semibold
      ${getRowStyle(booking.status)}
      ${isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"}
    `}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5"><Checkbox checked={isSelected} onChange={() => onSelect(booking.id)} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{booking.fullName}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">Flat {booking.flatNo}, {booking.address}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onView(booking, getSerialNumber(booking.id))} className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5 min-w-0"><Phone size={11} className="text-slate-400 flex-shrink-0" /><span className="text-xs font-mono text-slate-600 truncate">{booking.phone}</span></div>
            <div className="flex items-center gap-1.5 min-w-0"><Car size={11} className="text-slate-400 flex-shrink-0" /><span className="text-xs text-slate-600 truncate">{booking.vehicleBrand} {booking.vehicleType}</span></div>
            <div className="flex items-center gap-1.5 min-w-0"><Calendar size={11} className="text-slate-400 flex-shrink-0" /><span className="text-xs text-slate-600 truncate">{formatDate(booking.serviceDate)}</span></div>
            <div className="flex items-center gap-1.5 min-w-0"><Clock size={11} className="text-slate-400 flex-shrink-0" /><span className="text-xs text-slate-600 truncate">{booking.timeSlot}</span></div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[11px] font-bold"><Wrench size={10} />{booking.serviceType}</span>
            <div className="flex justify-end flex-1 relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`
                  w-full
                  text-xs font-bold
                  border rounded-md px-2 py-1
                  ${getStatusColor(booking.status)}
                  bg-white shadow-sm
                  text-center
                  focus:outline-none focus:ring-2 focus:ring-blue-400
                `}
              >
                {booking.status || "Pending"}
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden">
                  {["Pending", "Completed", "Cancelled", "Rescheduled"].map(status => {
                    let bgColor = "bg-white";
                    let textColor = "text-slate-600";
                    if (status === "Pending") {
                      bgColor = "bg-blue-50 hover:bg-blue-100";
                      textColor = "text-blue-700";
                    } else if (status === "Completed") {
                      bgColor = "bg-green-50 hover:bg-green-100";
                      textColor = "text-green-700";
                    } else if (status === "Cancelled") {
                      bgColor = "bg-red-50 hover:bg-red-100";
                      textColor = "text-red-700";
                    } else if (status === "Rescheduled") {
                      bgColor = "bg-yellow-50 hover:bg-yellow-100";
                      textColor = "text-yellow-700";
                    }
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          updateStatus(booking.id, status);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 last:border-0 ${bgColor} ${textColor} transition-colors`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= MAIN PAGE ================= */
const AdminBookings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterID, setFilterID] = useState("");
  const [filterCustomerName, setFilterCustomerName] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [status, setStatus] = useState("Pending");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/bookings`);
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch (err) { console.error(err); showToast("Failed to load bookings", "error"); }
    finally { setLoading(false); }
  };

  const deleteBooking = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.filter(b => b.id !== id));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        showToast("Booking deleted successfully", "success");
      } else { showToast("Delete failed", "error"); }
    } catch (err) { console.error(err); showToast("Something went wrong", "error"); }
    finally { setDeleteTarget(null); }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/status/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setBookings(prev =>
          prev.map(b =>
            b.id === id ? { ...b, status: newStatus } : b
          )
        );

        showToast(`Status updated to ${newStatus}`, "success");
      } else {
        showToast("Failed to update status", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating status", "error");
    }
  };
  const filteredBookings = bookings
    .filter(b => {
      // General search filter
      const searchMatch = !search || (
        b.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.includes(search) ||
        b.regNumber?.toLowerCase().includes(search.toLowerCase()) ||
        b.serviceType?.toLowerCase().includes(search.toLowerCase())
      );
      
      // Date filter
      const dateMatch = !filterDate || formatDateForID(b.createdAt) === convertDateInputToFormat(filterDate);
    
      
      // Customer name filter
      const customerNameMatch = !filterCustomerName || b.fullName?.toLowerCase().includes(filterCustomerName.toLowerCase());
      
      return searchMatch && dateMatch && customerNameMatch;
    })
    .sort((a, b) => (a.createdAt?._seconds || 0) - (b.createdAt?._seconds || 0));

  // Get serial number based on full sorted list (not filtered list)
  const getSerialNumber = (bookingId) => {
    const sortedBookings = [...bookings].sort((a, b) => (a.createdAt?._seconds || 0) - (b.createdAt?._seconds || 0));
    const index = sortedBookings.findIndex(b => b.id === bookingId);
    return index + 1;
  };

  const allFilteredSelected = filteredBookings.length > 0 && filteredBookings.every(b => selectedIds.has(b.id));
  const someFilteredSelected = filteredBookings.some(b => selectedIds.has(b.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allFilteredSelected) { filteredBookings.forEach(b => n.delete(b.id)); }
      else { filteredBookings.forEach(b => n.add(b.id)); }
      return n;
    });
  };
  const toggleRow = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleExport = ({ scope, fileName, sheetName }) => {
    const toExport = scope === "selected" ? bookings.filter(b => selectedIds.has(b.id)) : filteredBookings;
    buildAndExport(toExport, bookings, { fileName, sheetName });
    setShowExportModal(false);
    showToast(`Exported ${toExport.length} booking${toExport.length !== 1 ? "s" : ""} to Excel`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-3 sm:p-4 md:p-6 lg:p-8">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-8 gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Customer Bookings</h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">View, manage and export service booking requests</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs sm:text-sm font-semibold text-slate-700">{bookings.length} Total</span>
              </div>
              <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors text-xs sm:text-sm">
                <Download size={15} /><span>Export Excel</span>
                {selectedIds.size > 0 && <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{selectedIds.size}</span>}
              </button>
            </div>
          </div>

          {/* Selection Banner */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-blue-600" />
                <span className="text-xs sm:text-sm font-bold text-blue-700">{selectedIds.size} booking{selectedIds.size !== 1 ? "s" : ""} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowExportModal(true)} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"><Download size={12} /> Export Selected</button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">Clear</button>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-4 sm:mb-5 flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search by name, phone, reg no..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm flex-1 sm:flex-none" placeholder="Filter by date" title="Filter by date" />
              <input type="text" placeholder="Filter by customer name" value={filterCustomerName} onChange={(e) => setFilterCustomerName(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm flex-1 sm:flex-none" />
              {(filterDate ||filterCustomerName) && (
                <button onClick={() => { setFilterDate(""); setFilterID(""); setFilterCustomerName(""); }} className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium">
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {!loading && filteredBookings.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox checked={allFilteredSelected} indeterminate={someFilteredSelected} onChange={toggleSelectAll} />
                <span className="text-xs text-slate-500 font-medium">Select all ({filteredBookings.length})</span>
              </div>
            )}
            {loading ? [...Array(4)].map((_, i) => <CardSkeleton key={i} />) :
              filteredBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-3 text-slate-400">
                  <FileText size={40} className="text-slate-200" />
                  <p className="font-semibold text-sm">No bookings found</p>
                  <p className="text-xs">Try adjusting your search query</p>
                </div>
              ) : filteredBookings.map((b) => (
                <BookingCard key={b.id} booking={b} isSelected={selectedIds.has(b.id)} onSelect={toggleRow}
                  onView={(booking, serialNo) => setSelectedBooking({ booking, serialNo })}
                  onDelete={(booking) => setDeleteTarget(booking)}
                  updateStatus={updateStatus}
                  getSerialNumber={getSerialNumber} />
              ))
            }
            {!loading && filteredBookings.length > 0 && (
              <p className="text-xs text-slate-400 text-center py-2">
                Showing <span className="font-semibold text-slate-600">{filteredBookings.length}</span> of <span className="font-semibold text-slate-600">{bookings.length}</span> bookings
                {selectedIds.size > 0 && <span className="ml-1 font-bold text-blue-600">· {selectedIds.size} selected</span>}
              </p>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 lg:px-4 py-3.5 w-10"><Checkbox checked={allFilteredSelected} indeterminate={someFilteredSelected} onChange={toggleSelectAll} /></th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle</th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service</th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Slot</th>
                    <th className="px-3 lg:px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 lg:px-4 py-3.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? [...Array(5)].map((_, i) => <BookingSkeleton key={i} />) :
                    filteredBookings.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">
                        <div className="flex flex-col items-center gap-2"><FileText size={36} className="text-slate-200" /><p className="font-medium">No bookings found</p><p className="text-xs">Try adjusting your search query</p></div>
                      </td></tr>
                    ) : filteredBookings.map((b) => {
                      const isSelected = selectedIds.has(b.id);
                      const serialNo = getSerialNumber(b.id);
                      return (
                        <tr
                          className={`
                          transition-all group font-semibold
                          ${getRowStyle(b.status)}
                          ${isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/60"}
                        `}
                        >
                          <td className="px-3 lg:px-4 py-3.5"><Checkbox checked={isSelected} onChange={() => toggleRow(b.id)} /></td>
                          <td className="px-3 lg:px-4 py-3.5"><span className="text-slate-400 text-xs font-mono">{serialNo}</span></td>
                          <td className="px-3 lg:px-4 py-3.5">
                            <div className="flex items-center gap-2 lg:gap-2.5">
                              <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-100" : "bg-blue-50"}`}><User size={13} className="text-blue-600" /></div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-xs lg:text-sm leading-tight truncate max-w-[120px] lg:max-w-[160px]">{b.fullName}</p>
                                <p className="text-[10px] lg:text-xs text-slate-400 truncate max-w-[120px] lg:max-w-[160px]">Flat {b.flatNo}, {b.address}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-3.5"><span className="font-mono text-xs text-slate-600">{b.phone}</span></td>
                          <td className="px-3 lg:px-4 py-3.5">
                            <div className="flex items-center gap-1.5"><Car size={12} className="text-slate-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-slate-800 font-semibold text-xs truncate max-w-[100px] lg:max-w-none">{b.vehicleBrand} ({b.vehicleType})</p>
                                <p className="text-[10px] text-slate-400">{b.regNumber} · {b.fuelType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 lg:px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] lg:text-[11px] font-bold whitespace-nowrap">
                              <Wrench size={9} />{b.serviceType}
                            </span>
                          </td>
                          <td className="px-3 lg:px-4 py-3.5">
                            <div className="flex items-center gap-1 text-slate-600 text-xs"><Calendar size={11} className="text-slate-400" /><span className="font-semibold whitespace-nowrap">{formatDate(b.serviceDate)}</span></div>
                            <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5"><Clock size={10} />{b.timeSlot}</div>
                          </td>
                         <td className="px-6 lg:px-4 py-4 relative overflow-visible">
                          <DesktopStatusDropdown 
                            status={b.status || "Pending"} 
                            bookingId={b.id}
                            updateStatus={updateStatus}
                          />
                        </td>
                          <td className="px-3 lg:px-4 py-3.5">
                            <div className="flex items-center justify-center gap-1 lg:gap-2">
                              <button onClick={() => setSelectedBooking({ booking: b, serialNo: serialNo })} title="View Details" className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><ChevronRight size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
            {!loading && filteredBookings.length > 0 && (
              <div className="px-4 lg:px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-400">
                  Showing <span className="font-semibold text-slate-600">{filteredBookings.length}</span> of <span className="font-semibold text-slate-600">{bookings.length}</span> bookings
                  {selectedIds.size > 0 && <span className="ml-2 font-bold text-blue-600">· {selectedIds.size} selected</span>}
                </p>
                <p className="text-xs text-slate-400">Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedBooking && <DetailModal booking={selectedBooking.booking} serialNo={selectedBooking.serialNo} onClose={() => setSelectedBooking(null)} onDelete={(booking) => { setSelectedBooking(null); setDeleteTarget(booking); }} />}
      {deleteTarget && <ConfirmModal booking={deleteTarget} onConfirm={() => deleteBooking(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
      {showExportModal && <ExportModal selectedCount={selectedIds.size} allCount={filteredBookings.length} onClose={() => setShowExportModal(false)} onExport={handleExport} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminBookings;
