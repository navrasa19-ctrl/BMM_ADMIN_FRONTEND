import React, { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useToast } from "../hooks/useToast.js";
import { RefreshCw, Trash2, X, Send, Video, Image as ImageIcon } from "lucide-react";

// ── Star Rating ──────────────────────────────────────────
const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
          style={{ color: n <= display ? "#EF9F27" : "#D3D1C7" }}
        >
          ★
        </button>
      ))}
      <span className="text-xs text-gray-400 ml-1">{value} / 5</span>
    </div>
  );
};

// ── Review Card Stars ────────────────────────────────────
const Stars = ({ count }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ color: n <= count ? "#EF9F27" : "#D3D1C7", fontSize: 13 }}>★</span>
    ))}
  </div>
);

// ── Toast ────────────────────────────────────────────────
const Toast = ({ popup, onClose }) => {
  if (!popup.open) return null;
  const styles = popup.type === "success"
    ? "bg-green-50 border-green-300 text-green-800"
    : "bg-red-50 border-red-300 text-red-800";
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm mt-4 ${styles}`}>
      <span className="flex-1">{popup.message}</span>
      <button onClick={onClose}><X size={13} /></button>
    </div>
  );
};

// ── Skeleton ─────────────────────────────────────────────
const Skeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-36 bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-2.5 w-24 bg-gray-100 rounded" />
      <div className="h-2.5 w-16 bg-gray-100 rounded" />
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────
const AddReview = () => {
  const { toasts } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setSidebarOpen((p) => !p);

  const [formData, setFormData] = useState({ name: "", title: "", rating: 5, bio: "" });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [newIds, setNewIds] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fileInputRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [popup, setPopup] = useState({ open: false, type: "success", message: "" });

  const showPopup = (type, message) => {
    setPopup({ open: true, type, message });
    setTimeout(() => setPopup({ open: false, type, message: "" }), 3500);
  };

  // ── Fetch ────────────────────────────────────────────
  const fetchReviews = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE}/api/review-Rating/get`);
      const result = await res.json();
      if (result.success) setReviews(result.data || []);
      else showPopup("error", "Failed to fetch reviews");
    } catch {
      showPopup("error", "Server error");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  // ── Media handling ───────────────────────────────────
  const applyMedia = (file) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      showPopup("error", "Only image or video files allowed");
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaType(isVideo ? "video" : "image");
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) applyMedia(f);
  };

  // ── Upload ───────────────────────────────────────────
  const uploadReview = async (e) => {
    e.preventDefault();

    if (!mediaFile) {
      showPopup("error", "Please select a media file");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("name", formData.name);
      data.append("title", formData.title);
      data.append("rating", formData.rating);
      data.append("bio", formData.bio);

      // ✅🔥 FIXED FIELD NAME
      data.append("video", mediaFile);

      const res = await fetch(`${API_BASE}/api/review-Rating/create`, {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (result.success) {
        showPopup("success", "Review uploaded successfully");

        setReviews((prev) => [result.data, ...prev]);

        setFormData({ name: "", title: "", rating: 5, bio: "" });
        clearMedia();
      } else {
        showPopup("error", result.message || "Upload failed");
      }
    } catch (error) {
      showPopup("error", "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────
  const deleteReview = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/review-Rating/delete/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        showPopup("success", "Review deleted");
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        showPopup("error", "Delete failed");
      }
    } catch {
      showPopup("error", "Server error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 transition-all ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="p-6 max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Customer reviews</h1>
              <p className="text-sm text-gray-400 mt-0.5">Add and manage video testimonials</p>
            </div>
            <button
              onClick={fetchReviews}
              disabled={refreshing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Form */}
          <form onSubmit={uploadReview} className="bg-white border border-gray-100 rounded-2xl p-6 mb-10 space-y-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Add new review</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500">Full name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Johnson"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 transition-colors bg-gray-50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500">Title / role</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing Lead"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 transition-colors bg-gray-50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Rating</label>
              <StarRating value={formData.rating} onChange={(v) => setFormData({ ...formData, rating: v })} />
            </div>

            {/* Video Drop Zone */}
            {!mediaPreview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
                  ${isDragging ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-red-300 hover:bg-gray-50"}`}
              >
                <input
                  ref={fileInputRef}
                  id="videoInput"
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) => { if (e.target.files[0]) applyMedia(e.target.files[0]); }}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
                  {mediaType === "video" ? (
                    <Video size={20} className="text-red-500" />
                  ) : (
                    <ImageIcon size={20} className="text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Drop media here or <span className="text-red-600 font-medium underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">MP4, MOV, WEBM, JPG, PNG supported</p>
              </div>
            ) : (
              <div className="relative">
                {mediaType === "video" ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-44 object-cover rounded-2xl bg-black border border-gray-100"
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-44 object-cover rounded-2xl border border-gray-100"
                  />
                )}

                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Review text</label>
              <textarea
                placeholder="What did the customer say about your product or service?"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 transition-colors bg-gray-50 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit review
                </>
              )}
            </button>

            <Toast popup={popup} onClose={() => setPopup((p) => ({ ...p, open: false }))} />
          </form>

          {/* Reviews grid */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">All reviews</p>

          {initialLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="relative bg-black">
                    {review.mediaType === "image" ? (
                      <img
                        src={review.mediaUrl}
                        alt={review.name}
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <video
                        src={review.mediaUrl || review.videoUrl}
                        controls
                        className="w-full h-36 object-cover"
                      />
                    )}
                    {newIds.has(review.id) && (
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full z-10">
                        New
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none group-hover:pointer-events-auto">
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="flex items-center gap-1.5 bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <Stars count={review.rating} />
                    <p className="font-medium text-gray-900 text-sm mt-1.5 leading-tight">{review.title}</p>
                    <p className="text-xs text-gray-400 mb-1.5">@{review.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{review.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <Video size={24} className="text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload the first video testimonial above</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AddReview;
