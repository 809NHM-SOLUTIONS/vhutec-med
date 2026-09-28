import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiLock, FiMail } from "react-icons/fi";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  

  // Display message received from Signup
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);

      // Prevent the message from appearing again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (event) => {
    const { id, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [id]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to login.");
        return;
      }

      // Store authentication information
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("Login successful:", data.user);

      // Navigate based on user role
      switch (data.user.role) {
  case "PATIENT":
    navigate("/patient");
    break;

  case "DOCTOR":
    navigate("/doctor");
    break;

  case "RECEPTIONIST":
    navigate("/receptionist");
    break;

  default:
    setError("User role is not recognised.");
}

    } catch (error) {
      console.error("Login error:", error);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        <Link to="/" className="auth-back">
          <FiArrowLeft />
          Back to home
        </Link>

        <div className="auth-card">

          <div className="auth-logo">
            <img
              src="/images/logo/logo.jpeg"
              alt="Vhutec Med Logo"
            />
          </div>

          <div className="auth-heading">
            <span className="section-label">WELCOME BACK</span>

            <h1>Login to Vhutec Med</h1>

            <p>
              Access your appointments, queue information and healthcare
              services.
            </p>
          </div>

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <FiMail />

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <FiLock />

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="auth-options">
              <label className="remember-option">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <a href="#forgot-password">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

          <div className="auth-footer">
            <span>Don't have an account?</span>

            <Link to="/signup">
              Sign Up
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;