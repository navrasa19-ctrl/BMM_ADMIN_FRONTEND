import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { auth } from "../firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  getIdToken,
} from "firebase/auth";

const LoginForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [popup, setPopup] = useState({ show: false, type: "", message: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.login,
        formData.password
      );

      const user = userCredential.user;
      const idToken = await getIdToken(user);

      localStorage.setItem("adminToken", idToken);
      localStorage.setItem(
        "adminUser",
        JSON.stringify({
          name: user.displayName || "Admin",
          email: user.email,
          uid: user.uid,
          role: "admin",
        })
      );

      setPopup({
        show: true,
        type: "success",
        message: "Welcome to BookMyMechanik Admin",
      });

      setTimeout(() => {
        setPopup({ show: false, type: "", message: "" });
        navigate("/dashboard");
      }, 1000);
    } catch (err) {
      setError("Invalid credentials. Please try again.");
      setPopup({
        show: true,
        type: "error",
        message: "Invalid credentials. Please try again.",
      });

      setTimeout(() => setPopup({ show: false, type: "", message: "" }), 3000);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FORGOT PASSWORD ================= */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail);

      setPopup({
        show: true,
        type: "success",
        message: "Password reset link sent. Check your email 📩",
      });

      setTimeout(() => {
        setPopup({ show: false, type: "", message: "" });
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      }, 3000);
    } catch (err) {
      setPopup({
        show: true,
        type: "error",
        message: "Failed to send reset email.",
      });

      setTimeout(() => setPopup({ show: false, type: "", message: "" }), 3000);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lightGray flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="mb-6 text-center">
        <img src="/logo.png" alt="BookMyMechanik" className="h-28 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-black tracking-wide">
          BOOK MY MECHANIK<span className="align-top text-md ml-0">™</span>
        </h1>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-lg rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-center text-darkGray mb-6">
          Admin Dashboard Login
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-darkGray font-medium mb-1 text-sm">
              Email
            </label>
            <input
              type="email"
              name="login"
              value={formData.login}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="admin@bookmymechanik.com"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label className="block text-darkGray font-medium mb-1 text-sm">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-primary focus:outline-none pr-10"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-500 hover:text-primary"
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primaryHover text-white
            font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-darkGray hover:text-primary"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold text-darkGray mb-4">
              Reset Password
            </h3>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-primary focus:outline-none"
              />

              <button
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full bg-primary hover:bg-primaryHover text-white
                font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {popup.show && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg ${popup.type === "success" ? "bg-primary" : "bg-red-600"
            }`}
        >
          {popup.message}
        </div>
      )}
    </div>
  );
};

export default LoginForm;
