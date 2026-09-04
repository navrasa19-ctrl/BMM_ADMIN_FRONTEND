import React, { useState, useEffect } from "react";
import { Car, Settings, Trash2Icon } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const BASE_URL = import.meta.env.VITE_API_URL;

const VEHICLE_API = `${BASE_URL}/admin/vehicles`;
const EQUIPMENT_API = `${BASE_URL}/admin/equipment`;

const ListItem = ({ label, id, onDelete, isDeleting }) => (
  <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition">
    <span className="text-sm font-medium text-gray-800">{label}</span>

    <button
      onClick={() => onDelete(id)}
      disabled={isDeleting}
      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2Icon size={16} />
    </button>
  </div>
);

const SHOW_LIMIT = 4;

const CustomerAssets = () => {  const { toasts } = useToast();  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [inputValue, setInputValue] = useState("");

  const [vehicles, setVehicles] = useState([]);
  const [equipment, setEquipment] = useState([]);

  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [showAllEquipment, setShowAllEquipment] = useState(false);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // ================= FETCH =================

  const fetchVehicles = async () => {
    try {
      const res = await fetch(VEHICLE_API);
      const data = await res.json();
      if (data.success) setVehicles(data.vehicles);
    } catch (err) {
      console.error("Vehicle fetch error:", err);
    }
  };

  const fetchEquipment = async () => {
    try {
      const res = await fetch(EQUIPMENT_API);
      const data = await res.json();
      if (data.success) setEquipment(data.equipment);
    } catch (err) {
      console.error("Equipment fetch error:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchVehicles(), fetchEquipment()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // ================= ADD =================

  const handleAddItem = async () => {
    if (!inputValue.trim()) return;

    setIsAdding(true);

    const endpoint =
      modalType === "vehicles" ? VEHICLE_API : EQUIPMENT_API;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputValue }),
      });

      const data = await res.json();

      if (data.success) {
        if (modalType === "vehicles") {
          await fetchVehicles();
          setShowAllVehicles(true);
        } else {
          await fetchEquipment();
          setShowAllEquipment(true);
        }
      }
    } catch (err) {
      console.error("Add error:", err);
    }

    setInputValue("");
    setShowModal(false);
    setIsAdding(false);
  };

  const openModal = (type) => {
    setModalType(type);
    setInputValue("");
    setShowModal(true);
  };

  // ================= DELETE =================

  const handleDeleteVehicle = async (id) => {
    setDeletingId(id);

    try {
      await fetch(`${VEHICLE_API}/${id}`, { method: "DELETE" });
      await fetchVehicles();
    } catch (err) {
      console.error("Delete vehicle error:", err);
    }

    setDeletingId("");
  };

  const handleDeleteEquipment = async (id) => {
    setDeletingId(id);

    try {
      await fetch(`${EQUIPMENT_API}/${id}`, { method: "DELETE" });
      await fetchEquipment();
    } catch (err) {
      console.error("Delete equipment error:", err);
    }

    setDeletingId("");
  };

  const visibleVehicles = showAllVehicles
    ? vehicles
    : vehicles.slice(0, SHOW_LIMIT);

  const visibleEquipment = showAllEquipment
    ? equipment
    : equipment.slice(0, SHOW_LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div
        className={`flex-1 flex flex-col ${
          sidebarOpen ? "lg:ml-60" : "ml-0"
        }`}
      >
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">
              Customer Vehicle & Equipment
            </h1>
            <p className="text-sm text-gray-500">
              Manage vehicles and equipment
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 max-w-6xl">
            {/* VEHICLES */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex justify-between mb-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Car size={18} className="text-red-600" />
                  Vehicles
                </h3>

                <button
                  onClick={() => openModal("vehicles")}
                  className="text-sm text-red-600"
                >
                  + Add
                </button>
              </div>

              {loading ? (
                <p>Loading...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {visibleVehicles.map((item) => (
                      <ListItem
                        key={item.id}
                        id={item.id}
                        label={item.name}
                        onDelete={handleDeleteVehicle}
                        isDeleting={deletingId === item.id}
                      />
                    ))}
                  </div>

                  {vehicles.length > SHOW_LIMIT && (
                    <button
                      onClick={() => setShowAllVehicles(!showAllVehicles)}
                      className="text-xs text-red-600 mt-4"
                    >
                      {showAllVehicles ? "View Less" : "View More"}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* EQUIPMENT */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex justify-between mb-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Settings size={18} className="text-red-600" />
                  Equipment
                </h3>

                <button
                  onClick={() => openModal("equipment")}
                  className="text-sm text-red-600"
                >
                  + Add
                </button>
              </div>

              {loading ? (
                <p>Loading...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {visibleEquipment.map((item) => (
                      <ListItem
                        key={item.id}
                        id={item.id}
                        label={item.name}
                        onDelete={handleDeleteEquipment}
                        isDeleting={deletingId === item.id}
                      />
                    ))}
                  </div>

                  {equipment.length > SHOW_LIMIT && (
                    <button
                      onClick={() => setShowAllEquipment(!showAllEquipment)}
                      className="text-xs text-red-600 mt-4"
                    >
                      {showAllEquipment ? "View Less" : "View More"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4">
              Add {modalType === "vehicles" ? "Vehicle" : "Equipment"}
            </h3>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter name"
              className="w-full border px-3 py-2 rounded-lg"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleAddItem}
                disabled={isAdding}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg disabled:opacity-50"
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

export default CustomerAssets;
