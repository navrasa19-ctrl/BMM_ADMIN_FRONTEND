import React, { useState, useEffect } from "react";
import {
    Search,
    X,
  Eye,
    Plus,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  CreditCard,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { db } from "../firebase.js";
import { collection, getDocs } from "firebase/firestore";

const BASE_URL = import.meta.env.VITE_API_URL || "https://swap-street-backend-941l.onrender.com";

const UserWallet = () => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [wallets, setWallets] = useState([]);
  const [filteredWallets, setFilteredWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetails, setWalletDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsData, setAddFundsData] = useState({
    amount: "",
    reason: "",
  });
  const [addingFunds, setAddingFunds] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [adminFundHistory, setAdminFundHistory] = useState([]);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Initialize sidebar state
  React.useEffect(() => {
    const initializeSidebar = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    };

    initializeSidebar();

    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch all wallets and user profiles
    useEffect(() => {
    fetchUserProfiles();
    fetchWallets();
    }, []);

  // Filter and sort wallets
  useEffect(() => {
    filterAndSortWallets();
  }, [wallets, searchQuery, sortOrder]);

  // Fetch user profiles from Firebase
  const fetchUserProfiles = async () => {
    try {
      const profilesSnapshot = await getDocs(collection(db, "seller_profiles"));
      const profilesMap = {};

      profilesSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const userId = docSnapshot.id;
        profilesMap[userId] = {
          id: userId,
          username: data.profileInfo?.username || "Unknown User",
          email: data.auth?.email || "N/A",
          phone: data.auth?.phone || "N/A",
                };
            });
            
      setUserProfiles(profilesMap);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
    }
  };

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return "N/A";
    return userProfiles[userId]?.username || "Unknown User";
  };

  // Get user email by ID
  const getUserEmail = (userId) => {
    if (!userId) return "N/A";
    return userProfiles[userId]?.email || "N/A";
  };

  // Fetch all wallets
  const fetchWallets = async () => {
    try {
      setLoading(true);
      const API_URL = `${BASE_URL}/api/adminWallet/wallets`;

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.wallets)) {
        setWallets(data.wallets);
      } else {
        setWallets([]);
      }
        } catch (error) {
      console.error("Error fetching wallets:", error);
      setWallets([]);
        } finally {
            setLoading(false);
        }
    };

  // Fetch wallet details
  const fetchWalletDetails = async (userId) => {
    try {
      setLoadingDetails(true);
      const API_URL = `${BASE_URL}/api/adminWallet/wallet/${userId}`;

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        setWalletDetails(data);
      } else {
        setWalletDetails(null);
      }
    } catch (error) {
      console.error("Error fetching wallet details:", error);
      setWalletDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async (userId) => {
    try {
      setLoadingTransactions(true);
      const API_URL = `${BASE_URL}/api/adminWallet/wallet/${userId}/transactions`;

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        
        // Track admin fund additions
        const adminCredits = data.transactions.filter(
          (txn) => txn.type === "admin_credit" && txn.createdBy === "admin"
        );
        setAdminFundHistory(adminCredits);
      } else {
        setTransactions([]);
        setAdminFundHistory([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
      setAdminFundHistory([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Add funds to wallet
  const handleAddFunds = async () => {
    if (!addFundsData.amount || !addFundsData.reason) {
      alert("Please fill all fields");
      return;
    }

    if (parseFloat(addFundsData.amount) <= 0) {
      alert("Amount must be greater than 0");
            return;
        }

        try {
      setAddingFunds(true);
      const API_URL = `${BASE_URL}/api/adminWallet/wallet/${selectedWallet.userId}/add-funds`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(addFundsData.amount),
          reason: addFundsData.reason,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        alert("Funds added successfully!");
        setShowAddFunds(false);
        setAddFundsData({ amount: "", reason: "" });
        // Refresh wallet details and transactions
        await fetchWalletDetails(selectedWallet.userId);
        await fetchTransactions(selectedWallet.userId);
        await fetchWallets(); // Refresh the list
      } else {
        alert("Failed to add funds: " + (data.message || "Unknown error"));
      }
        } catch (error) {
      console.error("Error adding funds:", error);
      alert("Failed to add funds: " + error.message);
    } finally {
      setAddingFunds(false);
    }
  };

  // Filter and sort wallets
  const filterAndSortWallets = () => {
    let filtered = [...wallets];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (wallet) =>
          wallet.userId?.toLowerCase().includes(q) ||
          getUserName(wallet.userId).toLowerCase().includes(q) ||
          getUserEmail(wallet.userId).toLowerCase().includes(q) ||
          wallet.email?.toLowerCase().includes(q) ||
          wallet.referralCode?.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = convertTimestamp(a.createdAt);
      const dateB = convertTimestamp(b.createdAt);
      return sortOrder === "latest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredWallets(filtered);
  };

  // Convert timestamp
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return 0;
    if (timestamp._seconds) {
      return timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000;
    }
    return new Date(timestamp).getTime();
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = convertTimestamp(timestamp);
    return new Date(date).toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `د.إ${amount?.toFixed(2) || "0.00"}`;
  };

  // Handle view wallet
  const handleViewWallet = async (wallet) => {
    setSelectedWallet(wallet);
    await Promise.all([
      fetchWalletDetails(wallet.userId),
      fetchTransactions(wallet.userId),
    ]);
  };

  // Calculate total stats
  const calculateTotalStats = () => {
    return filteredWallets.reduce(
      (acc, wallet) => ({
        totalEarnings: acc.totalEarnings + (wallet.totalEarnings || 0),
        totalBalance: acc.totalBalance + (wallet.availableBalance || 0),
        totalPending: acc.totalPending + (wallet.pendingPayouts || 0),
        totalReferralPoints: acc.totalReferralPoints + (wallet.referralPoints || 0),
      }),
      { totalEarnings: 0, totalBalance: 0, totalPending: 0, totalReferralPoints: 0 }
    );
  };

  const totalStats = calculateTotalStats();

  // Get transaction type badge
  const getTransactionTypeBadge = (type) => {
    const typeLower = type?.toLowerCase() || "";
    if (typeLower.includes("credit") || typeLower.includes("income")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <ArrowUpRight size={12} />
          Credit
        </span>
      );
    } else if (typeLower.includes("debit") || typeLower.includes("payout")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <ArrowDownRight size={12} />
          Debit
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          {type || "N/A"}
        </span>
      );
    }
  };

    return (
    <div className="min-h-screen bg-white flex">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden" 
                    onClick={toggleSidebar}
                />
            )}
            
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-60" : "ml-0"
        }`}
      >
                <TopBar toggleSidebar={toggleSidebar} />
                
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-primaryDarkBlue">
                  User Wallets
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  Manage and track all user wallets and transactions
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalStats.totalEarnings)}
                </p>
              </div>
              <div className="bg-primaryDarkBlue/10 border-2 border-primaryDarkBlue/30 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-primaryDarkBlue">
                  {formatCurrency(totalStats.totalBalance)}
                </p>
              </div>
              <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Pending Payouts</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalStats.totalPending)}
                </p>
              </div>
              <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Referral Points</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalStats.totalReferralPoints}
                </p>
              </div>
            </div>
                </div>

          {/* Filter Bar */}
          <div className="w-full bg-white border-2 border-primaryDarkBlue/20 rounded-lg p-4 shadow-md mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Search */}
              <div className="flex items-center border-2 border-primaryDarkBlue/30 rounded-md px-3 py-2 focus-within:border-golden transition-colors">
                <Search size={18} className="text-primaryDarkBlue mr-2" />
                    <input
                        type="text"
                  placeholder="Search by user, email, referral code..."
                  className="flex-1 text-sm outline-none text-primaryDarkBlue placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

              {/* Sort */}
              <select
                className="border-2 border-primaryDarkBlue/30 rounded-md px-3 py-2 text-sm outline-none text-primaryDarkBlue focus:border-golden transition-colors"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Wallets Table */}
          <div className="border-2 border-primaryDarkBlue/20 rounded-xl p-4 sm:p-6 bg-white shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primaryDarkBlue text-white">
                    <th className="py-3 px-4 text-left font-semibold">User</th>
                    <th className="py-3 px-4 text-left font-semibold">Email</th>
                    <th className="py-3 px-4 text-center font-semibold">Total Earnings</th>
                    <th className="py-3 px-4 text-center font-semibold">Available Balance</th>
                    <th className="py-3 px-4 text-center font-semibold">Pending Payouts</th>
                    <th className="py-3 px-4 text-center font-semibold">Referral Points</th>
                    <th className="py-3 px-4 text-center font-semibold">Referral Code</th>
                    <th className="py-3 px-4 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {loading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-500">
                        Loading wallets...
                      </td>
                    </tr>
                  ) : filteredWallets.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-500">
                        No wallets found.
                      </td>
                    </tr>
                  ) : (
                    filteredWallets.map((wallet) => (
                      <tr
                        key={wallet.userId}
                        className="border-b hover:bg-golden/5 transition-all"
                      >
                        <td className="py-3 px-4 text-primaryDarkBlue">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                              {getUserName(wallet.userId)}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {wallet.userId?.substring(0, 8)}...
                                        </span>
                                    </div>
                        </td>
                        <td className="py-3 px-4 text-primaryDarkBlue">
                          {getUserEmail(wallet.userId) !== "N/A"
                            ? getUserEmail(wallet.userId)
                            : wallet.email || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-green-600">
                          {formatCurrency(wallet.totalEarnings || 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-primaryDarkBlue">
                          {formatCurrency(wallet.availableBalance || 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-orange-600">
                          {formatCurrency(wallet.pendingPayouts || 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-purple-600">
                          {wallet.referralPoints || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {wallet.referralCode || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewWallet(wallet)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#081F5C] text-white rounded-md hover:bg-[#081F5C]/90 transition-colors text-xs font-medium"
                          >
                            <Eye size={14} />
                            View
                          </button> 
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wallet Details Modal */}
          {selectedWallet && (
            <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl relative max-h-[90vh] overflow-y-auto border-2 border-primaryDarkBlue/20">
                <button
                  onClick={() => {
                    setSelectedWallet(null);
                    setWalletDetails(null);
                    setTransactions([]);
                    setAdminFundHistory([]);
                  }}
                  className="absolute top-4 right-4 text-primaryDarkBlue hover:text-golden transition-colors z-10"
                >
                  <X size={24} />
                </button>

                <div className="p-6">
                  <h2 className="text-xl font-bold text-primaryDarkBlue mb-6">
                    Wallet Details
                  </h2>

                  {loadingDetails ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading wallet details...
                    </div>
                  ) : walletDetails ? (
                    <div className="space-y-6">
                      {/* User Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-primaryDarkBlue/5 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">User Name</p>
                          <p className="text-sm font-semibold text-primaryDarkBlue">
                            {getUserName(selectedWallet.userId)}
                          </p>
                        </div>
                        <div className="bg-primaryDarkBlue/5 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Email</p>
                          <p className="text-sm font-semibold text-primaryDarkBlue">
                            {getUserEmail(selectedWallet.userId) !== "N/A"
                              ? getUserEmail(selectedWallet.userId)
                              : walletDetails.user?.email || "N/A"}
                          </p>
                        </div>
                        <div className="bg-primaryDarkBlue/5 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">User ID</p>
                          <p className="text-xs font-mono text-primaryDarkBlue">
                            {selectedWallet.userId}
                          </p>
                        </div>
                      </div>

                      {/* Wallet Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1">Total Earnings</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(walletDetails.wallet?.totalEarnings || 0)}
                          </p>
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1">Lifetime Earnings</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(walletDetails.wallet?.lifetimeEarnings || 0)}
                          </p>
                        </div>
                        <div className="bg-primaryDarkBlue/10 border-2 border-primaryDarkBlue/30 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1">Available Balance</p>
                          <p className="text-lg font-bold text-primaryDarkBlue">
                            {formatCurrency(walletDetails.wallet?.availableBalance || 0)}
                          </p>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1">Pending Payouts</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(walletDetails.wallet?.pendingPayouts || 0)}
                          </p>
                        </div>
                                    </div>

                      {/* Referral Info */}
                      {walletDetails.referral && (
                        <div className="bg-golden/10 border-2 border-golden/30 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-primaryDarkBlue mb-3">
                            Referral Information
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Referral Code</p>
                              <p className="font-mono font-semibold text-primaryDarkBlue">
                                {walletDetails.referral.referralCode || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Available Points</p>
                              <p className="font-semibold text-primaryDarkBlue">
                                {walletDetails.referral.availablePoints || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Total Earned</p>
                              <p className="font-semibold text-green-600">
                                {walletDetails.referral.totalEarned || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Total Redeemed</p>
                              <p className="font-semibold text-orange-600">
                                {walletDetails.referral.totalRedeemed || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Add Funds Button */}
                      <div className="flex justify-end">
                                        <button
                          onClick={() => setShowAddFunds(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#081F5C] text-white rounded-md hover:bg-golden/90 transition-colors font-medium"
                                        >
                          <Plus size={18} />
                          Add Funds
                                        </button>
                      </div>

                      {/* Admin Fund History */}
                      {adminFundHistory.length > 0 && (
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-primaryDarkBlue mb-3">
                            Admin Fund Additions ({adminFundHistory.length})
                          </h3>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {adminFundHistory.map((txn, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-3 rounded border border-purple-200"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-semibold text-primaryDarkBlue">
                                      {formatCurrency(txn.amount)}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {txn.reason || "No reason provided"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">
                                      {formatDate(txn.createdAt || txn.date)}
                                    </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                          </div>
                    </div>
                )}

                      {/* Transactions */}
                      <div>
                        <h3 className="text-lg font-semibold text-primaryDarkBlue mb-4">
                          Transaction History ({transactions.length})
                        </h3>
                        {loadingTransactions ? (
                    <div className="text-center py-8 text-gray-500">
                            Loading transactions...
                          </div>
                        ) : transactions.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-2 border-primaryDarkBlue/20">
                              <thead>
                                <tr className="bg-primaryDarkBlue text-white">
                                  <th className="py-2 px-3 text-left">Date</th>
                                  <th className="py-2 px-3 text-left">Type</th>
                                  <th className="py-2 px-3 text-left">Reason/Order</th>
                                  <th className="py-2 px-3 text-right">Amount</th>
                                  <th className="py-2 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transactions.map((txn, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b hover:bg-golden/5 transition"
                                  >
                                    <td className="py-2 px-3 text-gray-600">
                                      {formatDate(txn.createdAt || txn.date)}
                                    </td>
                                    <td className="py-2 px-3">
                                      {getTransactionTypeBadge(txn.type)}
                                    </td>
                                    <td className="py-2 px-3 text-gray-700">
                                      {txn.reason || txn.orderId || txn.title || "N/A"}
                                    </td>
                                    <td
                                      className={`py-2 px-3 text-right font-semibold ${
                                        txn.type?.includes("credit") ||
                                        txn.type?.includes("income")
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {txn.type?.includes("credit") ||
                                      txn.type?.includes("income")
                                        ? "+"
                                        : "-"}
                                      {formatCurrency(txn.amount || 0)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                          txn.status === "Success"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {txn.status || "N/A"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            No transactions found.
                    </div>
                )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Failed to load wallet details.
                    </div>
                  )}
                            </div>
                        </div>
                    </div>
                )}

          {/* Add Funds Modal */}
          {showAddFunds && selectedWallet && (
            <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative border-2 border-primaryDarkBlue/20">
                            <button
                  onClick={() => {
                    setShowAddFunds(false);
                    setAddFundsData({ amount: "", reason: "" });
                  }}
                  className="absolute top-4 right-4 text-primaryDarkBlue hover:text-golden transition-colors"
                >
                  <X size={24} />
                            </button>

                <div className="p-6">
                  <h2 className="text-xl font-bold text-primaryDarkBlue mb-4">
                    Add Funds to Wallet
                  </h2>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      User: <span className="font-semibold">{getUserName(selectedWallet.userId)}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Current Balance: {formatCurrency(selectedWallet.availableBalance || 0)}
                    </p>
                                </div>

                  <div className="space-y-4">
                                    <div>
                      <label className="block text-sm font-medium text-primaryDarkBlue mb-1">
                        Amount (د.إ)
                      </label>
                                        <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Enter amount"
                        className="w-full px-4 py-2 border-2 border-primaryDarkBlue/30 rounded-md focus:border-golden outline-none"
                        value={addFundsData.amount}
                                            onChange={(e) =>
                          setAddFundsData({ ...addFundsData, amount: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div>
                      <label className="block text-sm font-medium text-primaryDarkBlue mb-1">
                        Reason
                      </label>
                      <textarea
                        placeholder="Enter reason for adding funds (e.g., Manual compensation, Refund, Bonus)"
                        className="w-full px-4 py-2 border-2 border-primaryDarkBlue/30 rounded-md focus:border-golden outline-none"
                        rows="3"
                        value={addFundsData.reason}
                                            onChange={(e) =>
                          setAddFundsData({ ...addFundsData, reason: e.target.value })
                                            }
                                        />
                                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowAddFunds(false);
                          setAddFundsData({ amount: "", reason: "" });
                        }}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                                <button
                        onClick={handleAddFunds}
                        disabled={addingFunds}
                        className="flex-1 px-4 py-2 bg-golden text-white rounded-md hover:bg-golden/90 transition-colors disabled:opacity-50"
                                >
                        {addingFunds ? "Adding..." : "Add Funds"}
                                </button>
                    </div>
                  </div>
                            </div>
                        </div>
                    </div>
                )}
                </main>
            </div>
        </div>
    );
};

export default UserWallet;
