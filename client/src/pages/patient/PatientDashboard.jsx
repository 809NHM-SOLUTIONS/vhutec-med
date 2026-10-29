import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiUser,
  FiUsers,
  FiX,
  FiChevronLeft,
} from "react-icons/fi";

import {
  fetchMyProfile,
  fetchDepartments,
  fetchDoctors,
  fetchMyAppointments,
  createAppointment,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
} from "../../api/api";

import PatientQueueStatus from "./patientQueueStatus";
import TimeSlotPicker from "./timeSlotPicker";

import "./PatientDashboard.css";

import { io } from "socket.io-client";

import NotificationBell from "../../components/notifications/NotificationBell";

// Appointment.status is CANCELLED/COMPLETED => history, everything else => upcoming/active.
const HISTORY_STATUSES = ["COMPLETED", "CANCELLED"];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "09:30",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
];

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

function statusBadgeClass(status) {
  switch (status) {
    case "CONFIRMED":
    case "CHECKED_IN":
    case "IN_PROGRESS":
    case "COMPLETED":
      return "status-confirmed";
    case "PENDING":
      return "status-pending";
    case "CANCELLED":
      return "status-cancelled";
    default:
      return "status-pending";
  }
}

function statusLabel(status) {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function MiniCalendar({ appointments, month, onMonthChange }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const startWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Count appointments per day. Uses the raw YYYY-MM-DD slice to avoid
  // timezone drift from `new Date("2025-01-15")` in negative-offset zones.
  const countByDay = useMemo(() => {
    const map = new Map();
    appointments.forEach((appointment) => {
      if (!appointment.date) return;
      const key = String(appointment.date).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [appointments]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthLabel = month.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section className="dashboard-card mini-calendar-card">
      <div className="calendar-header">
        <div>
          <span className="section-label">CALENDAR</span>
          <h3>{monthLabel}</h3>
        </div>

        <div className="calendar-nav">
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            aria-label="Previous month"
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            aria-label="Next month"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="calendar-day calendar-day-empty"
              />
            );
          }

          const key = `${year}-${String(monthIndex + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;
          const count = countByDay.get(key) || 0;
          const hasAppointment = count > 0;
          const isToday = key === todayKey;

          return (
  <div
    key={key}
    className={`calendar-day${hasAppointment ? " has-appointment" : ""}${
      isToday ? " is-today" : ""
    }`}
    title={
      hasAppointment
        ? `${count} appointment${count > 1 ? "s" : ""}`
        : undefined
    }
  >
    <span>{day}</span>
  </div>
);
        })}
      </div>

      <div className="calendar-legend">
        <span>
          <i className="legend-appointment" />
          Appointment
        </span>
        <span>
          <i className="legend-today" />
          Today
        </span>
      </div>
    </section>
  );
}

function PatientDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Logged-in patient profile ----
  const [patient, setPatient] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  // ---- Reference data for booking ----
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [referenceDataLoading, setReferenceDataLoading] = useState(true);
  const [referenceDataError, setReferenceDataError] = useState("");

  // ---- This patient's appointments ----
  const [appointments, setAppointments] = useState([]);

  // ---- Patient notifications ----
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
});

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError("");
      const result = await fetchMyProfile();
      setPatient(result.data);
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfileError(error.message || "Unable to load your profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError("");
      const result = await fetchMyAppointments();
      setAppointments(result.data || []);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      setAppointmentsError(error.message || "Unable to load your appointments.");
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      setReferenceDataLoading(true);
      setReferenceDataError("");

      const [departmentsRes, doctorsRes] = await Promise.all([
        fetchDepartments(),
        fetchDoctors(),
      ]);

      setDepartments(departmentsRes.data || []);
      setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error("Failed to load booking reference data:", error);
      setReferenceDataError(
        error.message || "Unable to load departments and doctors."
      );
    } finally {
      setReferenceDataLoading(false);
    }
  };

  const loadNotifications = async () => {
  try {
    setNotificationsLoading(true);
    setNotificationsError("");

    const [notificationsResult, countResult] = await Promise.all([
      fetchNotifications(20),
      fetchUnreadNotificationCount(),
    ]);

    setNotifications(notificationsResult.data || []);
    setUnreadNotificationCount(Number(countResult.count) || 0);
  } catch (error) {
    console.error("Failed to load notifications:", error);
    setNotificationsError("Unable to load notifications. Please try again.");
  } finally {
    setNotificationsLoading(false);
  }
};

  const handleMarkNotificationAsRead = async (notification) => {
  if (!notification) return false;
  if (notification.readAt) return true;

  try {
    await markNotificationAsRead(notification.id);

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )
    );

    setUnreadNotificationCount((count) => Math.max(0, count - 1));

    return true;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    setNotificationsError(
      "Unable to update this notification. Please try again."
    );
    return false;
  }
};

  useEffect(() => {
    loadProfile();
    loadReferenceData();
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  loadNotifications();

  const token = localStorage.getItem("token");
  if (!token) return;

  const socket = io("http://localhost:5000", {
    auth: { token },
  });

  socket.on("notification:new", () => {
    loadNotifications();
  });

  socket.on("connect", () => {
    loadNotifications();
  });

  return () => {
    socket.disconnect();
  };
  // Load notifications when the dashboard mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const menuItems = [
    { label: "Dashboard", icon: FiGrid },
    { label: "My Profile", icon: FiUser },
    { label: "Book Appointment", icon: FiCalendar },
    { label: "My Appointments", icon: FiFileText },
    { label: "Appointment History", icon: FiClock },
    { label: "Queue Status", icon: FiUsers },
    { label: "Notifications", icon: FiBell },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleNavigation = (label) => {
    setActiveSection(label);
    setSidebarOpen(false);
  };

  const handleCalendarMonthChange = (delta) => {
  setCalendarMonth(
    (current) =>
      new Date(current.getFullYear(), current.getMonth() + delta, 1)
  );
};

  // ---- Booking form ----
  const [appointmentForm, setAppointmentForm] = useState({
    departmentId: "",
    doctorId: "",
    date: "",
    time: "",
    reason: "",
  });

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  // Bumped after a booking conflict so the time slots are checked again.
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);

  const availableDoctors = useMemo(() => {
    if (!appointmentForm.departmentId) return [];

    const deptId = Number(appointmentForm.departmentId);

    // Each doctor from GET /api/doctors already carries its own
    // department assignments: departments: [{ departmentId, department }]
    return doctors.filter((doctor) =>
      (doctor.departments || []).some(
        (assignment) => Number(assignment.departmentId) === deptId
      )
    );
  }, [appointmentForm.departmentId, doctors]);

  const handleDepartmentChange = (event) => {
    setAppointmentForm({
      ...appointmentForm,
      departmentId: event.target.value,
      doctorId: "", // reset doctor when department changes
      time: "", // a chosen time only applies to the previous doctor
    });
  };

  const handleAppointmentSubmit = async (event) => {
    event.preventDefault();

    setBookingError("");
    setBookingSuccess(false);

    const { departmentId, doctorId, date, time, reason } = appointmentForm;

    if (!departmentId || !doctorId || !date || !time || !reason.trim()) {
      setBookingError("Please fill in every field before submitting.");
      return;
    }

    try {
      setBookingLoading(true);

      await createAppointment({
        departmentId: Number(departmentId),
        doctorId: Number(doctorId),
        date,
        timeSlot: time,
        reason: reason.trim(),
      });

      setBookingSuccess(true);

      setAppointmentForm({
        departmentId: "",
        doctorId: "",
        date: "",
        time: "",
        reason: "",
      });

      // Refresh so the new booking shows up immediately.
      loadAppointments();
    } catch (error) {
      console.error("Booking error:", error);

      if (error.status === 409) {
        // Someone else took the slot after it was shown. Clear the choice and
        // re-check availability so the patient can pick another time.
        setAppointmentForm((current) => ({ ...current, time: "" }));
        setSlotRefreshKey((key) => key + 1);
        setBookingError(
          "That time was just booked by someone else. Please choose another available time."
        );
      } else {
        setBookingError(
          error.message || "Unable to submit your appointment. Please try again."
        );
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    (appointment) => !HISTORY_STATUSES.includes(appointment.status)
  );

  const historyAppointments = appointments.filter((appointment) =>
    HISTORY_STATUSES.includes(appointment.status)
  );

  const nextAppointment = useMemo(() => {
    const sorted = [...upcomingAppointments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return sorted[0] || null;
  }, [upcomingAppointments]);

  const patientFullName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "";

  const patientInitials = patient
    ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase()
    : "";

  const renderProfileSection = () => (
    <section className="dashboard-section">
      <div className="section-page-header">
        <div>
          <span className="section-label">PATIENT PROFILE</span>
          <h2>My Profile</h2>
          <p>View your personal and healthcare information.</p>
        </div>
      </div>

      {profileLoading && <p>Loading your profile...</p>}
      {profileError && <div className="auth-error">{profileError}</div>}

      {patient && (
        <div className="profile-page-card">
          <div className="profile-page-header">
            <div className="profile-page-avatar">{patientInitials}</div>

            <div>
              <h3>{patientFullName}</h3>
              <p>Patient · ID {patient.patientNumber}</p>
            </div>
          </div>

          <div className="profile-information-grid">
  <div>
    <span>Full Name</span>
    <strong>{patientFullName}</strong>
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
        </div>
      )}
    </section>
  );

  const renderBookAppointmentSection = () => (
    <section className="dashboard-section">
      <div className="section-page-header">
        <h2>Book Appointment</h2>
        <p>Schedule an appointment with one of our healthcare professionals.</p>
      </div>

      {bookingSuccess && (
        <div className="booking-success">
          <FiCheckCircle />
          <div>
            <strong>Appointment request submitted</strong>
            <p>
              Your appointment has been recorded successfully and is now{" "}
              <strong>Pending</strong> confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBookingSuccess(false)}
            aria-label="Close success message"
          >
            <FiX />
          </button>
        </div>
      )}

      {bookingError && <div className="auth-error">{bookingError}</div>}

      {referenceDataError && (
        <div className="auth-error">{referenceDataError}</div>
      )}

      <div className="profile-page-card">
        {referenceDataLoading ? (
          <p>Loading departments and doctors...</p>
        ) : (
          <form className="appointment-form" onSubmit={handleAppointmentSubmit}>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={appointmentForm.departmentId}
                onChange={handleDepartmentChange}
                required
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="doctor">Doctor</label>
              <select
                id="doctor"
                value={appointmentForm.doctorId}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    doctorId: event.target.value,
                    time: "",
                  })
                }
                disabled={!appointmentForm.departmentId}
                required
              >
                <option value="">
                  {appointmentForm.departmentId
                    ? "Select doctor"
                    : "Select a department first"}
                </option>
                {availableDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.firstName} {doctor.lastName} ({doctor.speciality})
                  </option>
                ))}
              </select>
              {appointmentForm.departmentId &&
                availableDoctors.length === 0 && (
                  <small>No doctors are currently assigned to this department.</small>
                )}
            </div>

            <div className="form-group">
              <label htmlFor="date">Preferred Date</label>
              <input
                id="date"
                type="date"
                value={appointmentForm.date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    date: event.target.value,
                    time: "",
                  })
                }
                required
              />
            </div>

            <div className="form-group form-group-full">
              <label>Preferred Time</label>
              <TimeSlotPicker
                slots={TIME_SLOTS}
                doctorId={appointmentForm.doctorId}
                date={appointmentForm.date}
                value={appointmentForm.time}
                refreshKey={slotRefreshKey}
                onChange={(time) =>
                  setAppointmentForm((current) => ({ ...current, time }))
                }
              />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="reason">Reason for Visit</label>
              <textarea
                id="reason"
                rows="4"
                placeholder="Briefly describe the reason for your appointment..."
                value={appointmentForm.reason}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    reason: event.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={bookingLoading}
              >
                <FiCalendar />
                {bookingLoading ? "Submitting..." : "Request Appointment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  const renderAppointmentsTable = (list) => (
    <div className="appointments-table-wrapper">
      <table className="appointments-table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Department</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={5}>No appointments to show.</td>
            </tr>
          ) : (
            list.map((appointment) => (
              <tr key={appointment.id}>
                <td>
                  <div className="doctor-cell">
                    <div className="doctor-avatar">
                      <FiUser />
                    </div>
                    <div>
                      <strong>
                        Dr. {appointment.doctor?.firstName}{" "}
                        {appointment.doctor?.lastName}
                      </strong>
                    </div>
                  </div>
                </td>

                <td>{appointment.department?.name}</td>
                <td>{formatDateDisplay(appointment.date)}</td>
                <td>{appointment.timeSlot}</td>

                <td>
                  <span className={`status-badge ${statusBadgeClass(appointment.status)}`}>
                    {statusLabel(appointment.status)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

 const renderMyAppointmentsSection = () => (
  <section className="dashboard-section">
    <div className="section-page-header">
      <h2>My Appointments</h2>
      <p>View and manage your upcoming and scheduled appointments.</p>
    </div>

    <div className="appointments-list-card">
      <div className="appointments-list-header">
        <div>
          <h3>Scheduled Appointments</h3>
          <p>Your current appointments with Vhutec Med.</p>
        </div>

        {!appointmentsLoading && !appointmentsError && (
          <span className="appointments-count-badge">
            {upcomingAppointments.length}{" "}
            {upcomingAppointments.length === 1
              ? "appointment"
              : "appointments"}
          </span>
        )}
      </div>

      {appointmentsLoading ? (
        <p className="appointments-loading">Loading appointments...</p>
      ) : appointmentsError ? (
        <div className="auth-error">{appointmentsError}</div>
      ) : upcomingAppointments.length === 0 ? (
        <div className="appointments-empty">
          <div className="appointments-empty-icon">
            <FiCalendar />
          </div>
          <h4>No upcoming appointments</h4>
          <p>You don't have any scheduled appointments yet.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => handleNavigation("Book Appointment")}
          >
            <FiCalendar />
            Book Appointment
          </button>
        </div>
      ) : (
        renderAppointmentsTable(upcomingAppointments)
      )}
    </div>
  </section>
);

  const renderAppointmentHistorySection = () => (
    <section className="dashboard-section">
      <div className="section-page-header">
        <h2>Appointment History</h2>
        <p>Review your previous appointments and consultations.</p>
      </div>

      <div className="appointments-list-card">
        <div className="appointments-list-header">
          <div>
            <h3>Previous Appointments</h3>
            <p>Your completed and cancelled appointments.</p>
          </div>
        </div>

        {appointmentsLoading ? (
          <p>Loading appointments...</p>
        ) : appointmentsError ? (
          <div className="auth-error">{appointmentsError}</div>
        ) : (
          renderAppointmentsTable(historyAppointments)
        )}
      </div>
    </section>
  );

  // Live queue data for the logged-in patient (GET /api/patients/me/queue).
  const renderQueueStatusSection = () => (
    <PatientQueueStatus onNavigate={handleNavigation} />
  );

  // NOTE: Notifications is not wired to the backend yet.
  const renderNotificationsSection = () => (
    <section className="dashboard-section">
      <div className="section-page-header">
        <h2>Notifications</h2>
        <p>Stay updated with your appointments, queue and prescriptions.</p>
      </div>

      <div className="notifications-page-card">
        <div className="notifications-page-header">
          <div>
            <h3>Recent Notifications</h3>
            <p>Your latest updates from Vhutec Med.</p>
          </div>

          <span className="notification-count">
            {unreadNotificationCount} unread
          </span>
        </div>

        {notificationsLoading ? (
          <div className="notifications-page-list">
            <div className="notification-page-item">
              <div className="notification-page-content">
                <p>Loading your notifications...</p>
              </div>
            </div>
          </div>
        ) : notificationsError ? (
          <div className="notifications-page-list">
            <div className="notification-page-item">
              <div className="notification-page-content">
                <p>{notificationsError}</p>
                <button type="button" onClick={loadNotifications}>
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-page-list">
            <div className="notification-page-item">
              <div className="notification-page-icon">
                <FiBell />
              </div>
              <div className="notification-page-content">
                <strong>You're all caught up</strong>
                <p>
                  New appointment and healthcare updates will appear here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="notifications-page-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="notification-page-item"
                style={{
                  background: notification.readAt ? "transparent" : "var(--primary-light)",
                }}
              >
                <div className="notification-page-icon">
                  <FiBell />
                </div>

                <div className="notification-page-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <span>
                    {notification.createdAt
                      ? new Date(notification.createdAt).toLocaleString("en-ZA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : ""}
                  </span>

                  {!notification.readAt && (
                    <div>
                      <button
                        type="button"
                        className="notification-mark-read"
                        onClick={() =>
                          handleMarkNotificationAsRead(notification)
                        }
                      >
                        Mark as read
                      </button>
                    </div>
                  )}
                </div>

                {!notification.readAt && (
                  <span className="notification-arrow" title="Unread">
                    •
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="patient-dashboard">
      <aside className={`patient-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="patient-brand">
          <div className="patient-brand-icon">
            <img src="/images/logo/logo.jpeg" alt="Vhutec Med logo" />
          </div>

          <div>
            <h2>Vhutec Med</h2>
            <span>Patient Portal</span>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX />
          </button>
        </div>

        <nav className="patient-navigation">
          <p className="navigation-title">MAIN MENU</p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`navigation-item ${
                  activeSection === item.label ? "active" : ""
                }`}
                onClick={() => handleNavigation(item.label)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <FiMessageSquare />
            <div>
              <strong>Need help?</strong>
              <span>Contact Vhutec Med support.</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="patient-main">
        <header className="patient-header">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu />
            </button>

            <div>
              {/* <p className="header-label">Patient Dashboard</p>
              <h1>
                Good day{patient ? `, ${patient.firstName}` : ""} 👋
              </h1> */}
            </div>
          </div>

          <div className="header-actions">
            <NotificationBell
  notifications={notifications}
  unreadCount={unreadNotificationCount}
  loading={notificationsLoading}
  error={notificationsError}
  onRefresh={loadNotifications}
  onMarkAsRead={handleMarkNotificationAsRead}
  onViewAll={() => handleNavigation("Notifications")}
/>

            <div className="header-profile">
              <div className="profile-avatar">{patientInitials}</div>
              <div>
                <strong>{patientFullName}</strong>
                <span>Patient</span>
              </div>
            </div>
          </div>
        </header>

        <section className="dashboard-content">
          {activeSection === "My Profile" ? (
            renderProfileSection()
          ) : activeSection === "Book Appointment" ? (
            renderBookAppointmentSection()
          ) : activeSection === "My Appointments" ? (
            renderMyAppointmentsSection()
          ) : activeSection === "Appointment History" ? (
            renderAppointmentHistorySection()
          ) : activeSection === "Queue Status" ? (
            renderQueueStatusSection()
          ) : activeSection === "Notifications" ? (
            renderNotificationsSection()
          ) : (
            <>
              <div className="welcome-banner">
                <div>
                  <span className="banner-label">WELCOME BACK</span>
                  <h2>Your health, your priority.</h2>
                  <p>
                    Manage your appointments, track your queue and keep up with
                    your healthcare information.
                  </p>
                </div>

                <div className="banner-icon">
                  <FiActivity />
                </div>
              </div>

              <div className="overview-grid">
                <div className="overview-card">
                  <div className="overview-icon blue">
                    <FiCalendar />
                  </div>
                  <div>
                    <span>Upcoming Appointments</span>
                    <strong>{upcomingAppointments.length}</strong>
                    <small>
                      {nextAppointment
                        ? `Next: ${formatDateDisplay(nextAppointment.date)}`
                        : "No upcoming appointments"}
                    </small>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="overview-icon green">
                    <FiCheckCircle />
                  </div>
                  <div>
                    <span>Completed Visits</span>
                    <strong>
                      {
                        appointments.filter((a) => a.status === "COMPLETED")
                          .length
                      }
                    </strong>
                    <small>All-time consultations</small>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="overview-icon purple">
                    <FiFileText />
                  </div>
                  <div>
                    <span>Total Appointments</span>
                    <strong>{appointments.length}</strong>
                    <small>All bookings on record</small>
                  </div>
                </div>
              </div>

              {nextAppointment && (
                <div className="dashboard-columns">
                  <section className="dashboard-card upcoming-card">
                    <div className="card-header">
                      <div>
                        <span className="section-label">NEXT APPOINTMENT</span>
                        <h3>Upcoming Appointment</h3>
                      </div>

                      <span
                        className={`status-badge ${statusBadgeClass(
                          nextAppointment.status
                        )}`}
                      >
                        {statusLabel(nextAppointment.status)}
                      </span>
                    </div>

                    <div className="appointment-main">
                      <div className="doctor-avatar">
                        {nextAppointment.doctor?.firstName?.[0]}
                        {nextAppointment.doctor?.lastName?.[0]}
                      </div>

                      <div className="doctor-details">
                        <h4>
                          Dr. {nextAppointment.doctor?.firstName}{" "}
                          {nextAppointment.doctor?.lastName}
                        </h4>
                        <p>{nextAppointment.department?.name}</p>
                      </div>
                    </div>

                    <div className="appointment-details">
                      <div>
                        <FiCalendar />
                        <span>{formatDateDisplay(nextAppointment.date)}</span>
                      </div>

                      <div>
                        <FiClock />
                        <span>{nextAppointment.timeSlot}</span>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => handleNavigation("My Appointments")}
                    >
                      View Appointment
                      <FiChevronRight />
                    </button>
                  </section>

                   <MiniCalendar
                    appointments={upcomingAppointments}
                    month={calendarMonth}
                    onMonthChange={handleCalendarMonthChange}
                  />
                </div>
              )}

              <section className="dashboard-card">
                <div className="card-header">
                  <div>
                    <span className="section-label">APPOINTMENTS</span>
                    <h3>My Appointments</h3>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => handleNavigation("My Appointments")}
                  >
                    View all <FiChevronRight />
                  </button>
                </div>

                {appointmentsLoading ? (
                  <p>Loading appointments...</p>
                ) : (
                  renderAppointmentsTable(appointments.slice(0, 5))
                )}
              </section>

              {/* {patient && (
                <section className="profile-summary-card">
                  <div className="profile-summary-avatar">
                    {patientInitials}
                  </div>

                  <div className="profile-summary-info">
                    <span className="section-label">PATIENT PROFILE</span>
                    <h3>{patientFullName}</h3>
                    <p>
                      
                        National ID: <strong>{patient.idNumber}</strong>
                      
                    </p>
                  </div>

                  <div className="profile-summary-details">
                    <div>
                      <span>Date of Birth</span>
                      <strong>{formatDateDisplay(patient.dob)}</strong>
                    </div>

                    <div>
                      <span>Age</span>
                      <strong>{calculateAge(patient.dob)} years</strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>{patient.phone}</strong>
                    </div>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => handleNavigation("My Profile")}
                  >
                    View Profile
                    <FiChevronRight />
                  </button>
                </section>
              )} */}

              {patient && (
  <section className="profile-summary-card">
    <div className="profile-summary-identity">
      <div className="profile-summary-avatar">{patientInitials}</div>

      <div>
        <span className="section-label">PATIENT PROFILE</span>
        <h3>{patientFullName}</h3>
        <p>Patient No. {patient.patientNumber || "—"}</p>
      </div>
    </div>

    <div className="profile-summary-stats">
      <div>
        <span>Date of Birth</span>
        <strong>{formatDateDisplay(patient.dob)}</strong>
      </div>

      <div>
        <span>Age</span>
        <strong>{calculateAge(patient.dob)} years</strong>
      </div>

      <div>
        <span>Phone</span>
        <strong>{patient.phone}</strong>
      </div>
    </div>

    <button
      type="button"
      className="text-button profile-summary-action"
      onClick={() => handleNavigation("My Profile")}
    >
      View Profile
      <FiChevronRight />
    </button>
  </section>
)}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default PatientDashboard;