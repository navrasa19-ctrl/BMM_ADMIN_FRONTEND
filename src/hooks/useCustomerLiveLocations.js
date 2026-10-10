import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { auth } from "../firebase.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Subscribes to `customer:location` events (admin-only socket room) and
// calls `onLocation({ userId, liveLocation })` for each one. `onResync` runs
// after a reconnect so the caller can refetch anything missed while offline.
// Returns the connection status: "connecting" | "connected" | "disconnected".
export const useCustomerLiveLocations = (onLocation, onResync) => {
  const [status, setStatus] = useState("connecting");
  const handlerRef = useRef(onLocation);
  const resyncRef = useRef(onResync);
  handlerRef.current = onLocation;
  resyncRef.current = onResync;

  useEffect(() => {
    if (!API_BASE_URL) {
      setStatus("disconnected");
      return undefined;
    }

    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      // Called on every (re)connect, so an expired ID token is refreshed
      auth: async (cb) => {
        try {
          await auth.authStateReady();
          cb({ token: (await auth.currentUser?.getIdToken()) || "" });
        } catch {
          cb({ token: "" });
        }
      },
    });

    let hasConnected = false;
    socket.on("connect", () => {
      setStatus("connected");
      if (hasConnected) resyncRef.current?.();
      hasConnected = true;
    });
    socket.on("connect_error", () => setStatus("disconnected"));
    socket.on("disconnect", (reason) => {
      setStatus("disconnected");
      // Server closes the socket when the admin token expires; socket.io
      // does not auto-reconnect in that case.
      if (reason === "io server disconnect") socket.connect();
    });
    socket.io.on("reconnect_attempt", () => setStatus("connecting"));

    socket.on("customer:location", (payload) => {
      if (payload?.userId) handlerRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return status;
};
