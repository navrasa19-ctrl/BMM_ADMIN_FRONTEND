import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingBag,
  User,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

const BASE_URL = import.meta.env.VITE_API_URL || "https://swap-street-backend-941l.onrender.com";

const Chats = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    fetchChats();
  }, []);

  /* ================= FETCH CHATS (NO TOKEN REQUIRED) ================= */
  const fetchChats = async () => {
    try {
      setLoading(true);

      const API_URL =`${BASE_URL}/api/admin/admin/chats`;

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (Array.isArray(data.chats)) {
        const mappedChats = data.chats.map((chat) => {
          const buyer = {
            id: chat.buyerId,
            username:
              chat.buyerProfile?.profileInfo?.username || "Unknown Buyer",
            email: chat.buyerProfile?.auth?.email || "N/A",
            phone: chat.buyerProfile?.auth?.phone || "N/A",
            profileImage: chat.buyerProfile?.images?.profileImage || null,
          };

          const seller = {
            id: chat.sellerId,
            username:
              chat.sellerProfile?.profileInfo?.username || "Unknown Seller",
            email: chat.sellerProfile?.auth?.email || "N/A",
            phone: chat.sellerProfile?.auth?.phone || "N/A",
            profileImage: chat.sellerProfile?.images?.profileImage || null,
          };

          return {
            chatId: chat.chatId,
            buyerId: chat.buyerId,
            sellerId: chat.sellerId,
            buyer,
            seller,
            product: chat.product || {},
            productId: chat.product?.productId || "N/A",
            lastMessage: chat.lastMessage || "",
            lastMessageAt: chat.lastMessageAt || 0,
            createdAt: chat.createdAt || 0,
            offers: [],
            latestOffer: null,
          };
        });

        mappedChats.sort(
          (a, b) =>
            (b.lastMessageAt || b.createdAt) -
            (a.lastMessageAt || a.createdAt)
        );

        setChats(mappedChats);
      } else {
        setChats([]);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER ================= */
  const filteredChats = chats.filter((chat) => {
    const q = searchQuery.toLowerCase();

    const matchSearch =
      chat.buyer.username.toLowerCase().includes(q) ||
      chat.seller.username.toLowerCase().includes(q) ||
      chat.buyer.email.toLowerCase().includes(q) ||
      chat.seller.email.toLowerCase().includes(q) ||
      chat.productId.toLowerCase().includes(q);

    if (filterStatus === "all") return matchSearch;

    const status = chat.latestOffer?.status || "pending";
    return matchSearch && status === filterStatus;
  });

  /* ================= HELPERS ================= */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    if (status === "accepted") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getStatusIcon = (status) => {
    if (status === "accepted") return <CheckCircle size={16} />;
    if (status === "rejected") return <XCircle size={16} />;
    return <Clock size={16} />;
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all ${
          sidebarOpen ? "lg:ml-60" : ""
        }`}
      >
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-2xl font-bold mb-6">
            Chats & Offers Management
          </h2>

          {/* SEARCH + FILTER */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search buyer, seller, email, product ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* CHAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="col-span-full text-center text-gray-500">
                Loading chats...
              </p>
            ) : filteredChats.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">
                No chats found.
              </p>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.chatId}
                  className="bg-white p-5 rounded-xl border shadow hover:shadow-md"
                >
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Buyer</p>
                      <p className="font-semibold">{chat.buyer.username}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.buyer.email}
                      </p>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Seller</p>
                      <p className="font-semibold">{chat.seller.username}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.seller.email}
                      </p>
                    </div>
                  </div>

                  {chat.product && (
                    <div className="bg-gray-50 p-3 rounded mb-3">
                      <p className="text-sm font-semibold">
                        {chat.product.productTitle}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {chat.product.descriptions}
                      </p>
                      <p className="text-xs mt-1">
                        Price: د.إ{chat.product.originalPrice}
                      </p>
                    </div>
                  )}

                  {chat.lastMessage && (
                    <div className="bg-blue-50 p-3 rounded mb-3 text-sm">
                      {chat.lastMessage}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mb-3">
                    Last Updated:{" "}
                    {formatDate(chat.lastMessageAt || chat.createdAt)}
                  </p>

                  <button
                    onClick={() => setSelectedChat(chat)}
                    className="w-full bg-[#0A1E3A] text-white py-2 rounded-lg hover:bg-[#112d58]"
                  >
                    View Details
                  </button>
                </div>
              ))
            )}
          </div>

          {/* MODAL */}
          {selectedChat && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white max-w-4xl w-full rounded-xl p-6 relative overflow-y-auto max-h-[90vh]">
                <button
                  className="absolute top-4 right-4"
                  onClick={() => setSelectedChat(null)}
                >
                  <X />
                </button>

                <h2 className="text-xl font-semibold mb-4">Chat Details</h2>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Buyer</h3>
                    <p>{selectedChat.buyer.username}</p>
                    <p className="text-sm text-gray-600">
                      {selectedChat.buyer.email}
                    </p>
                    <p className="text-sm">{selectedChat.buyer.phone}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Seller</h3>
                    <p>{selectedChat.seller.username}</p>
                    <p className="text-sm text-gray-600">
                      {selectedChat.seller.email}
                    </p>
                    <p className="text-sm">{selectedChat.seller.phone}</p>
                  </div>
                </div>

                {selectedChat.product && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Product</h3>
                    <p>{selectedChat.product.productTitle}</p>
                    <p className="text-sm">
                      Price: د.إ{selectedChat.product.originalPrice}
                    </p>

                    {selectedChat.product.photos?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {selectedChat.product.photos.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="product"
                            className="w-20 h-20 object-cover rounded border"
                            onClick={() => window.open(img, "_blank")}
                          />
                        ))}
                      </div>
                    )}
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

export default Chats;
