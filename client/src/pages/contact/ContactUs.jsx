import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiMail,
  FiMapPin,
  FiPhone,
  FiClock,
  FiCheckCircle,
  FiArrowLeft,
} from "react-icons/fi";
import "./Contact.css";

// Only fill in what is OFFICIAL. Empty values are hidden automatically.
const CONTACT_INFO = {
  email: "info@vhutheluresources.co.za",
  location: "Mpumalanga, South Africa",
  phone: "+27664670894",
  address: "23 Corridor Cres,Ben Fleur ,Emalahleni 1035",
  hours: [
    { label: "Monday - Friday", time: "08:00 - 17:00" },
    { label: "Saturday", time: "09:00 - 13:00" },
    { label: "Sunday & Public Holidays", time: "Closed" },
  ],
};

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

function validate(values) {
  const errors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  else if (values.fullName.trim().length < 2)
    errors.fullName = "Please enter at least 2 characters.";

  if (!values.email.trim()) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Please enter a valid email address.";

  if (values.phone.trim() && !/^\+?[\d\s()-]{7,16}$/.test(values.phone.trim()))
    errors.phone = "Please enter a valid phone number.";

  if (!values.subject.trim()) errors.subject = "Subject is required.";

  if (!values.message.trim()) errors.message = "Message is required.";
  else if (values.message.trim().length < 10)
    errors.message = "Message must be at least 10 characters.";

  return errors;
}

// Replace the body of this function with your real backend call.
async function sendContactMessage(data) {
  // Example:
  // const res = await fetch("/api/contact", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(data),
  // });
  // if (!res.ok) throw new Error("Failed to send");
  await new Promise((resolve) => setTimeout(resolve, 900)); // simulated delay
  return true;
}

export default function ContactUs() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const fieldErrors = validate(form);
    setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setSubmitting(true);
      await sendContactMessage(form);
      setSuccess(true);
      setForm(initialForm);
    } catch {
      setServerError(
        "Something went wrong. Please try again or email us directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <header className="contact-topbar">
        <Link to="/" className="contact-back">
          <FiArrowLeft /> Back to Home
        </Link>
      </header>

      <section className="contact-hero">
        <span className="section-label">CONTACT US</span>
        <h1>
          Get in <span>touch</span>
        </h1>
        <p>
          Questions about Vhutec Med or need help with your account? Send us a
          message and our team will respond as soon as possible.
        </p>
      </section>

      <section className="contact-wrapper">
        {/* ---------- Info column ---------- */}
        <div className="contact-info">
          <div className="contact-card">
            <div className="contact-icon">
              <FiMail />
            </div>
            <div>
              <h3>General Enquiries</h3>
              <p>Questions about our platform, services or partnerships.</p>
              <a href={`mailto:${CONTACT_INFO.email}?subject=General Enquiry`}>
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <FiMail />
            </div>
            <div>
              <h3>Technical Support</h3>
              <p>Login problems, booking issues or something not working?</p>
              <a href={`mailto:${CONTACT_INFO.email}?subject=Technical Support`}>
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <FiMapPin />
            </div>
            <div>
              <h3>Location</h3>
              <p>{CONTACT_INFO.location}</p>
              {CONTACT_INFO.address && <p>{CONTACT_INFO.address}</p>}
            </div>
          </div>

          {CONTACT_INFO.phone && (
            <div className="contact-card">
              <div className="contact-icon">
                <FiPhone />
              </div>
              <div>
                <h3>Phone</h3>
                <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, "")}`}>
                  {CONTACT_INFO.phone}
                </a>
              </div>
            </div>
          )}

          <div className="contact-card">
            <div className="contact-icon">
              <FiClock />
            </div>
            <div>
              <h3>Support Hours</h3>
              <ul className="contact-hours">
                {CONTACT_INFO.hours.map((h) => (
                  <li key={h.label}>
                    <span>{h.label}</span>
                    <strong>{h.time}</strong>
                  </li>
                ))}
              </ul>
              <small>Hours are in South African Standard Time (SAST).</small>
            </div>
          </div>
        </div>

        {/* ---------- Form column ---------- */}
        <div className="contact-form-card">
          {success ? (
            <div className="contact-success" role="status">
              <FiCheckCircle />
              <h2>Message sent successfully!</h2>
              <p>
                Thank you for contacting Vhutec Med. We have received your
                message and will get back to you shortly.
              </p>
              <button
                type="button"
                className="contact-submit"
                onClick={() => setSuccess(false)}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2>Send us a message</h2>
              <p className="contact-form-sub">
                Fields marked with * are required.
              </p>

              {serverError && (
                <div className="contact-alert" role="alert">
                  {serverError}
                </div>
              )}

              <div className="contact-field">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.fullName ? "has-error" : ""}
                />
                {errors.fullName && (
                  <span className="field-error">{errors.fullName}</span>
                )}
              </div>

              <div className="contact-row">
                <div className="contact-field">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.email ? "has-error" : ""}
                  />
                  {errors.email && (
                    <span className="field-error">{errors.email}</span>
                  )}
                </div>

                <div className="contact-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+27 82 000 0000"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.phone ? "has-error" : ""}
                  />
                  {errors.phone && (
                    <span className="field-error">{errors.phone}</span>
                  )}
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="subject">Subject *</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="How can we help?"
                  value={form.subject}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.subject ? "has-error" : ""}
                />
                {errors.subject && (
                  <span className="field-error">{errors.subject}</span>
                )}
              </div>

              <div className="contact-field">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.message ? "has-error" : ""}
                />
                {errors.message && (
                  <span className="field-error">{errors.message}</span>
                )}
              </div>

              <button
                type="submit"
                className="contact-submit"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}