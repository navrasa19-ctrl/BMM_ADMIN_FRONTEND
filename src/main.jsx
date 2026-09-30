import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAdminFetchAuth } from "./adminAuth.js";

// Every request to our backend carries the admin's Firebase ID token
installAdminFetchAuth();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
