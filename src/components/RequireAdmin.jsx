import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.js";

// Renders admin pages only for a signed-in Firebase user; everyone else is
// sent to the login page.
const RequireAdmin = () => {
  const location = useLocation();
  const [user, setUser] = useState(auth.currentUser);
  const [checking, setChecking] = useState(!auth.currentUser);

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setChecking(false);
      }),
    []
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireAdmin;
