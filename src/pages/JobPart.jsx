import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Toast from "../components/Toast.jsx";
import { useToast } from "../hooks/useToast.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VEHICLE_ORDER_GROUPS = [
  ["scooter"],
  ["bike", "bicycle", "2-wheeler"],
  ["car", "cars"],
  ["3-wheeler", "three", "three-wheeler", "three wheeler"],
  ["pickup", "van"],
  ["tractor", "tractors"],
  ["bus"],
  ["truck"],
];

const getOrderIndex = (name = "") => {
  const n = (name || "").toLowerCase();
  for (let i = 0; i < VEHICLE_ORDER_GROUPS.length; i++) {
    for (const kw of VEHICLE_ORDER_GROUPS[i]) {
      if (n.includes(kw.toLowerCase())) return i;
    }
  }
  return VEHICLE_ORDER_GROUPS.length;
};

const sortVehicles = (vehicles = []) =>
  [...vehicles].sort((a, b) => getOrderIndex(a.name) - getOrderIndex(b.name));

const JobPart = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [jobParts, setJobParts] = useState([]);
  const [partName, setPartName] = useState("");
  const [price, setPrice] = useState("");
  const [editingPartId, setEditingPartId] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingParts, setLoadingParts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [showAllParts, setShowAllParts] = useState(false);
  const { toasts, addToast } = useToast();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resolveResponse = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error("Invalid server response");
    }
  };

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/client/vehicles`);
      const data = await resolveResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load vehicles");
      }

      const vehicleList = Array.isArray(data) ? data : data.data || data;
      const sortedVehicles = sortVehicles(Array.isArray(vehicleList) ? vehicleList : []);
      setVehicles(sortedVehicles);
      if (!selectedVehicleId && sortedVehicles?.length > 0) {
        setSelectedVehicleId(sortedVehicles[0].id);
      }
    } catch (err) {
      setError(err.message || "Unable to fetch vehicles");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchJobParts = async (vehicleId) => {
    if (!vehicleId) {
      setJobParts([]);
      return;
    }

    setLoadingParts(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/vehicle/${vehicleId}/job-part`);
      const data = await resolveResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load job parts");
      }

      setJobParts(Array.isArray(data.data) ? data.data : data.data || []);
    } catch (err) {
      setError(err.message || "Unable to fetch job parts");
      setJobParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchJobParts(selectedVehicleId);
      setEditingPartId(null);
      setPartName("");
      setPrice("");
    }
  }, [selectedVehicleId]);

  const handleSelectVehicle = (event) => {
    setSelectedVehicleId(event.target.value);
  };

  const handleStartEdit = (part) => {
    setEditingPartId(part.id);
    setPartName(part.partName || "");
    setPrice(part.price != null ? String(part.price) : "");
  };

  const resetForm = () => {
    setEditingPartId(null);
    setPartName("");
    setPrice("");
  };

  const handleSavePart = async () => {
    if (!selectedVehicleId) {
      addToast("Please select a vehicle first", "warning");
      return;
    }

    if (!partName.trim() || !price.trim()) {
      addToast("Part name and price are required", "warning");
      return;
    }

    const payload = {
      partName: partName.trim(),
      price: Number(price),
    };

    const endpoint = editingPartId
      ? `${API_BASE_URL}/api/admin/vehicle/${selectedVehicleId}/job-part/${editingPartId}`
      : `${API_BASE_URL}/api/admin/vehicle/${selectedVehicleId}/job-part`;
    const method = editingPartId ? "PUT" : "POST";

    setSaving(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resolveResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save job part");
      }

      addToast(data.message || (editingPartId ? "Part updated successfully" : "Part created successfully"), "success");
      // optimistically show new part at the top when creating
      if (!editingPartId) {
        const newId = (data && (data.id || data.partId)) || `new-${Date.now()}`;
        setJobParts((prev) => [{ id: newId, partName: payload.partName, price: payload.price }, ...prev]);
      }
      resetForm();
      fetchJobParts(selectedVehicleId);
    } catch (err) {
      setError(err.message || "Unable to save job part");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!selectedVehicleId || !partId) return;
    if (!window.confirm("Delete this job part?")) return;

    setDeletingId(partId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/vehicle/${selectedVehicleId}/job-part/${partId}`, {
        method: "DELETE",
      });

      const data = await resolveResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete job part");
      }

      addToast(data.message || "Part deleted successfully", "success");
      if (editingPartId === partId) resetForm();
      fetchJobParts(selectedVehicleId);
    } catch (err) {
      setError(err.message || "Unable to delete job part");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toast toasts={toasts} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={toggleSidebar} />
      )}

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-60" : "ml-0"}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                <X size={18} />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Job Parts</h2>
                <p className="text-gray-500 mt-1 max-w-2xl">
                  Create and manage job parts for each vehicle type. Use the selector below to pick a vehicle, then add, edit or remove parts.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Selected Vehicle</p>
                  <p className="mt-2 font-medium text-gray-800">{selectedVehicle?.name || "None"}</p>
                  <p className="text-sm text-gray-500 mt-1">{vehicles.length} vehicle type{vehicles.length === 1 ? "" : "s"} available</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Current status</p>
                  <p className="mt-2 font-medium text-gray-800">{loadingVehicles ? "Loading vehicles..." : loadingParts ? "Loading parts..." : "Ready"}</p>
                </div>
              </div>
            </div>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,360px)_1fr]">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                  <select
                    value={selectedVehicleId}
                    onChange={handleSelectVehicle}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-red-600 focus:ring-red-100 focus:ring-2"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Part Name</label>
                    <input
                      value={partName}
                      onChange={(event) => setPartName(event.target.value)}
                      placeholder="Enter part name"
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-red-600 focus:ring-red-100 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <div className="mt-2 relative rounded-xl border border-gray-300 bg-white shadow-sm focus-within:border-red-600 focus-within:ring-red-100 focus-within:ring-2">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="Enter price"
                        className="w-full rounded-xl border-none bg-transparent px-4 py-3 pl-10 text-sm text-gray-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={handleSavePart}
                      disabled={saving || !selectedVehicleId}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      <Plus size={18} />
                      {editingPartId ? "Update Part" : "Create Part"}
                    </button>
                    {editingPartId && (
                      <button
                        onClick={resetForm}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Available Job Parts</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage parts for the selected vehicle.</p>
                  </div>
                  {jobParts.length > 3 && (
                    <div>
                      <button onClick={() => setShowAllParts(true)} className="text-sm text-red-600 hover:underline">See all</button>
                    </div>
                  )}
                </div>

                {loadingParts ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, idx) => (
                      <div key={idx} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : jobParts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
                    No parts found for this vehicle. Add a part to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-[520px] overflow-y-auto">
                      <table className="min-w-full text-left text-sm text-gray-700">
                        <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">Part</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {jobParts.slice(0, 3).map((part) => (
                          <tr key={part.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 font-medium text-gray-800">{part.partName}</td>
                            <td className="px-4 py-4">₹ {part.price}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleStartEdit(part)}
                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeletePart(part.id)}
                                  disabled={deletingId === part.id}
                                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                    {jobParts.length > 5 && (
                      <div className="mt-4 text-sm text-gray-500">Showing top 3 job parts. Click "See all" to view the rest.</div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* See-all modal for job parts */}
      {showAllParts && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAllParts(false)} />
          <div className="relative bg-white rounded-2xl w-[min(96%,900px)] max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">All Job Parts</h3>
              <button onClick={() => setShowAllParts(false)} className="text-gray-500 hover:text-red-600">Close</button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: '66vh' }}>
              {jobParts.map((part) => (
                <div key={part.id} className="mb-3 p-3 rounded-lg border">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{part.partName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">₹{part.price}</div>
                      <button
                        onClick={() => { handleStartEdit(part); setShowAllParts(false); }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { handleDeletePart(part.id); setShowAllParts(false); }}
                        disabled={deletingId === part.id}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JobPart;
