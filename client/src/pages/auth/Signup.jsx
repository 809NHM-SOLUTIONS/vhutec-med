import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import "./Auth.css";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
    });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  // Frontend validation
  if (formData.firstName.trim().length < 2) {
    setError("First name must be at least 2 characters.");
    return;
  }

  if (formData.lastName.trim().length < 2) {
    setError("Last name must be at least 2 characters.");
    return;
  }

  if (!formData.email.includes("@")) {
    setError("Please enter a valid email address.");
    return;
  }

  if (formData.phone.trim().length < 10) {
    setError("Phone number must be at least 10 characters.");
    return;
  }

  if (!/^\d{13}$/.test(formData.idNumber.trim())) {
   setError("ID number must be exactly 13 digits.");
   return;
  }

  if (formData.address.trim().length < 5) {
    setError("Address must be at least 5 characters.");
    return;
  }

  if (formData.password.length < 8) {
    setError("Password must be at least 8 characters.");
    return;
  }

  if (!/[A-Z]/.test(formData.password)) {
    setError("Password must contain at least one uppercase letter.");
    return;
  }

  if (!/[a-z]/.test(formData.password)) {
    setError("Password must contain at least one lowercase letter.");
    return;
  }

  if (!/[0-9]/.test(formData.password)) {
    setError("Password must contain at least one number.");
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch(
      "http://localhost:5000/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      }
    );

    const data = await response.json();

    console.log("Registration response:", data);
    console.log(
  "Validation errors:",
  JSON.stringify(data.errors, null, 2)
);


    if (!response.ok) {
      if (data.errors && data.errors.length > 0) {
        setError(data.errors[0].message);
      } else {
        setError(data.message || "Unable to create account.");
      }

      return;
    }

    navigate("/login", {
      state: {
        message: "Account created successfully. Please login.",
      },
    });

  } catch (error) {
    console.error("Registration error:", error);

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
            <span className="section-label">GET STARTED</span>

            <h1>Create your account</h1>

            <p>
              Create your Vhutec Med account and manage your healthcare
              journey more easily.
            </p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="firstName">First name</label>

                <div className="input-wrapper">
                  {/* <FiUser /> */}

                  <input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last name</label>

                <div className="input-wrapper">
                  {/* <FiUser /> */}

                  <input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

            </div>

            <div className="form-row">

            <div className="form-group">
                <label htmlFor="idNumber">ID number</label>

                <div className="input-wrapper">
                <input
                    id="idNumber"
                    type="text"
                    inputMode="numeric"
                    maxLength="13"
                    placeholder="Enter your 13-digit ID number"
                    value={formData.idNumber}
                    onChange={handleChange}
                    required
                />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="email">Email address</label>

                <div className="input-wrapper">
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

            </div>

            <div className="form-group">
            <label htmlFor="phone">Phone number</label>

            <div className="input-wrapper">
                <input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                required
                />
            </div>
            </div>

            <div className="form-group">
            <label htmlFor="address">Address</label>

            <div className="input-wrapper">
                <input
                id="address"
                type="text"
                placeholder="Enter your address"
                value={formData.address}
                onChange={handleChange}
                required
                />
            </div>
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                {/* <FiLock /> */}

                <input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="input-wrapper">
                {/* <FiLock /> */}

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

          </form>

          <div className="auth-footer">
            <span>Already have an account?</span>

            <Link to="/login">
              Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Signup;