import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  Phone,
  Search,
  Users,
  MapPin,
  Car,
  ExternalLink,
  Navigation,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import LiveLocationMap from "../components/LiveLocationMap.jsx";
import { useCustomerLiveLocations } from "../hooks/useCustomerLiveLocations.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// A shared point older than this is shown as "last seen", not live
const LIVE_STALE_AFTER_MS = 2 * 60 * 1000;

const getLiveState = (liveLocation, now) => {
  if (
    !Number.isFinite(liveLocation?.latitude) ||
    !Number.isFinite(liveLocation?.longitude)
  ) {
    return "none";
  }
  const updatedAtMs = new Date(liveLocation.updatedAt).getTime();
  const isFresh = Number.isFinite(updatedAtMs) && now - updatedAtMs <= LIVE_STALE_AFTER_MS;
  return liveLocation.isSharing && isFresh ? "live" : "last_seen";
};

const formatRelativeTime = (value, now) => {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return "";
  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
};

/* ================= SKELETON CARD ================= */

const CustomerSkeleton = () => (
  <div className="bg-white rounded-2xl border p-5 animate-pulse">
    <div className="flex justify-center mb-4">
      <div className="w-24 h-24 rounded-full bg-gray-200" />
    </div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
    <div className="h-9 bg-gray-200 rounded mt-4" />
  </div>
);

