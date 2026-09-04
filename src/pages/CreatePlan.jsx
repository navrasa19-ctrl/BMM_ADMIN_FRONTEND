import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Toast from "../components/Toast.jsx";
import { useToast } from "../hooks/useToast.js";

/* ================= PLAN SKELETON ================= */

const PlanSkeleton = () => (
  <div className="bg-white border rounded-xl p-4 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-3 bg-gray-200 rounded w-1/2" />
  </div>
);

const SubscriptionPlans = () => {
  const { toasts } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");

  const [plans, setPlans] = useState([]);

  const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/plans`;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  /* ================= FETCH PLANS ================= */
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_BASE);
      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Invalid JSON:", text);
        throw new Error("Server is not returning JSON");
      }
      if (data.success) {
        setPlans(data.data);
      } else {
        setError("Failed to fetch plans");
      }
    } catch (err) {
      setError("Error fetching plans: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CREATE PLAN ================= */
  const handleCreatePlan = async () => {
    if (!planName || !planPrice) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planName: planName,
          pricePerDay: Number(planPrice),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlanName("");
        setPlanPrice("");
        setShowModal(false);
        await fetchPlans();
      } else {
        setError("Failed to create plan");
      }
    } catch (err) {
      setError("Error creating plan: " + err.message);
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  /* ================= UPDATE PLAN ================= */
  const handleUpdatePlan = async (planId, updatedData) => {
    try {
      setError("");

      const response = await fetch(`${API_BASE}/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchPlans();
      } else {
        setError("Failed to update plan");
      }
    } catch (err) {
      setError("Error updating plan: " + err.message);
      console.error(err);
    }
  };

  /* ================= DELETE PLAN ================= */
  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;

    try {
      setDeleting(planId);
      setError("");

      const response = await fetch(`${API_BASE}/${planId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchPlans();
      } else {
        setError("Failed to delete plan");
      }
    } catch (err) {
      setError("Error deleting plan: " + err.message);
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <Toast toasts={toasts} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          sidebarOpen ? "lg:ml-60" : "ml-0"
        }`}
      >
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {/* ERROR MESSAGE */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Subscription Plans
            </h2>
            <button
              onClick={() => setShowModal(true)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium w-fit"
            >
              <Plus size={18} />
              Create Plan
            </button>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="bg-white rounded-lg border overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 border-b bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : plans.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto bg-white border rounded-lg shadow-sm">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Plan Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Price Per Day</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Created At</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {plans.map((plan) => (
                      <tr key={plan.planId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{plan.planName}</td>
                        <td className="px-6 py-4">₹ {plan.pricePerDay} / day</td>
                        <td className="px-6 py-4">
                          {new Date(plan.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeletePlan(plan.planId)}
                            disabled={deleting === plan.planId}
                            className="text-red-600 font-medium"
                          >
                            {deleting === plan.planId ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {plans.map((plan) => (
                  <div key={plan.planId} className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{plan.planName}</p>
                        <p className="text-red-600 font-bold text-lg">
                          ₹{plan.pricePerDay}
                          <span className="text-sm text-gray-400 font-normal"> / day</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(plan.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(plan.planId)}
                        disabled={deleting === plan.planId}
                        className="text-red-600 text-sm font-medium shrink-0 border border-red-200 px-3 py-1 rounded-lg"
                      >
                        {deleting === plan.planId ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* EMPTY STATE */}
          {!loading && plans.length === 0 && (
            <div className="text-center mt-10 text-gray-400">
              No Plans Found
            </div>
          )}
        </main>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 sm:p-8 transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Create New Plan</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Plan Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Premium Monthly"
                />
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Day</label>
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  placeholder="₹0.00"
                  type="number"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlan}
                  disabled={creating}
                  className="flex-1 px-4 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlans;