import React, { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Sidebar from "../components/Sidebar.jsx";

import { RefreshCw, ImageIcon, Trash2, X, UploadCloud } from "lucide-react";

const BannerSkeleton = () => (
  <div className="rounded-2xl overflow-hidden animate-pulse bg-white border border-gray-100" style={{ aspectRatio: "1080 / 350" }} />
);

const Toast = ({ popup, onClose }) => {
  if (!popup.open) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm shadow-lg transition-all ${
        popup.type === "success" ? "bg-green-700" : "bg-red-700"
      }`}
    >
      <span>{popup.message}</span>
      <button onClick={onClose} className="hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  );
};

const AddBanner = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setSidebarOpen((p) => !p);

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
  const [newBannerIds, setNewBannerIds] = useState(new Set());
  const [newVideoIds, setNewVideoIds] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("banner");

  const fileInputRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const REQUIRED_BANNER_WIDTH = 1080;
  const REQUIRED_BANNER_HEIGHT = 341;
  const REQUIRED_SIZE_STRING = `${REQUIRED_BANNER_WIDTH}×${REQUIRED_BANNER_HEIGHT}`;
  const MIN_VIDEO_SIZE = 100 * 1024;

  const validateImageDimensions = (selected) => {
    return new Promise((resolve) => {
      if (!selected) return resolve(false);
      const url = URL.createObjectURL(selected);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.width === REQUIRED_BANNER_WIDTH && img.height === REQUIRED_BANNER_HEIGHT);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });
  };

  const validateVideoFile = (selected) => {
    if (!selected) return false;
    if (!selected.type.startsWith("video/")) return false;
    if (selected.size < MIN_VIDEO_SIZE) return false;
    return true;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${sizes[i]}`;
  };

  const [popup, setPopup] = useState({ open: false, type: "success", message: "" });

  const showPopup = (type, message) => {
    setPopup({ open: true, type, message });
    setTimeout(() => setPopup({ open: false, type, message: "" }), 3000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsDragging(false);
    if (tab === "banner") {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoFile(null);
      setVideoPreview(null);
    } else {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerFile(null);
      setBannerPreview(null);
    }
  };

  // ── FETCH ──────────────────────────────────────────────
  const fetchBanners = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/picture/get`);
      const result = await res.json();
      if (result.success) setBanners(result.data || []);
      else showPopup("error", "Failed to fetch banners");
    } catch {
      showPopup("error", "Server error");
    }
  };

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/video/advertise-video`);
      const result = await res.json();
      if (result.success) setVideos(result.data || []);
      else showPopup("error", "Failed to fetch videos");
    } catch {
      showPopup("error", "Server error");
    }
  };

  const fetchAllAssets = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBanners(), fetchVideos()]);
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => { fetchAllAssets(); }, []);

  // ── FILE HANDLING ─────────────────────────────────────
  const applyFile = async (selected) => {
    if (!selected) return;

    if (activeTab === "banner") {
      const isValid = await validateImageDimensions(selected);
      if (!isValid) {
        showPopup("error", `Image must be ${REQUIRED_SIZE_STRING} pixels`);
        return;
      }
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerFile(selected);
      setBannerPreview(URL.createObjectURL(selected));
      return;
    }

    const isValidVideo = validateVideoFile(selected);
    if (!isValidVideo) {
      showPopup("error", `Video must be at least 100 KB and a valid video file.`);
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(selected);
    setVideoPreview(URL.createObjectURL(selected));
  };

  const handleFileChange = (e) => applyFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;

    if (activeTab === "banner") {
      if (!dropped.type.startsWith("image/")) {
        showPopup("error", "Please drop an image file");
        return;
      }
      applyFile(dropped);
      return;
    }

    if (!dropped.type.startsWith("video/")) {
      showPopup("error", "Please drop a video file");
      return;
    }
    applyFile(dropped);
  };

  const clearFile = () => {
    if (activeTab === "banner") {
      setBannerFile(null);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerPreview(null);
    } else {
      setVideoFile(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── UPLOAD ────────────────────────────────────────────
  const uploadBanner = async () => {
    if (!bannerFile) { showPopup("error", "Please select an image"); return; }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("singleImage", bannerFile);

      const res = await fetch(`${API_BASE}/api/picture/create`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        showPopup("success", "Banner uploaded");
        const newBanner = { id: result.id, images: { singleImage: result.imageUrl } };
        setBanners((prev) => [newBanner, ...prev]);
        setNewBannerIds((prev) => new Set(prev).add(result.id));
        setTimeout(() => setNewBannerIds((prev) => { const s = new Set(prev); s.delete(result.id); return s; }), 3000);
        clearFile();
      } else {
        showPopup("error", result.message || "Upload failed");
      }
    } catch {
      showPopup("error", "Upload error");
    } finally {
      setLoading(false);
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) { showPopup("error", "Please select a video"); return; }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("video", videoFile);

      const res = await fetch(`${API_BASE}/api/video/advertise-video`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        showPopup("success", "Advertise video uploaded successfully");
        const newVideo = {
          id: result.id,
          videoUrl: result.videoUrl,
          fileName: videoFile.name,
          size: videoFile.size,
          mimeType: videoFile.type,
        };
        setVideos((prev) => [newVideo, ...prev]);
        setNewVideoIds((prev) => new Set(prev).add(result.id));
        setTimeout(() => setNewVideoIds((prev) => { const s = new Set(prev); s.delete(result.id); return s; }), 3000);
        clearFile();
      } else {
        showPopup("error", result.message || "Upload failed");
      }
    } catch {
      showPopup("error", "Upload error");
    } finally {
      setLoading(false);
    }
  };

  // ── DELETE ────────────────────────────────────────────
  const deleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/picture/delete/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        showPopup("success", "Banner deleted");
        setBanners((prev) => prev.filter((b) => b.id !== id));
      } else {
        showPopup("error", result.message || "Delete failed");
      }
    } catch {
      showPopup("error", "Delete error");
    }
  };

  const deleteVideo = async (id) => {
    if (!window.confirm("Delete this advertise video?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/video/advertise-video/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        showPopup("success", "Advertise video deleted");
        setVideos((prev) => prev.filter((video) => video.id !== id));
      } else {
        showPopup("error", result.message || "Delete failed");
      }
    } catch {
      showPopup("error", "Delete error");
    }
  };

  const activeFile = activeTab === "banner" ? bannerFile : videoFile;
  const activePreview = activeTab === "banner" ? bannerPreview : videoPreview;
  const activeList = activeTab === "banner" ? banners : videos;
  const activeNewIds = activeTab === "banner" ? newBannerIds : newVideoIds;
  const sectionLabel = activeTab === "banner" ? "Uploaded banners" : "Advertise videos";
  const activeUploadLabel = activeTab === "banner" ? "Upload banner" : "Upload video";
  const activePlaceholder = activeTab === "banner"
    ? `PNG, JPG, WEBP up to 5 MB · required size: ${REQUIRED_SIZE_STRING}px`
    : "MP4, MOV, WEBM · min size: 100 KB";
  const activeHint = activeTab === "banner"
    ? `Image must be ${REQUIRED_SIZE_STRING} pixels.`
    : "Video size must be at least 100 KB.";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 transition-all ${sidebarOpen ? "lg:ml-60" : ""}`}>
        <TopBar toggleSidebar={toggleSidebar} />

        <main className="p-6 max-w-6xl mx-auto">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Banners</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage your storefront banners</p>
            </div>
            <button
              onClick={fetchBanners}
              disabled={refreshing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => handleTabChange("banner")}
                className={`px-5 py-2 text-sm font-medium transition-all ${activeTab === "banner" ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Banners
              </button>
              <button
                onClick={() => handleTabChange("video")}
                className={`px-5 py-2 text-sm font-medium transition-all ${activeTab === "video" ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Advertise Videos
              </button>
            </div>

            <button
              onClick={fetchAllAssets}
              disabled={refreshing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* DROP ZONE */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !activePreview && fileInputRef.current?.click()}
            className={`relative bg-white border-2 border-dashed rounded-2xl p-8 mb-10 text-center transition-all cursor-pointer
              ${isDragging ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-red-300 hover:bg-gray-50"}
              ${activePreview ? "cursor-default" : ""}`}
          >
            <input
              ref={fileInputRef}
              id="assetInput"
              type="file"
              accept={activeTab === "banner" ? "image/*" : "video/*"}
              onChange={handleFileChange}
              className="hidden"
            />

            {!activePreview ? (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <UploadCloud size={24} className="text-red-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Drop {activeTab === "banner" ? "image" : "video"} here or{" "}
                  <span className="text-red-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs font-bold text-gray-800 mt-1">
                  {activePlaceholder}
                </p>
                <p className="text-xs text-gray-400 mt-1">{activeHint}</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {activeTab === "banner" ? (
                  <div className="relative inline-block w-full max-w-xl rounded-xl border border-gray-100 shadow-sm" style={{ aspectRatio: "1080 / 350" }}>
                    <img
                      src={activePreview}
                      alt="Preview"
                      className="h-full w-full rounded-xl object-cover"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <video
                      src={activePreview}
                      controls
                      className="w-full h-auto bg-black"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-white text-red-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {activeTab === "video" && (
                  <p className="text-xs text-gray-400">Size: {formatBytes(activeFile?.size)}</p>
                )}
                <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={clearFile}
                    className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={activeTab === "banner" ? uploadBanner : uploadVideo}
                    disabled={loading}
                    className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                        </svg>
                        Uploading…
                      </span>
                    ) : activeUploadLabel}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION LABEL */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            {sectionLabel}
          </p>

          {/* GRID */}
          {initialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(8)].map((_, i) => <BannerSkeleton key={i} />)}
            </div>
          ) : activeList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeTab === "banner"
                ? activeList.map((banner) => (
                    <div
                      key={banner.id}
                      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-all"
                      style={{ aspectRatio: "1080 / 350" }}
                    >
                      <img
                        src={banner.images.singleImage}
                        alt="Banner"
                        className="h-full w-full object-cover"
                      />

                      {/* New badge */}
                      {activeNewIds.has(banner.id) && (
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                          New
                        </span>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          className="flex items-center gap-1.5 bg-white text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                : activeList.map((video) => (
                    <div
                      key={video.id}
                      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-all"
                    >
                      <video
                        src={video.videoUrl}
                        controls
                        className="w-full h-64 bg-black"
                      />
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <p className="font-semibold text-gray-900 truncate">{video.fileName}</p>
                            <p className="text-xs text-gray-500 mt-1">{video.mimeType} · {formatBytes(video.size)}</p>
                          </div>
                          {activeNewIds.has(video.id) && (
                            <span className="bg-red-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="inline-flex items-center gap-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon size={28} className="text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">
                {activeTab === "banner" ? "No banners yet" : "No advertise videos yet"}
              </p>
              <p className="text-sm mt-1">
                {activeTab === "banner" ? "Upload your first banner above" : "Upload your first advertise video above"}
              </p>
            </div>
          )}
        </main>
      </div>

      <Toast popup={popup} onClose={() => setPopup((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default AddBanner;
