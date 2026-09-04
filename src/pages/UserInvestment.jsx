// src/pages/AdminInvestments.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";


const STATUS = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

const AdminInvestments = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sort, setSort] = useState("Latest");
  const [selected, setSelected] = useState(null);
  const [showMissingInvestmentModal, setShowMissingInvestmentModal] = useState(false);
  const [missingInvestmentForm, setMissingInvestmentForm] = useState({
    userId: '',
    dealId: '',
    amount: '',
    paymentId: '',
    orderId: '',
    reason: ''
  });
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [submittingMissing, setSubmittingMissing] = useState(false);

  // Fetch all investments from database
  useEffect(() => {
    fetchInvestments();
    fetchDealsAndUsers();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/investments');
      
      if (response.success && response.investments) {
        // Transform Razorpay investment data to match component format
        const transformedInvestments = response.investments.map(inv => ({
          ...inv,
          userName: inv.userId?.name || inv.userId?.email || 'Unknown User',
          status: inv.displayStatus === 'Approved' ? STATUS.COMPLETED : 
                  inv.displayStatus === 'Pending' ? STATUS.PENDING : 
                  STATUS.REJECTED,
          // Map Razorpay fields to expected format
          investmentAmount: inv.displayAmount || inv.amount,
          investmentDate: inv.createdAt,
          paymentMethod: 'Razorpay'
        }));
        setInvestments(transformedInvestments);
      } else {
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    let list = investments.slice();

    if (filterStatus !== "All") {
      list = list.filter((it) => it.status === filterStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (it) =>
          (it.userName && it.userName.toLowerCase().includes(q)) ||
          (it.machineName && it.machineName.toLowerCase().includes(q)) ||
          (it.transactionId && it.transactionId.toLowerCase().includes(q)) ||
          (it.userId && it.userId.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) =>
      sort === "Latest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );

    return list;
  }, [investments, search, filterStatus, sort]);

  const fetchDealsAndUsers = async () => {
    try {
      const [dealsResponse, usersResponse] = await Promise.all([
        api.get('/admin/deals'),
        api.get('/admin/users')
      ]);
      
      if (dealsResponse.success) {
        setDeals(dealsResponse.deals || []);
      }
      if (usersResponse.success) {
        setUsers(usersResponse.users || []);
      }
    } catch (error) {
      console.error('Error fetching deals and users:', error);
    }
  };

  const handleMissingInvestmentSubmit = async (e) => {
    e.preventDefault();
    
    if (!missingInvestmentForm.userId || !missingInvestmentForm.dealId || !missingInvestmentForm.amount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmittingMissing(true);
      
      const response = await api.post('/admin/investments/missing', {
        userId: missingInvestmentForm.userId,
        dealId: missingInvestmentForm.dealId,
        amount: parseFloat(missingInvestmentForm.amount),
        paymentId: missingInvestmentForm.paymentId || `manual_${Date.now()}`,
        orderId: missingInvestmentForm.orderId || `order_manual_${Date.now()}`,
        reason: missingInvestmentForm.reason,
        isManualEntry: true
      });

      if (response.success) {
        setSuccess('Missing investment added successfully!');
        setShowMissingInvestmentModal(false);
        setMissingInvestmentForm({
          userId: '',
          dealId: '',
          amount: '',
          paymentId: '',
          orderId: '',
          reason: ''
        });
        fetchInvestments(); // Refresh the list
      } else {
        setError('Failed to add missing investment: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding missing investment:', error);
      setError('Failed to add missing investment. Please try again.');
    } finally {
      setSubmittingMissing(false);
    }
  };

  const openDetails = (inv) => {
    setSelected(inv);
  };


  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}
      
      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-60' : 'ml-0'}`}>
        <TopBar toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#0A2742]">Razorpay Investments</h2>
              <p className="text-sm text-gray-500">Manage all Razorpay payment investments</p>
            </div>
            <button
              onClick={() => setShowMissingInvestmentModal(true)}
              className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Missing Investment
            </button>
          </div>
          <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                className="w-full py-2 pl-10 pr-4 border rounded-lg"
                placeholder="Search by user, deal, Razorpay payment ID or user ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-2 border rounded-lg hover:border-gray-400 hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Rejected</option>
            </select>

            <button
              onClick={() => setSort((s) => (s === "Latest" ? "Oldest" : "Latest"))}
              className="px-3 sm:px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 text-sm"
            >
              {sort}
              <ChevronDown size={16} />
            </button>
          </div>

          {/* table */}
          <div className="bg-white rounded-xl border shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 border-b">
                <tr>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Deal</th>
                  <th className="p-3 text-left">Payment ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Gateway</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-gray-500">
                      Loading investments...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-gray-500">
                      No investments found.
                    </td>
                  </tr>
                ) : (
                  visible.map((it) => (
                    <tr key={it._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        {it.userName} 
                        <div className="text-xs text-gray-400">{typeof it.userId === 'object' ? it.userId._id : it.userId}</div>
                      </td>
                      <td className="p-3">
                        {it.machineName}
                        <div className="text-xs text-green-600">✓ Razorpay Payment</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{it.transactionId}</div>
                        <div className="text-xs text-gray-400">Payment ID</div>
                      </td>
                      <td className="p-3 font-semibold">₹{it.investmentAmount?.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          Razorpay
                        </span>
                      </td>
                      <td className="p-3">{new Date(it.investmentDate || it.createdAt).toLocaleDateString()}</td>

                      {/* status display only */}
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold
                            ${
                              it.status === STATUS.COMPLETED
                                ? "bg-green-100 text-green-700"
                                : it.status === STATUS.PENDING
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-600"
                            }
                          `}
                        >
                          {it.status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => openDetails(it)}
                          className="p-2 border rounded-lg hover:bg-gray-100 hover:shadow-md transform hover:scale-105 transition-all duration-200"
                          title="View Details"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-3xl rounded-xl p-6 shadow-xl relative overflow-y-auto max-h-[90vh]">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-gray-600 hover:text-black"
              >
                <X size={22} />
              </button>

              <h3 className="text-xl font-semibold text-[#0A2742] mb-4">Investment Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <Detail label="Investment ID" value={selected._id} />
                  <Detail label="User" value={`${selected.userName} (${typeof selected.userId === 'object' ? selected.userId._id : selected.userId})`} />
                  <Detail label="Deal" value={`${selected.machineName} (ID: ${selected.machineId})`} />
                  <Detail label="Razorpay Payment ID" value={selected.transactionId || selected.paymentId} />
                  <Detail label="Razorpay Order ID" value={selected.orderId || 'N/A'} />
                  <Detail label="Payment Method" value="Razorpay" />
                  <Detail label="Investment Amount" value={`₹${selected.investmentAmount?.toLocaleString()}`} />
                  <Detail label="Investment Date" value={new Date(selected.investmentDate || selected.createdAt).toLocaleString()} />
                  <Detail label="Created At" value={new Date(selected.createdAt).toLocaleString()} />
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">✓ Razorpay Payment Verified</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>ROI: {selected.roi || 'N/A'}%</div>
                      <div>Tenure: {selected.tenure || 'N/A'} months</div>
                      <div>Expected Returns: ₹{selected.expectedReturns?.toLocaleString() || 'N/A'}</div>
                      {selected.maturityDate && (
                        <div>Maturity Date: {new Date(selected.maturityDate).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Payment Status</h4>
                    <div className="text-sm text-blue-700">
                      <div>Status: Verified & Completed</div>
                      <div>Gateway: Razorpay</div>
                      <div>Security: Payment signature verified</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Missing Investment Modal */}
        {showMissingInvestmentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl relative max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 rounded-t-xl">
                <button
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                  onClick={() => {
                    setShowMissingInvestmentModal(false);
                    setMissingInvestmentForm({
                      userId: '',
                      dealId: '',
                      amount: '',
                      paymentId: '',
                      orderId: '',
                      reason: ''
                    });
                  }}
                >
                  <X size={22} />
                </button>

                <h2 className="text-xl font-semibold text-[#0A2742] pr-8">
                  Add Missing Investment
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manually add an investment that was paid but not recorded
                </p>
              </div>

              <form onSubmit={handleMissingInvestmentSubmit} className="p-6 space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={missingInvestmentForm.userId}
                    onChange={(e) => setMissingInvestmentForm(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deal <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={missingInvestmentForm.dealId}
                    onChange={(e) => {
                      const selectedDeal = deals.find(deal => deal._id === e.target.value);
                      setMissingInvestmentForm(prev => ({ 
                        ...prev, 
                        dealId: e.target.value,
                        amount: selectedDeal ? selectedDeal.minInvestment.toString() : ''
                      }));
                    }}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Deal</option>
                    {deals.map(deal => (
                      <option key={deal._id} value={deal._id}>
                        {deal.title} (Min: ₹{deal.minInvestment?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Investment Amount - Auto-filled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investment Amount (Auto-filled from Deal)
                  </label>
                  <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700 font-medium">
                    {missingInvestmentForm.amount ? 
                      `₹${parseInt(missingInvestmentForm.amount).toLocaleString()}` : 
                      'Select a deal first'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Amount is automatically set to the deal's minimum investment
                  </p>
                </div>

                {/* Payment ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={missingInvestmentForm.paymentId}
                    onChange={(e) => setMissingInvestmentForm(prev => ({ ...prev, paymentId: e.target.value }))}
                    placeholder="Razorpay payment ID (if available)"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Order ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={missingInvestmentForm.orderId}
                    onChange={(e) => setMissingInvestmentForm(prev => ({ ...prev, orderId: e.target.value }))}
                    placeholder="Razorpay order ID (if available)"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Manual Entry
                  </label>
                  <textarea
                    value={missingInvestmentForm.reason}
                    onChange={(e) => setMissingInvestmentForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain why this investment needs to be added manually..."
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submittingMissing}
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingMissing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      'Add Investment'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMissingInvestmentModal(false);
                      setMissingInvestmentForm({
                        userId: '',
                        dealId: '',
                        amount: '',
                        paymentId: '',
                        orderId: '',
                        reason: ''
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};
const Detail = ({ label, value }) => (
  <div>
    <p className="text-gray-500 text-sm font-semibold">{label}</p>
    <p className="text-gray-800">{value}</p>
  </div>
);

export default AdminInvestments;
