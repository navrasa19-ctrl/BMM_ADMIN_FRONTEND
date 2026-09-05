import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Filter,
  Car,
  Users,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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

const formatDateTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const getInitials = (name) => {
  if (!name) return "CU";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
};

const CustomerVehicles = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [brand, setBrand] = useState("");
  const [expandedIds, setExpandedIds] = useState({});

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const fetchCustomerVehicles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer-vehicles/all`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCustomerVehicles(data.data);
      } else {
        throw new Error(data.message || "Could not load customer vehicles.");
      }
    } catch (err) {
      setError(err.message || "Failed to load customer vehicles.");
      setCustomerVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerVehicles();
  }, []);

  const vehicleTypes = useMemo(
    () => ["", ...new Set(customerVehicles.flatMap((entry) => entry.vehicles.map((vehicle) => vehicle.vehicleType || "Unknown")))],
    [customerVehicles]
  );

  const brands = useMemo(
    () => ["", ...new Set(customerVehicles.flatMap((entry) => entry.vehicles.map((vehicle) => vehicle.brand || "Unknown")))],
    [customerVehicles]
  );

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customerVehicles
      .map((entry) => {
        const vehicles = entry.vehicles.filter((vehicle) => {
          const matchesSearch = normalizedSearch
            ? [
                entry.customer.name,
                entry.customer.phone,
                vehicle.vehicleName,
                vehicle.registrationNumber,
                vehicle.brand,
                vehicle.model,
                vehicle.vehicleType,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(normalizedSearch)
            : true;

          const matchesType = vehicleType ? vehicle.vehicleType === vehicleType : true;
          const matchesBrand = brand ? vehicle.brand === brand : true;
          return matchesSearch && matchesType && matchesBrand;
        });

        return { ...entry, vehicles };
      })
      .filter((entry) => entry.vehicles.length > 0);
  }, [customerVehicles, search, vehicleType, brand]);

  const totalCustomers = customerVehicles.length;
  const totalVehicles = customerVehicles.reduce((count, entry) => count + entry.vehicles.length, 0);
  const matchedVehicles = filteredCustomers.reduce((count, entry) => count + entry.vehicles.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Customer Vehicles</h1>
                  <p className="text-sm text-gray-500 mt-1">View customer details and their registered vehicles with smart filtering.</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search customer, phone, model, reg. number..."
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchCustomerVehicles}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Customers</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{totalCustomers}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-emerald-50 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Total Vehicles</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">{totalVehicles}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-blue-50 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Matching Vehicles</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">{matchedVehicles}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">All Types</option>
                  {vehicleTypes.filter(Boolean).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">All Brands</option>
                  {brands.filter(Boolean).map((brandName) => (
                    <option key={brandName} value={brandName}>{brandName}</option>
                  ))}
                </select>
                <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Customers with images</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{customerVehicles.filter((entry) => entry.customer.profileImage).length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Vehicle types</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{vehicleTypes.filter(Boolean).length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                  Loading customer vehicles...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                  {error}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                  No vehicles found for the current search and filter criteria.
                </div>
              ) : (
                filteredCustomers.map((entry) => {
                  const customerName = entry.customer.name || "Anonymous";
                  const hasImage = Boolean(entry.customer.profileImage);
                  const isExpanded = Boolean(expandedIds[entry.customer.userId]);
                  const visibleVehicles = isExpanded ? entry.vehicles : entry.vehicles.slice(0, 3);

                  return (
                    <div key={entry.customer.userId} className="rounded-3xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                            {hasImage ? (
                              <img src={entry.customer.profileImage} alt={customerName} className="h-14 w-14 rounded-3xl object-cover" />
                            ) : (
                              <span className="text-lg font-semibold">{getInitials(customerName)}</span>
                            )}
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">{customerName}</h2>
                            <p className="mt-1 text-sm text-gray-500">{formatPhone(entry.customer.phone)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                              <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Vehicles</p>
                              <p className="mt-2 text-lg font-semibold text-gray-900">{entry.vehicles.length}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                              <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Newest</p>
                              <p className="mt-2 text-lg font-semibold text-gray-900">{formatDateTime(entry.vehicles[0]?.createdAt)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedIds((prev) => ({
                                ...prev,
                                [entry.customer.userId]: !prev[entry.customer.userId],
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            {isExpanded ? "Collapse vehicles" : `Expand ${entry.vehicles.length} vehicles`}
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 px-4 pb-4 sm:px-6">
                        {isExpanded ? (
                          <>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase">Vehicle</th>
                                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase">Registration</th>
                                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase">Brand</th>
                                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase">Model</th>
                                    <th className="px-4 py-3 font-semibold text-gray-500 uppercase">Added</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {visibleVehicles.map((vehicle) => (
                                    <tr key={vehicle.vehicleId} className="hover:bg-gray-50">
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
                                            <Car size={16} />
                                          </div>
                                          <div>
                                            <p className="font-semibold text-gray-900 truncate">{vehicle.vehicleName}</p>
                                            <p className="text-xs text-gray-500 truncate">{vehicle.vehicleType}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-gray-700">{vehicle.registrationNumber || "—"}</td>
                                      <td className="px-4 py-4 text-gray-700">{vehicle.brand || "—"}</td>
                                      <td className="px-4 py-4 text-gray-700">{vehicle.model || "—"}</td>
                                      <td className="px-4 py-4 text-gray-700">{formatDateTime(vehicle.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {entry.vehicles.length > 3 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIds((prev) => ({
                                    ...prev,
                                    [entry.customer.userId]: !prev[entry.customer.userId],
                                  }))
                                }
                                className="mt-4 inline-flex items-center mb-4 gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                {isExpanded ? "Show less vehicles" : `Show all ${entry.vehicles.length} vehicles`}
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col gap-3 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Vehicle count</p>
                              <p className="mt-1 text-lg font-semibold text-gray-900">{entry.vehicles.length}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Newest</p>
                              <p className="mt-1 text-lg font-semibold text-gray-900">{formatDateTime(entry.vehicles[0]?.createdAt)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerVehicles;
