import { useState } from "react";
import { FiCheckCircle, FiEdit2, FiX } from "react-icons/fi";

import { updateMyProfile } from "../../api/api";

// ---- helpers (same rules as the server: validators/patientProfileValidator.js) ----

function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calculateAge(dateString) {
  if (!dateString) return "";
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

const NAME_PATTERN = /^\p{L}[\p{L}\s'’.-]*$/u;

function validateProfileForm(form) {
  const errors = {};

  [
    ["firstName", "First name"],
    ["lastName", "Last name"],
  ].forEach(([field, label]) => {
    const value = form[field].trim();
    if (value.length < 2) errors[field] = `${label} must be at least 2 characters.`;
    else if (value.length > 50) errors[field] = `${label} must be at most 50 characters.`;
    else if (!NAME_PATTERN.test(value))
      errors[field] = `${label} may only contain letters, spaces, hyphens and apostrophes.`;
  });

  if (!/^\+?\d{10,15}$/.test(form.phone.trim().replace(/[\s-]/g, ""))) {
    errors.phone = "Please enter a valid phone number, e.g. 082 123 4567.";
  }

  const address = form.address.trim();
  if (address.length < 5) errors.address = "Address must be at least 5 characters.";
  else if (address.length > 200) errors.address = "Address must be at most 200 characters.";

  return errors;
}

const toForm = (patient) => ({
  firstName: patient.firstName || "",
  lastName: patient.lastName || "",
  phone: patient.phone || "",
  address: patient.address || "",
});

/**
 * "My Profile" page: shows the patient's details and lets them edit the four
 * fields they are allowed to change (first name, last name, phone, address).
 * ID number, date of birth, patient number and e-mail are read-only: they can
 * only be corrected by clinic staff.
 *
 * Props:
 *  patient   the patient record from GET /patients/me (null until loaded)
 *  loading   true while the profile is loading
 *  error     load error message ("" for none)
 *  onSaved   called with the updated patient record after a successful save,
 *            so the dashboard header, summary card and initials refresh
 *  onRetry   optional, reloads the profile after a load error
 */
function PatientProfileSection({ patient, loading, error, onSaved, onRetry }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const fullName = patient ? `${patient.firstName} ${patient.lastName}` : "";
  const initials = patient
    ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase()
    : "";

  const startEditing = () => {
    setForm(toForm(patient));
    setFieldErrors({});
    setSaveError("");
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFieldErrors({});
    setSaveError("");
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveError("");

    const errors = validateProfileForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Send only what actually changed.
    const current = toForm(patient);
    const changes = {};
    Object.keys(form).forEach((field) => {
      if (form[field].trim() !== current[field]) changes[field] = form[field].trim();
    });

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      const result = await updateMyProfile(changes);
      onSaved(result.data);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setSaveError(err.message || "Unable to update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (id, label, type = "text", autoComplete) => (
    <div className="form-group" key={id}>
      <label htmlFor={`profile-${id}`}>{label}</label>
      <input
        id={`profile-${id}`}
        type={type}
        value={form[id]}
        onChange={handleChange(id)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(fieldErrors[id])}
        aria-describedby={fieldErrors[id] ? `profile-${id}-error` : undefined}
        required
      />
      {fieldErrors[id] && (
        <small id={`profile-${id}-error`} className="field-error" role="alert">
          {fieldErrors[id]}
        </small>
      )}
    </div>
  );

  return (
    <section className="dashboard-section">
      <div className="section-page-header">
        <div>
          <span className="section-label">PATIENT PROFILE</span>
          <h2>My Profile</h2>
          <p>View and update your personal and contact information.</p>
        </div>
      </div>

      {loading && <p>Loading your profile...</p>}

      {error && (
        <div className="auth-error">
          {error}
          {onRetry && (
            <>
              {" "}
              <button type="button" className="text-button" onClick={onRetry}>
                Try again
              </button>
            </>
          )}
        </div>
      )}

      {saved && (
        <div className="booking-success" role="status">
          <FiCheckCircle />
          <div>
            <strong>Profile updated</strong>
            <p>Your details have been saved.</p>
          </div>
          <button
            type="button"
            onClick={() => setSaved(false)}
            aria-label="Close success message"
          >
            <FiX />
          </button>
        </div>
      )}

      {patient && (
        <div className="profile-page-card">
          <div className="profile-page-header">
            <div className="profile-page-avatar">{initials}</div>

            <div>
              <h3>{fullName}</h3>
              <p>Patient · ID {patient.patientNumber}</p>
            </div>

            {!editing && (
              <button
                type="button"
                className="secondary-button profile-edit-button"
                onClick={startEditing}
              >
                <FiEdit2 />
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form className="appointment-form" onSubmit={handleSubmit} noValidate>
              {saveError && (
                <div className="auth-error form-group-full" role="alert">
                  {saveError}
                </div>
              )}

              {renderField("firstName", "First Name", "text", "given-name")}
              {renderField("lastName", "Last Name", "text", "family-name")}
              {renderField("phone", "Phone Number", "tel", "tel")}
              {renderField("address", "Address", "text", "street-address")}

              <p className="profile-readonly-note form-group-full">
                Your National ID number, date of birth, patient number and email
                address cannot be changed online. Please contact Vhutec Med
                reception if one of them needs to be corrected.
              </p>

              <div className="form-actions profile-edit-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-information-grid">
              <div>
                <span>Full Name</span>
                <strong>{fullName}</strong>
              </div>

              <div>
                <span>National ID Number</span>
                <strong>{patient.idNumber}</strong>
              </div>

              <div className="profile-detail">
                <span>Patient Number</span>
                <strong>{patient.patientNumber || "Not assigned"}</strong>
              </div>

              <div>
                <span>Date of Birth</span>
                <strong>{formatDateDisplay(patient.dob)}</strong>
              </div>

              <div>
                <span>Age</span>
                <strong>{calculateAge(patient.dob)} years</strong>
              </div>

              <div>
                <span>Phone Number</span>
                <strong>{patient.phone}</strong>
              </div>

              <div>
                <span>Email Address</span>
                <strong>{patient.user?.email}</strong>
              </div>

              <div>
                <span>Address</span>
                <strong>{patient.address}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PatientProfileSection;