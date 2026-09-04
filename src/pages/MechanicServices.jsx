import React, { useState, useEffect } from "react";
import { useToast } from "../hooks/useToast.js";
import { X, Wrench, Car, Trash2Icon } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

// New API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://machcnik.onrender.com/api/master";

const ListItem = ({ label, onDelete, deleting }) => (
  <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition">
    <span className="text-sm font-medium text-gray-800">{label}</span>
    {onDelete && (
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        title="Delete"
      >
        <Trash2Icon size={16} />
      </button>
    )}
  </div>
);

const SHOW_LIMIT = 4;

const MechanicServices = () => {
  const { toasts } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // skills | vehicles
  const [inputValue, setInputValue] = useState("");

  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllVehicles, setShowAllVehicles] = useState(false);

  const [skills, setSkills] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch Skills (type=skill)
  const fetchSkills = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master?type=skill`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setSkills(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching skills:", err);
      setError("Failed to load skills");
    }
  };

  // Fetch Vehicles (type=vehicle)
  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master?type=vehicle`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setVehicles(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError("Failed to load vehicles");
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSkills(), fetchVehicles()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Add Skill or Vehicle using the /create endpoint
  const handleAddItem = async () => {
    if (!inputValue.trim()) return;

    setIsAdding(true);
    setError("");
    try {
      const type = modalType === "skills" ? "skill" : "vehicle";
      const body = {
        name: inputValue,
        type: type
      };

      const response = await fetch(`${API_BASE_URL}/api/master/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        if (modalType === "skills") {
          await fetchSkills();
          setShowAllSkills(true);
        } else {
          await fetchVehicles();
          setShowAllVehicles(true);
        }
        setShowModal(false);
        setInputValue("");
      } else {
        setError(data.message || "Failed to add item");
      }
    } catch (err) {
      console.error("Error adding item:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (item, type) => {
    const itemId = item.id || item._id;
    if (!itemId) return;

    if (!window.confirm("Delete this item?")) return;

    setDeletingId(itemId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/master/${itemId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        if (type === "skills") {
          setSkills((prev) => prev.filter((skill) => (skill.id || skill._id) !== itemId));
        } else {
          setVehicles((prev) => prev.filter((vehicle) => (vehicle.id || vehicle._id) !== itemId));
        }
      } else {
        setError(data.message || "Failed to delete item");
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setInputValue("");
    setError("");
    setShowModal(true);
  };

  const visibleSkills = showAllSkills ? skills : skills.slice(0, SHOW_LIMIT);
  const visibleVehicles = showAllVehicles ? vehicles : vehicles.slice(0, SHOW_LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={toggleSidebar} />
      )}

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-60" : "ml-0"}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Mechanic Services Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage master list of skills and serviceable vehicles</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
            {/* ===== SKILLS SECTION ===== */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Wrench size={18} className="text-red-600" />
                  Skills & Expertise
                </h3>
                <button onClick={() => openModal("skills")} className="text-sm text-red-600 font-medium hover:underline">
                  + Add Skill
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500 italic">Loading skills...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {visibleSkills.map((item) => (
                      <ListItem
                        key={item.id || item._id}
                        label={item.name}
                        onDelete={() => handleDeleteItem(item, "skills")}
                        deleting={deletingId === (item.id || item._id)}
                      />
                    ))}
                    {skills.length === 0 && <p className="text-xs text-gray-400">No skills added yet.</p>}
                  </div>
                  {skills.length > SHOW_LIMIT && (
                    <button onClick={() => setShowAllSkills(!showAllSkills)} className="text-xs text-red-600 mt-4 hover:underline">
                      {showAllSkills ? "View Less" : "View More"}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ===== VEHICLES SECTION ===== */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Car size={18} className="text-red-600" />
                  Vehicles / Equipment
                </h3>
                <button onClick={() => openModal("vehicles")} className="text-sm text-red-600 font-medium hover:underline">
                  + Add Vehicle
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500 italic">Loading vehicles...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {visibleVehicles.map((item) => (
                      <ListItem
                        key={item.id || item._id}
                        label={item.name}
                        onDelete={() => handleDeleteItem(item, "vehicles")}
                        deleting={deletingId === (item.id || item._id)}
                      />
                    ))}
                    {vehicles.length === 0 && <p className="text-xs text-gray-400">No vehicles added yet.</p>}
                  </div>
                  {vehicles.length > SHOW_LIMIT && (
                    <button onClick={() => setShowAllVehicles(!showAllVehicles)} className="text-xs text-red-600 mt-4 hover:underline">
                      {showAllVehicles ? "View Less" : "View More"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600">
              <X size={18} />
            </button>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Add {modalType === "skills" ? "Skill / Expertise" : "Vehicle / Equipment"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={modalType === "skills" ? "e.g. Denting & Painting" : "e.g. Generator"}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              disabled={isAdding}
              autoFocus
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
                disabled={isAdding || !inputValue.trim()}
              >
                {isAdding ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MechanicServices;
