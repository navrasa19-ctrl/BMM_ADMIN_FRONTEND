import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Search, Gift, TrendingUp, Users } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { db } from "../firebase.js";
import {
    collection,
    getDocs,
} from "firebase/firestore";

const BASE_URL = import.meta.env.VITE_API_URL || "https://swap-street-backend-941l.onrender.com";

const Referrals = () => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [expandedUser, setExpandedUser] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("Latest");
    const [referralData, setReferralData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfiles, setUserProfiles] = useState({});
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
                    city: data.profileInfo?.city || data.address?.city || "N/A",
                };
            });
            
            setUserProfiles(profilesMap);
            return profilesMap;
        } catch (error) {
            console.error("Error fetching user profiles:", error);
            return {};
        }
    };

    // Convert timestamp to Date
    const convertTimestamp = (timestamp) => {
        if (!timestamp) return null;
        if (timestamp._seconds) {
            return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
        }
        if (typeof timestamp === 'string') {
            return new Date(timestamp);
        }
        return new Date(timestamp);
    };

    // Fetch all referral data from API
    const fetchReferralData = async () => {
        try {
            setLoading(true);

            // Fetch user profiles first
            const profilesMap = await fetchUserProfiles();

            // Fetch referral data from API
            const API_URL = `${BASE_URL}/api/adminreferal/get`;
            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const apiData = await response.json();

            if (apiData.success && Array.isArray(apiData.data)) {
                // Merge API data with Firebase profile data
                const combinedData = apiData.data.map((item) => {
                    const userId = item.userId;
                    const profile = profilesMap[userId] || {};

                    // Convert transaction timestamps
                    const transactions = (item.transactions || []).map((txn) => ({
                        ...txn,
                        createdAt: convertTimestamp(txn.createdAt),
                        expiryAt: convertTimestamp(txn.expiryAt),
                    }));

                    return {
                        id: userId,
                        userId: userId,
                        referralCode: item.referralCode || "N/A",
                        totalEarned: item.totalEarned || 0,
                        totalRedeemed: item.totalRedeemed || 0,
                        availablePoints: item.availablePoints || 0,
                        signupRewardGiven: item.signupRewardGiven || false,
                        referralCount: item.referralCount || 0,
                        referredBy: item.referredBy || null,
                        createdAt: convertTimestamp(item.createdAt),
                        // Use Firebase profile data if API has "Unknown" or "N/A"
                        username: item.username === "Unknown" || !item.username 
                            ? (profile.username || "Unknown User")
                            : item.username,
                        email: item.email === "N/A" || !item.email
                            ? (profile.email || "N/A")
                            : item.email,
                        phone: item.phone === "N/A" || !item.phone
                            ? (profile.phone || "N/A")
                            : item.phone,
                        city: item.city === "N/A" || !item.city
                            ? (profile.city || "N/A")
                            : item.city,
                        // Transactions
                        transactions: transactions,
                    };
                });

                setReferralData(combinedData);
            } else {
                setReferralData([]);
            }
        } catch (error) {
            console.error("Error fetching referral data:", error);
            setReferralData([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch single user details
    const fetchUserDetails = async (userId) => {
        try {
            setLoadingDetails(true);
            const API_URL = `${BASE_URL}/api/adminreferal/get/${userId}`;
            
            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const apiData = await response.json();

            if (apiData.success && apiData.data) {
                const item = apiData.data;
                const profile = userProfiles[userId] || {};

                // Convert transaction timestamps
                const transactions = (item.transactions || []).map((txn) => ({
                    ...txn,
                    createdAt: convertTimestamp(txn.createdAt),
                    expiryAt: convertTimestamp(txn.expiryAt),
                }));

                const userDetails = {
                    ...item,
                    createdAt: convertTimestamp(item.createdAt),
                    username: item.username === "Unknown" || !item.username 
                        ? (profile.username || "Unknown User")
                        : item.username,
                    email: item.email === "N/A" || !item.email
                        ? (profile.email || "N/A")
                        : item.email,
                    phone: item.phone === "N/A" || !item.phone
                        ? (profile.phone || "N/A")
                        : item.phone,
                    city: item.city === "N/A" || !item.city
                        ? (profile.city || "N/A")
                        : item.city,
                    transactions: transactions,
                };

                setSelectedUserDetails(userDetails);
            } else {
                setSelectedUserDetails(null);
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            setSelectedUserDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchReferralData();
    }, []);

    // Fetch user details when selected user changes
    useEffect(() => {
        if (selectedUser) {
            fetchUserDetails(selectedUser.userId);
        }
    }, [selectedUser, userProfiles]);

    const filteredData = useMemo(() => {
        return referralData
            .filter((item) => {
                const searchLower = search.toLowerCase();

                const username = (item.username ?? "").toLowerCase();
                const email = (item.email ?? "").toLowerCase();
                const phone = (item.phone ?? "").toLowerCase();
                const referralCode = (item.referralCode ?? "").toLowerCase();

                return (
                    username.includes(searchLower) ||
                    email.includes(searchLower) ||
                    phone.includes(searchLower) ||
                    referralCode.includes(searchLower)
                );
            })

            .sort((a, b) => {
                if (sort === "Latest") {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                } else {
                    return new Date(a.createdAt) - new Date(b.createdAt);
                }
            });
    }, [search, sort, referralData]);

    const formatDate = (date) => {
        if (!date) return "N/A";
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return "N/A";
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatDateTime = (date) => {
        if (!date) return "N/A";
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return "N/A";
        return d.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-60" : "ml-0"}`}
            >
                <TopBar toggleSidebar={toggleSidebar} />

                <main className="flex-1 p-6 overflow-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold text-[#0A1E3A]">
                            Referral Management
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading referrals...</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-4 mb-6">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search
                                        size={18}
                                        className="absolute left-3 top-3 text-gray-400"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, phone, or referral code..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    />
                                </div>

                                <select
                                    className="p-2 border rounded-lg"
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                >
                                    <option value="Latest">Latest First</option>
                                    <option value="Oldest">Oldest First</option>
                                </select>
                            </div>

                            {filteredData.length === 0 ? (
                                <div className="bg-white rounded-xl border p-12 text-center">
                                    <div className="text-gray-400 mb-4">
                                        <Gift className="w-16 h-16 mx-auto" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        No Referrals Found
                                    </h3>
                                    <p className="text-gray-500">
                                        {search
                                            ? "No matching referrals found. Try a different search."
                                            : "No referral data available."}
                                    </p>
                                </div>
                            ) : (
                                filteredData.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white shadow rounded-xl border p-5 mb-6"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold">
                                                        {item.username}
                                                    </h3>
                                                    {item.referralCount > 0 && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                            {item.referralCount} Referral{item.referralCount !== 1 ? "s" : ""}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm">{item.email}</p>
                                                <p className="text-gray-500 text-xs mt-1">
                                                    Phone: {item.phone} | City: {item.city}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setSelectedUser(item)}
                                                    className="px-3 py-1.5 bg-[#081F5C] text-white rounded-lg text-xs sm:text-sm transition-colors hover:bg-[#081F5C]"
                                                >
                                                    View Details
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        setExpandedUser(
                                                            expandedUser === item.id ? null : item.id
                                                        )
                                                    }
                                                    className="p-2 rounded-lg border"
                                                >
                                                    {expandedUser === item.id ? (
                                                        <ChevronUp size={18} />
                                                    ) : (
                                                        <ChevronDown size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Referral Code</p>
                                                <p className="font-semibold text-[#0A1E3A]">
                                                    {item.referralCode}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                                                <p className="font-semibold text-green-600">
                                                    {item.totalEarned} pts
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Total Redeemed</p>
                                                <p className="font-semibold text-orange-600">
                                                    {item.totalRedeemed} pts
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Available Points</p>
                                                <p className="font-semibold text-[#081F5C]">
                                                    {item.availablePoints} pts
                                                </p>
                                            </div>
                                        </div>

                                        {/* Referrer Info */}
                                        {item.referrerInfo && (
                                            <div className="mt-4 pt-4 border-t">
                                                <p className="text-xs text-gray-500 mb-1">Referred By</p>
                                                <p className="text-sm">
                                                    <span className="font-semibold">
                                                        {item.referrerInfo.username}
                                                    </span>{" "}
                                                    ({item.referrerInfo.email})
                                                </p>
                                                {item.referredByCode && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Code: {item.referredByCode}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {expandedUser === item.id && (
                                            <div className="mt-4 border-t pt-4">
                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <TrendingUp size={16} />
                                                    Points Transactions
                                                </h4>
                                                {item.transactions.length === 0 ? (
                                                    <p className="text-gray-500 italic">
                                                        No transactions found.
                                                    </p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm border-collapse">
                                                            <thead>
                                                                <tr className="bg-gray-100 text-gray-700">
                                                                    <th className="p-3 text-left">Date</th>
                                                                    <th className="p-3 text-left">Title</th>
                                                                    <th className="p-3 text-left">Category</th>
                                                                    <th className="p-3 text-left">Type</th>
                                                                    <th className="p-3 text-left">Points</th>
                                                                    <th className="p-3 text-left">Status</th>
                                                                </tr>
                                                            </thead>

                                                            <tbody>
                                                                {item.transactions.map((txn, i) => (
                                                                    <tr
                                                                        key={i}
                                                                        className="border-b hover:bg-gray-50 transition"
                                                                    >
                                                                        <td className="p-3 text-gray-600">
                                                                            {formatDateTime(txn.createdAt)}
                                                                        </td>
                                                                        <td className="p-3 text-gray-700">
                                                                            {txn.title || "N/A"}
                                                                        </td>
                                                                        <td className="p-3 text-gray-700">
                                                                            {txn.category || "N/A"}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <span
                                                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${txn.type === "credit"
                                                                                        ? "bg-green-100 text-green-700"
                                                                                        : "bg-red-100 text-red-700"
                                                                                    }`}
                                                                            >
                                                                                {txn.type || "N/A"}
                                                                            </span>
                                                                        </td>
                                                                        <td
                                                                            className={`p-3 font-semibold ${txn.type === "credit"
                                                                                    ? "text-green-600"
                                                                                    : "text-red-600"
                                                                                }`}
                                                                        >
                                                                            {txn.type === "credit" ? "+" : "-"}
                                                                            {txn.points || 0}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <span
                                                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${txn.expired
                                                                                        ? "bg-red-100 text-red-700"
                                                                                        : "bg-green-100 text-green-700"
                                                                                    }`}
                                                                            >
                                                                                {txn.expired ? "Expired" : "Active"}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {/* Detailed View Modal */}
                    {selectedUser && (
                        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
                            <div className="bg-white w-full max-w-2xl rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
                                <button
                                    onClick={() => {
                                        setSelectedUser(null);
                                        setSelectedUserDetails(null);
                                    }}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>

                                <h2 className="text-xl font-semibold mb-4">Referral Details</h2>

                                {loadingDetails ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-3 text-gray-600">Loading details...</span>
                                    </div>
                                ) : selectedUserDetails ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">User Information</h3>
                                            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                                <p>
                                                    <strong>Name:</strong> {selectedUserDetails.username}
                                                </p>
                                                <p>
                                                    <strong>Email:</strong> {selectedUserDetails.email}
                                                </p>
                                                <p>
                                                    <strong>Phone:</strong> {selectedUserDetails.phone}
                                                </p>
                                                <p>
                                                    <strong>City:</strong> {selectedUserDetails.city}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">Referral Statistics</h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-green-50 p-4 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                                                    <p className="text-xl font-bold text-green-600">
                                                        {selectedUserDetails.totalEarned} pts
                                                    </p>
                                                </div>
                                                <div className="bg-orange-50 p-4 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Total Redeemed</p>
                                                    <p className="text-xl font-bold text-orange-600">
                                                        {selectedUserDetails.totalRedeemed} pts
                                                    </p>
                                                </div>
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Available Points</p>
                                                    <p className="text-xl font-bold text-blue-600">
                                                        {selectedUserDetails.availablePoints} pts
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">Referral Code</h3>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="font-mono text-lg font-semibold">
                                                    {selectedUserDetails.referralCode}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Created: {formatDate(selectedUserDetails.createdAt)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Signup Reward:{" "}
                                                    {selectedUserDetails.signupRewardGiven ? "Given ✓" : "Not Given"}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedUserDetails.referredBy && (
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2">Referred By</h3>
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-600">
                                                        User ID: {selectedUserDetails.referredBy}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <Users size={16} />
                                                Referrals Made ({selectedUserDetails.referralCount || 0})
                                            </h3>
                                            {(selectedUserDetails.referralCount || 0) > 0 ? (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm">
                                                        This user has referred{" "}
                                                        <strong>{selectedUserDetails.referralCount}</strong> user
                                                        {selectedUserDetails.referralCount !== 1 ? "s" : ""}.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500">
                                                        This user hasn't referred anyone yet.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-gray-700 mb-2">
                                                All Transactions ({selectedUserDetails.transactions?.length || 0})
                                            </h3>
                                            {selectedUserDetails.transactions && selectedUserDetails.transactions.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-100 text-gray-700">
                                                                <th className="p-2 text-left">Date</th>
                                                                <th className="p-2 text-left">Title</th>
                                                                <th className="p-2 text-left">Category</th>
                                                                <th className="p-2 text-left">Type</th>
                                                                <th className="p-2 text-left">Points</th>
                                                                <th className="p-2 text-left">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedUserDetails.transactions.map((txn, i) => (
                                                                <tr
                                                                    key={i}
                                                                    className="border-b hover:bg-gray-50 transition"
                                                                >
                                                                    <td className="p-2 text-gray-600">
                                                                        {formatDateTime(txn.createdAt)}
                                                                    </td>
                                                                    <td className="p-2 text-gray-700">
                                                                        {txn.title || "N/A"}
                                                                    </td>
                                                                    <td className="p-2 text-gray-700">
                                                                        {txn.category || "N/A"}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <span
                                                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${txn.type === "credit"
                                                                                    ? "bg-green-100 text-green-700"
                                                                                    : "bg-red-100 text-red-700"
                                                                                }`}
                                                                        >
                                                                            {txn.type || "N/A"}
                                                                        </span>
                                                                    </td>
                                                                    <td
                                                                        className={`p-2 font-semibold ${txn.type === "credit"
                                                                                ? "text-green-600"
                                                                                : "text-red-600"
                                                                            }`}
                                                                    >
                                                                        {txn.type === "credit" ? "+" : "-"}
                                                                        {txn.points || 0}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <span
                                                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${txn.expired
                                                                                    ? "bg-red-100 text-red-700"
                                                                                    : "bg-green-100 text-green-700"
                                                                                }`}
                                                                        >
                                                                            {txn.expired ? "Expired" : "Active"}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500">No transactions found.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Failed to load user details.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Referrals;
