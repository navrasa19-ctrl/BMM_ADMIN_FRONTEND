import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Toast from "../components/Toast.jsx";
import { useToast } from "../hooks/useToast.js";

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

const EmergencyIssue = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setSidebarOpen((p) => !p);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [issues, setIssues] = useState([]);
  const [issueCount, setIssueCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [issueType, setIssueType] = useState("");
  const [price, setPrice] = useState("");
  const [visitCost, setVisitCost] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editType, setEditType] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editvisitCost, setEditvisitCost] = useState("");
  const [showAllModal, setShowAllModal] = useState(false);

  const { toasts, addToast } = useToast();

  const displayVehicleName = (issue) =>
    issue?.vehicleName || vehicles.find((v) => v.id === issue?.vehicleId)?.name || "—";

  const fetchVehicles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/client/vehicles`);
      const data = await res.json();
      if (!res.ok) {
        addToast(data.message || "Failed to fetch vehicles", "error");
        return;
      }
      const list = Array.isArray(data) ? data : data.data || [];
      const sortedVehicles = sortVehicles(list);
      setVehicles(sortedVehicles);
      setSelectedVehicleId((prev) => prev || (sortedVehicles[0]?.id ?? ""));
    } catch {
      addToast("Failed to load vehicles", "error");
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/VisibleIssue`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        addToast(json.message || "Failed to fetch issues", "error");
        return;
      }
      setIssues(Array.isArray(json.data) ? json.data : []);
      setIssueCount(json.count ?? json.data?.length ?? 0);
    } catch {
      addToast("Server error", "error");
    }
  };

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchVehicles(), fetchIssues()]);
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const createIssue = async () => {
    if (!selectedVehicleId) { addToast("Select a vehicle", "warning"); return; }
    if (!issueType || !price) { addToast("Provide issue type and price", "warning"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/VisibleIssue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          issueType,
          visitCost: Number(visitCost) || 0,
          price: Number(price),
        }),
      });
      const json = await res.json();
      if (json.success) {
        const createdAt = { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
        addToast(json.message || "Visible issue created successfully", "success");
        setIssues((p) => [{
          id: json.issueId,
          vehicleId: selectedVehicleId,
          vehicleName: selectedVehicle?.name,
          issueType,
          visitCost: Number(visitCost) || 0,
          price: Number(price),
          createdAt,
        }, ...p]);
        setIssueCount((c) => c + 1);
        setIssueType("");
        setPrice("");
      } else addToast(json.message || "Create failed", "error");
    } catch {
      addToast("Server error", "error");
    }
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setEditType(it.issueType || "");
    setEditvisitCost(it.visitCost || "");
    setEditPrice(it.price || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditType("");
    setEditvisitCost("");
    setEditPrice("");
  };

  const saveEdit = async (id) => {
    if (!editType || !editPrice) { addToast("Provide issue type and price", "warning"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/VisibleIssue/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType: editType, price: Number(editPrice), visitCost: Number(editvisitCost) }),
      });
      const json = await res.json();
      if (json.success) {
        addToast("Issue updated successfully", "success");
        setIssues((prev) => prev.map((it) => (it.id === id ? { ...it, issueType: editType, price: Number(editPrice), visitCost: Number(editvisitCost) } : it)));
        cancelEdit();
      } else addToast(json.message || "Update failed", "error");
    } catch {
      addToast("Server error", "error");
    }
  };

  const deleteIssue = async (id) => {
    if (!window.confirm("Delete this issue?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/VisibleIssue/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        addToast("Issue deleted successfully", "success");
        setIssues((prev) => prev.filter((it) => it.id !== id));
        setIssueCount((c) => Math.max(0, c - 1));
      } else addToast(json.message || "Delete failed", "error");
    } catch {
      addToast("Server error", "error");
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "-";
    const seconds = ts._seconds ?? ts.seconds ?? null;
    if (!seconds) return "-";
    return new Date(seconds * 1000).toLocaleString();
  };

  const filteredIssues = selectedVehicleId
    ? issues.filter((it) => it.vehicleId === selectedVehicleId)
    : issues;

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 transition-all ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Visible Issues</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage emergency vehicle visible issues and pricing</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchAllData} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm">{refreshing ? 'Refreshing...' : 'Refresh'}</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-5 rounded-2xl border">
                <h2 className="text-lg font-semibold mb-3">Create Visible Issue</h2>
                <label className="text-sm text-gray-600">Vehicle</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full mt-1 mb-3 p-2 border rounded-md bg-white"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {selectedVehicle?.iconUrl && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border bg-gray-50 p-2">
                    <img src={selectedVehicle.iconUrl} alt="" className="h-8 w-8 object-contain" />
                    <span className="text-sm text-gray-600">{selectedVehicle.name}</span>
                  </div>
                )}
                <label className="text-sm text-gray-600">Issue type</label>
                <input value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full mt-1 mb-3 p-2 border rounded-md" placeholder="e.g. Dent" />
                <label className="text-sm text-gray-600">Price</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="w-full mt-1 mb-4 p-2 border rounded-md" placeholder="300" />
                <label className="text-sm text-gray-600">Visit Cost</label>
                <input value={visitCost} onChange={(e) => setVisitCost(e.target.value)} type="number" className="w-full mt-1 mb-4 p-2 border rounded-md" placeholder="100" />
                <div className="flex gap-3">
                  <button onClick={createIssue} className="flex-1 bg-red-600 text-white py-2 rounded-xl">Create</button>
                  <button onClick={() => { setIssueType(''); setPrice(''); setVisitCost(''); }} className="flex-1 border py-2 rounded-xl">Clear</button>
                </div>
              </div>

            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold">Issues</h2>
                  {selectedVehicle && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {filteredIssues.length} of {issueCount} for {selectedVehicle.name}
                    </p>
                  )}
                </div>
                {filteredIssues.length > 3 && (
                  <button onClick={() => setShowAllModal(true)} className="text-sm text-red-600 hover:underline">See all</button>
                )}
              </div>

              {initialLoading ? (
                <div className="text-center py-12 text-gray-400">Loading…</div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  {selectedVehicleId ? `No visible issues for ${selectedVehicle?.name || "this vehicle"}` : "No visible issues"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b">
                        <th className="py-2">Vehicle</th>
                        <th className="py-2">Issue</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Visit Cost</th>
                        <th className="py-2">Created</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIssues.slice(0, 3).map((it) => (
                        <tr key={it.id} className="border-b last:border-b-0">
                          <td className="py-3 text-sm text-gray-600">{displayVehicleName(it)}</td>
                          <td className="py-3">
                            {editingId === it.id ? (
                              <input value={editType} onChange={(e) => setEditType(e.target.value)} className="p-2 border rounded-md w-full" />
                            ) : (
                              <div className="text-sm font-medium text-gray-800">{it.issueType}</div>
                            )}
                          </td>
                          <td className="py-3 w-40">
                            {editingId === it.id ? (
                              <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" className="p-2 border rounded-md w-full" />
                            ) : (
                              <div className="text-sm text-gray-700">₹{it.price}</div>
                            )}
                          </td>
                          <td className="py-3 w-40">
                            {editingId === it.id ? (
                              <input value={editvisitCost} onChange={(e) => setEditvisitCost(e.target.value)} type="number" className="p-2 border rounded-md w-full" />
                            ) : (
                              <div className="text-sm text-gray-700">₹{it.visitCost}</div>
                            )}
                          </td>
                          <td className="py-3 text-sm text-gray-500">{formatTime(it.createdAt)}</td>
                          <td className="py-3">
                            {editingId === it.id ? (
                              <div className="flex gap-2">
                                <button onClick={() => saveEdit(it.id)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Save</button>
                                <button onClick={cancelEdit} className="px-3 py-1 border rounded-md text-sm">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button onClick={() => startEdit(it)} className="px-3 py-1 border rounded-md text-sm">Edit</button>
                                <button onClick={() => deleteIssue(it.id)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredIssues.length > 3 && (
                    <div className="mt-4 text-sm text-gray-500">Showing top 3 issues. Click "See all" to view the rest.</div>
                  )}

                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* See-all modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAllModal(false)} />
          <div className="relative bg-white rounded-2xl w-[min(96%,900px)] max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">All Visible Issues</h3>
              <button onClick={() => setShowAllModal(false)} className="text-gray-500 hover:text-red-600">Close</button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: '66vh' }}>
              {filteredIssues.map((it) => (
                <div key={it.id} className="mb-3 p-3 rounded-lg border">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-xs text-gray-500">{displayVehicleName(it)}</div>
                        <div className="font-semibold text-gray-800">{it.issueType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-800">Price: ₹{it.price}</div>
                        <div className="text-xs text-gray-500">Visit Cost: ₹{it.visitCost}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => { startEdit(it); setShowAllModal(false); }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { deleteIssue(it.id); setShowAllModal(false); }}
                        disabled={editingId === it.id}
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


      <Toast toasts={toasts} />
    </div>
  );
};

export default EmergencyIssue;
