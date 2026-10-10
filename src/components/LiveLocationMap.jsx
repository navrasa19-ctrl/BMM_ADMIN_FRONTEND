import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Map is created once; later position updates only move the marker so the
// view does not flicker on every live update.
const LiveLocationMap = ({ latitude, longitude, accuracy, isLive }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyRef = useRef(null);
  const followRef = useRef(true);

  useEffect(() => {
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([latitude, longitude], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Stop auto-centering once the admin pans the map themselves
    map.on("dragstart", () => {
      followRef.current = false;
    });

    mapRef.current = map;
    markerRef.current = L.circleMarker([latitude, longitude], {
      radius: 9,
      weight: 3,
      color: "#ffffff",
      fillOpacity: 1,
    }).addTo(map);
    accuracyRef.current = L.circle([latitude, longitude], {
      radius: 0,
      weight: 1,
      fillOpacity: 0.12,
    }).addTo(map);

    // The modal can resize after mount; without this Leaflet leaves grey,
    // unloaded tile areas
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // Created once per mount; position changes are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const position = [latitude, longitude];
    const color = isLive ? "#16a34a" : "#6b7280";

    markerRef.current.setLatLng(position).setStyle({ fillColor: color });
    accuracyRef.current
      .setLatLng(position)
      .setRadius(Number.isFinite(accuracy) ? accuracy : 0)
      .setStyle({ color, fillColor: color });

    if (followRef.current) mapRef.current.panTo(position);
  }, [latitude, longitude, accuracy, isLive]);

  return (
    <div
      ref={containerRef}
      className="w-full h-56 rounded-xl border overflow-hidden z-0"
      role="img"
      aria-label="Customer location map"
    />
  );
};

export default LiveLocationMap;