const AdminCustomerProfile = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  // Re-renders "Live" / "x min ago" labels as time passes
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15 * 1000);
    return () => clearInterval(timer);
  }, []);

  /* FETCH CUSTOMERS FROM API */
  // `silent` refetches (after a socket reconnect) keep the current UI
  const fetchCustomers = useCallback(async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        
        const response = await fetch(
          `${API_BASE_URL}/api/customer-profile/all-profiles`
        );
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setCustomers(data.data);
        } else {
          throw new Error("Invalid API response format");
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
        if (!silent) setError(err.message || "Failed to fetch customers");
      } finally {
        if (!silent) setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  /* REALTIME CUSTOMER LOCATION */
  const handleLiveLocation = useCallback(({ userId, liveLocation }) => {
    setCustomers((prev) =>
      prev.map((customer) => {
        if (customer.userId !== userId) return customer;
        // Ignore an older point arriving after a newer one
        const currentMs = new Date(customer.liveLocation?.updatedAt || 0).getTime();
        const incomingMs = new Date(liveLocation?.updatedAt || 0).getTime();
        if (liveLocation?.isSharing && incomingMs < currentMs) return customer;
        return { ...customer, liveLocation };
      })
    );
  }, []);

  const liveConnection = useCustomerLiveLocations(handleLiveLocation, () =>
    fetchCustomers({ silent: true })
  );

  // Derived from the list so live updates reach the open profile modal
  const selectedCustomer =
    customers.find((customer) => customer.userId === selectedCustomerId) || null;

  // Use backend customerId if present, otherwise generate fallback prefixed with CUS
  const generateCusId = (u) => {
    if (!u) return "";
    if (u.customerId) return String(u.customerId);
    const raw = u.userId || u.id || "";
    const s = String(raw);
    const clean = s.length > 8 ? s.slice(-6) : s;
    return `CUS${clean.toString().toUpperCase()}`;
  };

  const hasCoordinates = (details) =>
    Number.isFinite(details?.latitude) && Number.isFinite(details?.longitude);

  const compactAddress = (value) => {
    const parts = String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 4) return `${parts[parts.length - 3]}, ${parts[parts.length - 1]}`;
    if (parts.length === 3) return `${parts[0]}, ${parts[2]}`;
    return parts.join(", ");
  };

  // Show a stable, city-level location rather than a street address or live GPS point.
  const formatLocation = (customer) => {
    const details = customer?.locationDetails;
    const city = details?.city || customer?.city || details?.locality || customer?.locality;
    const country = details?.country || customer?.country;
    const address =
      details?.address ||
      (typeof customer?.location === "string" ? customer.location : "") ||
      customer?.location?.address ||
      customer?.location?.formattedAddress;

    if (city && country) return `${city}, ${country}`;
    if (city) {
      const compact = compactAddress(address);
      if (compact.toLowerCase().startsWith(`${city.toLowerCase()},`)) return compact;
      return city;
    }

    const state = details?.state || customer?.state;
    if (state && country) return `${state}, ${country}`;
    if (state || country) return state || country;

    if (address) return compactAddress(address) || "Not available";

    return hasCoordinates(details) ? "Location captured" : "Not available";
  };

  const getMapsUrl = (customer) => {
    const details = customer?.locationDetails;
    const query = hasCoordinates(details)
      ? `${details.latitude},${details.longitude}`
      : details?.address;
    if (!query) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const LOCATION_SOURCE_LABELS = {
    registration: "Initial location saved",
    profile: "Saved in customer profile",
    booking: "From first booking address",
  };

  const formatDateTime = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* FILTER LOGIC */
  const filteredCustomers = customers.filter((u) => {
    const keyword = search.toLowerCase();
    const cusId = generateCusId(u).toLowerCase();

    const matchesSearch =
      String(u.name || "").toLowerCase().includes(keyword) ||
      formatLocation(u).toLowerCase().includes(keyword) ||
      String(u.vehicle || "").toLowerCase().includes(keyword) ||
      String(u.vehicleNumber || "").toLowerCase().includes(keyword) ||
      String(u.phone || "").toLowerCase().includes(keyword) ||
      cusId.includes(keyword);

    const matchesGender =
      genderFilter === "all" || 
      String(u.gender || "").toLowerCase() === genderFilter.toLowerCase();

    return matchesSearch && matchesGender;
  });

  // Export filtered customers as CSV (Excel-compatible)
  const exportCustomersToCSV = () => {
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert("No customers to export");
      return;
    }

    const rows = filteredCustomers.map((c) => ({
      CustomerId: generateCusId(c),
      Name: c.name || "",
      Location: formatLocation(c),
      Latitude: c.locationDetails?.latitude ?? "",
      Longitude: c.locationDetails?.longitude ?? "",
      Phone: c.phone || "",
      Vehicle: c.vehicle || "",
      VehicleNumber: c.vehicleNumber || "",
      Gender: c.gender || "",
      ProfileImage: c.profileImage || "",
    }));

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((h) => {
            const v = r[h] == null ? "" : String(r[h]);
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-6 overflow-auto">
          {/* HEADER */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Customer Profiles
          </h1>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800 text-sm font-medium">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* SEARCH & FILTER */}
          <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, location, vehicle or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={"px-3 py-2 rounded-lg text-sm " + (viewMode === 'grid' ? 'bg-red-600 text-white' : 'bg-gray-100')}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={"px-3 py-2 rounded-lg text-sm " + (viewMode === 'table' ? 'bg-red-600 text-white' : 'bg-gray-100')}
                >
                  Table
                </button>
              </div>

              <button
                onClick={exportCustomersToCSV}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Export CSV
              </button>

              <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            </div>
          </div>

          {/* GRID OR TABLE */}
          {viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                [...Array(8)].map((_, i) => <CustomerSkeleton key={i} />)
              ) : filteredCustomers.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <Users size={32} className="text-red-600" />
                  </div>

                  <p className="text-lg font-semibold text-gray-800">
                    No Customers Found
                  </p>

                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    We couldn’t find any customers matching your search or filter criteria.
                    Try adjusting your filters or search keywords.
                  </p>

                  <button
                    onClick={() => {
                      setSearch("");
                      setGenderFilter("all");
                    }}
                    className="mt-5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700
                 text-white text-sm font-medium transition"
                  >
                    Clear Filters
                  </button>
                </div>

              ) : (
                filteredCustomers.map((user) => (
                  <div
                    key={user.userId || user.id}
                    className="bg-white rounded-2xl shadow-sm border p-5"
                  >
                    <div className="flex justify-center">
                      <img
                        src={user.profileImage}
                        className="w-24 h-24 rounded-full object-cover border"
                        alt="profile"
                      />
                    </div>

                    <h3 className="text-center font-semibold text-gray-800 mt-3">
                      {user.name}
                    </h3>

                    <p
                      className="text-center text-sm text-gray-500 truncate max-w-full"
                      title={formatLocation(user)}
                    >
                      {formatLocation(user)}
                    </p>

                    {getLiveState(user.liveLocation, now) === "live" && (
                      <div className="flex justify-center mt-1">
                        <LiveBadge />
                      </div>
                    )}

                    <p className="text-center text-sm text-gray-500">{user.phone}</p>

                    <p className="text-center text-sm text-gray-500 truncate">
                      {user.vehicle || "—"}
                    </p>

                    <p className="text-center text-xs text-gray-500 truncate">
                      Vehicle Number: {user.vehicleNumber || "—"}
                    </p>

                    <p className="text-center text-xs text-gray-400 mt-2">Customer ID: {generateCusId(user)}</p>

                    <button
                      onClick={() => setSelectedCustomerId(user.userId)}
                      className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium"
                    >
                      View Profile
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No customers to display</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Location</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vehicle</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vehicle Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Gender</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredCustomers.map((user) => (
                        <tr key={user.userId || user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{generateCusId(user)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                            <div className="truncate" title={formatLocation(user)}>
                              {formatLocation(user)}
                            </div>
                            {getLiveState(user.liveLocation, now) === "live" && <LiveBadge />}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.phone}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.vehicle || "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.vehicleNumber || "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.gender}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <button
                              onClick={() => setSelectedCustomerId(user.userId)}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ================= PROFILE MODAL ================= */}
          {selectedCustomer && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white max-w-md w-full rounded-2xl shadow-xl relative max-h-[90vh] overflow-y-auto">
                <button
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-600"
                  onClick={() => setSelectedCustomerId(null)}
                >
                  <X />
                </button>

                <div className="p-6 text-center border-b">
                  <img
                    src={selectedCustomer.profileImage}
                    className="w-28 h-28 rounded-full mx-auto border"
                    alt="profile"
                  />
                  <h2 className="text-xl font-bold mt-3">
                    {selectedCustomer.name}
                  </h2>
                  <div className="mt-2 text-sm text-gray-500 space-y-1">
                    <p>Joined: {formatDateTime(selectedCustomer.createdAt)}</p>
                    <p>Updated: {formatDateTime(selectedCustomer.updatedAt)}</p>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <Info label="Customer Name" value={selectedCustomer.name || "—"} />
                  <LiveLocationInfo
                    liveLocation={selectedCustomer.liveLocation}
                    liveState={getLiveState(selectedCustomer.liveLocation, now)}
                    lastUpdated={formatRelativeTime(selectedCustomer.liveLocation?.updatedAt, now)}
                    connection={liveConnection}
                  />
                  <LocationInfo
                    value={formatLocation(selectedCustomer)}
                    source={LOCATION_SOURCE_LABELS[selectedCustomer.locationDetails?.source]}
                    updatedAt={
                      selectedCustomer.locationDetails?.updatedAt
                        ? formatDateTime(selectedCustomer.locationDetails.updatedAt)
                        : null
                    }
                    mapsUrl={getMapsUrl(selectedCustomer)}
                  />
                  <Info label="Phone Number" icon={Phone} value={selectedCustomer.phone || "—"} />
                  <Info label="Vehicle" icon={Car} value={selectedCustomer.vehicle || "—"} />
                  <Info label="Vehicle Number" value={selectedCustomer.vehicleNumber || "—"} />
                  <Info label="Customer ID" value={generateCusId(selectedCustomer)} />
                </div>

                <div className="p-4 border-t">
                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

/* ================= REUSABLE ================= */

const Info = ({ label, value, icon: Icon }) => (
  <div>
    <label className="text-xs text-gray-500">{label}</label>
    <div className="flex items-center gap-2 border rounded-xl px-4 py-3">
      {Icon && <Icon size={16} className="text-gray-400" />}
      <span className="text-sm">{value}</span>
    </div>
  </div>
);

const LiveBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
    </span>
    Live
  </span>
);

const CONNECTION_LABELS = {
  connected: null,
  connecting: "Connecting to live updates...",
  disconnected: "Live updates paused, reconnecting...",
};

const LiveLocationInfo = ({ liveLocation, liveState, lastUpdated, connection }) => {
  const hasPoint = liveState !== "none";
  const mapsUrl = hasPoint
    ? `https://www.google.com/maps/search/?api=1&query=${liveLocation.latitude},${liveLocation.longitude}`
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-500">Live Location</label>
        {liveState === "live" ? (
          <LiveBadge />
        ) : hasPoint ? (
          <span className="text-xs text-gray-500">
            {liveLocation.isSharing ? "Not updating" : "Sharing stopped"}
          </span>
        ) : null}
      </div>

      {hasPoint ? (
        <div className="space-y-2">
          <LiveLocationMap
            latitude={liveLocation.latitude}
            longitude={liveLocation.longitude}
            accuracy={liveLocation.accuracy}
            isLive={liveState === "live"}
          />
          <div className="flex items-start gap-2 border rounded-xl px-4 py-3">
            <Navigation size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm break-words">
                {liveLocation.address ||
                  `${liveLocation.latitude.toFixed(5)}, ${liveLocation.longitude.toFixed(5)}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {liveState === "live" ? "Updated" : "Last seen"} {lastUpdated}
                {Number.isFinite(liveLocation.accuracy)
                  ? ` · ±${Math.round(liveLocation.accuracy)} m`
                  : ""}
              </p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 shrink-0"
            >
              Map <ExternalLink size={12} />
            </a>
          </div>
        </div>
      ) : (
        <div className="border rounded-xl px-4 py-3 text-sm text-gray-500">
          Customer is not sharing live location
        </div>
      )}

      {CONNECTION_LABELS[connection] && (
        <p className="text-xs text-amber-600 mt-1">{CONNECTION_LABELS[connection]}</p>
      )}
    </div>
  );
};

const LocationInfo = ({ value, source, updatedAt, mapsUrl }) => (
  <div>
    <label className="text-xs text-gray-500">Saved Address</label>
    <div className="flex items-start gap-2 border rounded-xl px-4 py-3">
      <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm break-words">{value}</p>
        {source && (
          <p className="text-xs text-gray-400 mt-1">
            {source}
            {updatedAt ? ` · ${updatedAt}` : ""}
          </p>
        )}
      </div>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 shrink-0"
        >
          Map <ExternalLink size={12} />
        </a>
      )}
    </div>
  </div>
);

export default AdminCustomerProfile;
