import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiUserCheck,
  FiUsers,
  FiBell,
} from "react-icons/fi";

// The api file is src/api/api.js (this page is src/pages/receptionist/).
import {
  callNextPatient,
  callSpecificPatient,
  updateQueueStatus,
  checkInAppointment,
  fetchReceptionAppointments,
  fetchReceptionOverview,
  fetchReceptionPatients,
  fetchReceptionQueue,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  fetchDepartments,
fetchDoctors,
fetchDoctorDepartments,
fetchBookedSlots,
createAppointment,
} from "../../api/api";

import "./ReceptionistDashboard.css";
import "./manageQueue.css";

import { io } from "socket.io-client";

import TimeSlotPicker from "../patient/Timeslotpicker";

import NotificationBell from "../../components/notifications/NotificationBell";
import useNotifications from "../../components/notifications/useNotifications";

const NAVIGATION = [
  { label: "Dashboard", icon: FiGrid },
  { label: "Appointments", icon: FiCalendar },
  { label: "Book Appointment", icon: FiCalendar },
  { label: "Queue", icon: FiClock },
  { label: "Patients", icon: FiUsers },
  { label: "Manage Queue", icon: FiUserCheck },
  { label: "Notifications", icon: FiBell },
];

const REFRESH_MS = 30000;

const APPOINTMENT_STATUS = {
  PENDING: { label: "Pending", className: "pending" },
  CONFIRMED: { label: "Confirmed", className: "confirmed" },
  CHECKED_IN: { label: "Checked In", className: "checked" },
  IN_PROGRESS: { label: "In Progress", className: "in-progress" },
  COMPLETED: { label: "Completed", className: "completed" },
  CANCELLED: { label: "Cancelled", className: "cancelled" },
};

const QUEUE_STATUS = {
  WAITING: { label: "Waiting", className: "waiting" },
  CALLED: { label: "Called", className: "called" },
  IN_CONSULTATION: { label: "In Consultation", className: "in-consultation" },
  COMPLETED: { label: "Completed", className: "completed" },
};

const ACTIVITY_ICONS = {
  checkin: FiUserCheck,
  called: FiClock,
  completed: FiCheckCircle,
};

const stateStyle = {
  color: "var(--reception-muted)",
  fontSize: "13px",
  padding: "8px 0",
};

/* ---------- helpers ---------- */

const formatShortDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatLongDate = (dateKey) =>
  dateKey
    ? new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const timeAgo = (iso) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return formatShortDate(iso);
};

// Reads the first HH:MM found in a time slot such as "09:30" or "09:30 - 10:00".
const startMinutes = (timeSlot) => {
  const match = /(\d{1,2}):(\d{2})/.exec(timeSlot || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};



const isAppointmentBeingHandled = (appointment) =>
  ["CHECKED_IN", "IN_PROGRESS"].includes(appointment.status) ||
  ["WAITING", "CALLED", "IN_CONSULTATION"].includes(
    appointment.queue?.status
  );

const isAppointmentTimePassed = (appointment, fallbackDate) => {
  const appointmentDate = String(
    appointment.date || fallbackDate || ""
  ).slice(0, 10);

  if (!appointmentDate) return false;

  const now = new Date();
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (appointmentDate < todayKey) return true;
  if (appointmentDate > todayKey) return false;

  const appointmentMinutes = startMinutes(appointment.timeSlot);

  if (appointmentMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return appointmentMinutes < currentMinutes;
};

const isActiveAppointment = (appointment, fallbackDate) => {
  if (["COMPLETED", "CANCELLED"].includes(appointment.status)) {
    return false;
  }

  // Keep patients who have already checked in or are being attended to.
  if (isAppointmentBeingHandled(appointment)) {
    return true;
  }

  return !isAppointmentTimePassed(appointment, fallbackDate);
};


const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

const fileNumber = (value) => value || "-";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    return {};
  }
};

/* ---------- data loading ---------- */

// Loads data once, then refreshes it on an interval when one is given.
// `reload` fetches again straight away (used after an action succeeds or fails).
const useLiveData = (loader, intervalMs) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tokenRef = useRef({ cancelled: false });

  const load = useCallback(
    async (initial, token) => {
      try {
        const result = await loader();
        if (!token.cancelled) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (!token.cancelled) setError(err.message);
      } finally {
        if (!token.cancelled && initial) setLoading(false);
      }
    },
    [loader]
  );


  useEffect(() => {
    const token = { cancelled: false };
    tokenRef.current = token;

    load(true, token);
    const timer = intervalMs ? setInterval(() => load(false, token), intervalMs) : null;

    return () => {
      token.cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [load, intervalMs]);

  const reload = useCallback(() => load(false, tokenRef.current), [load]);

  return { data, loading, error, reload };
};

// Runs one action at a time (Check In, Call Next) and keeps a message for it:
// "loading" while it runs, then "success" or "error". The data is reloaded
// afterwards either way, so the screen always matches the database.
const NOTICE_COLORS = {
  loading: "var(--reception-muted)",
  success: "#0f766e",
  error: "#b91c1c",
};

const useAction = (reload) => {
  const [busyKey, setBusyKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const busyRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const run = async (key, loadingText, task) => {
    if (busyRef.current) return; // ignore double clicks while one action runs
    busyRef.current = true;
    clearTimeout(timerRef.current);
    setBusyKey(key);
    setNotice({ type: "loading", text: loadingText });

    try {
      const result = await task();
      setNotice({ type: "success", text: result?.message || "Done." });
      timerRef.current = setTimeout(() => setNotice(null), 6000);
    } catch (err) {
      setNotice({ type: "error", text: err.message });
      timerRef.current = setTimeout(() => setNotice(null), 9000);
    } finally {
      busyRef.current = false;
      setBusyKey(null);
      reload();
    }
  };

  return { busyKey, busy: busyKey !== null, notice, run };
};

/* ---------- small shared components ---------- */

const DataState = ({ loading, error, data, children }) => {
  if (loading) return <p style={stateStyle}>Loading...</p>;
  if (!data && error) {
    return (
      <p style={stateStyle} role="alert">
        {error}
      </p>
    );
  }
  return children;
};

const Notice = ({ notice }) =>
  notice ? (
    <p
      role={notice.type === "error" ? "alert" : "status"}
      style={{
        ...stateStyle,
        color: NOTICE_COLORS[notice.type],
        fontWeight: 600,
      }}
    >
      {notice.text}
    </p>
  ) : null;

const busyStyle = (busy) =>
  busy ? { opacity: 0.6, cursor: "not-allowed" } : undefined;

const CallNextButton = ({ action, waiting }) => (
  <button
    type="button"
    className="reception-search-button"
    disabled={action.busy || waiting === 0}
    style={busyStyle(action.busy || waiting === 0)}
    onClick={() =>
      action.run("call-next", "Calling the next patient...", callNextPatient)
    }
  >
    {action.busyKey === "call-next" ? "Calling..." : "Call Next"}
  </button>
);

const SectionHeader = ({ title, text }) => (
  <div className="reception-section-header">
    <h2>{title}</h2>
    <p>{text}</p>
  </div>
);

const StatCard = ({ icon: Icon, label, value, note, wrapIcon }) => (
  <div className="reception-stat-card">
    {wrapIcon ? (
      <div className="reception-stat-top">
        <div className="reception-stat-icon">
          <Icon />
        </div>
      </div>
    ) : (
      <div className="reception-stat-icon">
        <Icon />
      </div>
    )}
    <span>{label}</span>
    <h3>{value}</h3>
    <span className="reception-stat-change">{note}</span>
  </div>
);

const StatusBadge = ({ status }) => (
  <span className={`reception-status ${status.className}`}>{status.label}</span>
);

const appointmentStatus = (status) =>
  APPOINTMENT_STATUS[status] || { label: status, className: "" };

const queueStatus = (status) =>
  QUEUE_STATUS[status] || { label: status, className: "" };

const formatClock = (value) =>
  new Date(value).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const QueueItem = ({ entry }) => (
  <div className="reception-queue-item">
    <div className="reception-queue-number">
      {String(entry.queueNumber).padStart(2, "0")}
    </div>

    <div className="reception-queue-patient">
      <strong>{entry.patientName}</strong>
      <span>
  {entry.doctorName}
  {entry.checkedInAt
    ? ` | Arrived ${formatClock(entry.checkedInAt)}`
    : ""}
  {entry.calledAt
    ? ` | Called ${formatClock(entry.calledAt)}`
    : ""}
</span>
    </div>

    <span className="reception-queue-status">
      {queueStatus(entry.status).label}
    </span>
  </div>
);

/* ---------- sections ---------- */

const OverviewSection = ({ onNavigate }) => {
  const { data, loading, error, reload } = useLiveData(
    fetchReceptionOverview,
    REFRESH_MS
  );
  const action = useAction(reload);
  const [searchTerm, setSearchTerm] = useState("");

  const stats = data?.stats;
  const queue = data?.queue || [];

const activeAppointments = (data?.appointments || []).filter(
  (appointment) => isActiveAppointment(appointment, data?.date)
);


  const activeQueue = queue.filter((entry) => entry.status !== "COMPLETED");
  const matches = queue.filter((entry) =>
    `${entry.patientName} ${entry.doctorName}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase())
  );

  return (
    <>
      {/* <SectionHeader
        title="Reception Overview"
        text="Manage today's appointments, patient check-ins and the hospital queue."
      /> */}

      <DataState loading={loading} error={error} data={data}>
        {data && (
          <>
            <section className="reception-stats">
              <StatCard
                wrapIcon
                icon={FiCalendar}
                label="Today's Appointments"
                value={stats.total}
                note={`${stats.remaining} remaining today`}
              />
              <StatCard
                wrapIcon
                icon={FiUsers}
                label="Patients Waiting"
                value={stats.waiting}
                note={`${stats.inConsultation} in consultation`}
              />
              <StatCard
                wrapIcon
                icon={FiUserCheck}
                label="Checked In"
                value={stats.arrived}
                note={`${stats.inQueue} currently in queue`}
              />
              <StatCard
                wrapIcon
                icon={FiCheckCircle}
                label="Completed Today"
                value={stats.completed}
                note={`${percent(stats.completed, stats.total)}% of scheduled visits`}
              />
            </section>

            <section className="reception-grid">
              <div className="reception-card">
                <div className="reception-card-header">
                  <div>
                    <h3>Today's Queue</h3>
                    <p>Current patients waiting for consultation.</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <CallNextButton action={action} waiting={stats.waiting} />

                    <button
                      className="reception-card-link"
                      onClick={() => onNavigate("Manage Queue")}
                    >
                      Manage queue
                    </button>
                  </div>
                </div>

                <Notice notice={action.notice} />

                <div className="reception-queue">
                  {activeQueue.length > 0 ? (
                    activeQueue
                      .slice(0, 6)
                      .map((entry) => <QueueItem key={entry.id} entry={entry} />)
                  ) : (
                    <p style={stateStyle}>No patients in the queue right now.</p>
                  )}
                </div>
              </div>

              <div className="reception-card">
                <div className="reception-card-header">
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Latest reception activity.</p>
                  </div>
                </div>

                <div className="reception-activity-list">
                  {data.activity.length > 0 ? (
                    data.activity.map((item, index) => {
                      const Icon = ACTIVITY_ICONS[item.type] || FiClock;

                      return (
                        <div className="reception-activity" key={index}>
                          <div className="reception-activity-icon">
                            <Icon />
                          </div>

                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                            <p>{timeAgo(item.at)}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={stateStyle}>No activity yet today.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
                <div>
                  <h3>Today's Appointments</h3>
                  <p>Appointments scheduled for {formatLongDate(data.date)}.</p>
                </div>

                <button
                  className="reception-card-link"
                  onClick={() => onNavigate("Appointments")}
                >
                  View all
                </button>
              </div>

              <div className="reception-table-wrapper">
                <table className="reception-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Time</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeAppointments.length > 0 ? (
  activeAppointments.slice(0, 8).map((a) => (
                        <tr key={a.id}>
                          <td>{a.patientName}</td>
                          <td>{a.doctorName}</td>
                          <td>{a.timeSlot}</td>
                          <td>{a.department}</td>
                          <td>
                            <StatusBadge status={appointmentStatus(a.status)} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>No appointments scheduled for today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
                <div>
                  <h3>Find Patient</h3>
                  <p>Search the current queue by patient or doctor.</p>
                </div>
              </div>

              <div className="reception-search">
                <div className="reception-search-box">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search patient or doctor..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="reception-search-button"
                  onClick={() => setSearchTerm("")}
                >
                  Clear
                </button>
              </div>

              {searchTerm && (
                <div className="reception-queue">
                  {matches.length > 0 ? (
                    matches.map((entry) => <QueueItem key={entry.id} entry={entry} />)
                  ) : (
                    <p style={stateStyle}>No patients found.</p>
                  )}
                </div>
              )}
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Common receptionist tasks.</p>
                </div>
              </div>

              <div className="reception-quick-actions">
                <button
                  className="reception-action"
                  onClick={() => onNavigate("Manage Queue")}
                >
                  <FiUserCheck />
                  <span>Check In Patient</span>
                </button>

                <button
                  className="reception-action"
                  onClick={() => onNavigate("Appointments")}
                >
                  <FiCalendar />
                  <span>Manage Appointments</span>
                </button>

                <button
                  className="reception-action"
                  onClick={() => onNavigate("Manage Queue")}
                >
                  <FiClock />
                  <span>Manage Queue</span>
                </button>

                <button
                  className="reception-action"
                  onClick={() => onNavigate("Patients")}
                >
                  <FiUsers />
                  <span>Find Patient</span>
                </button>
              </div>
            </section>
          </>
        )}
      </DataState>
    </>
  );
};


const ReceptionistBookingForm = ({ onBooked, onClose }) => {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    departmentId: "",
    doctorId: "",
    date: "",
    time: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);

  // Copy the exact TIME_SLOTS array from PatientDashboard.jsx.
  // Replace this placeholder before using the form.
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

  useEffect(() => {
    let active = true;

    Promise.all([fetchDepartments(), fetchDoctors()])
      .then(([departmentResult, doctorResult]) => {
        if (!active) return;

        setDepartments(
          Array.isArray(departmentResult)
            ? departmentResult
            : departmentResult.data || []
        );
        setDoctors(
          Array.isArray(doctorResult)
            ? doctorResult
            : doctorResult.data || []
        );
      })
      .catch(() => {
        if (active) setError("Unable to load departments and doctors.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setPatients([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await fetchReceptionPatients(search.trim());
        if (!active) return;

        const payload = result.data ?? result;
        const records = Array.isArray(payload)
          ? payload
          : payload.patients || [];

        setPatients(records);
      } catch {
        if (active) setError("Unable to search for patients.");
      } finally {
        if (active) setSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const availableDoctors = doctors.filter((doctor) =>
    (doctor.departments || []).some(
      (assignment) =>
        Number(assignment.departmentId) === Number(form.departmentId)
    )
  );

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "departmentId"
        ? { doctorId: "", time: "" }
        : {}),
      ...(field === "doctorId" || field === "date"
        ? { time: "" }
        : {}),
    }));
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !selectedPatient ||
      !form.departmentId ||
      !form.doctorId ||
      !form.date ||
      !form.time ||
      !form.reason.trim()
    ) {
      setError("Please complete all booking details.");
      return;
    }

    setLoading(true);

    try {
      await createAppointment({
        patientId: Number(selectedPatient.id),
        departmentId: Number(form.departmentId),
        doctorId: Number(form.doctorId),
        date: form.date,
        timeSlot: form.time,
        reason: form.reason.trim(),
      });

      setSuccess(
        `Appointment booked for ${selectedPatient.firstName} ${selectedPatient.lastName}. Status: Pending.`
      );

      setForm({
        departmentId: "",
        doctorId: "",
        date: "",
        time: "",
        reason: "",
      });
      setSelectedPatient(null);
      setSearch("");
      setPatients([]);
      await onBooked();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to book appointment. Please try again."
      );
      setSlotRefreshKey((key) => key + 1);
      updateForm("time", "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="reception-card">
      <div className="reception-card-header">
        <div>
          <h3>Book Appointment for Patient</h3>
          <p>Assist an existing patient with an appointment.</p>
        </div>
        <button
          type="button"
          className="reception-search-button"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      <form onSubmit={submitBooking} className="reception-booking-form">
        <label htmlFor="reception-patient-search">Find Patient</label>
        <input
          id="reception-patient-search"
          type="search"
          placeholder="Search by name, patient number or ID number"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedPatient(null);
          }}
        />

        {searching && <p>Searching patients...</p>}

        {!selectedPatient && patients.length > 0 && (
          <div className="reception-booking-results">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                className="reception-search-button"
                onClick={() => {
                  setSelectedPatient(patient);
                  setPatients([]);
                }}
              >
                {patient.firstName} {patient.lastName}
                {" — "}
                {patient.patientNumber || `Patient #${patient.id}`}
              </button>
            ))}
          </div>
        )}

        {selectedPatient && (
          <p>
            Selected: <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
            {" — "}{selectedPatient.patientNumber}
          </p>
        )}

        <label htmlFor="reception-booking-department">Department</label>
        <select
          id="reception-booking-department"
          value={form.departmentId}
          onChange={(event) => updateForm("departmentId", event.target.value)}
          required
        >
          <option value="">Select department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        <label htmlFor="reception-booking-doctor">Doctor</label>
        <select
          id="reception-booking-doctor"
          value={form.doctorId}
          onChange={(event) => updateForm("doctorId", event.target.value)}
          disabled={!form.departmentId}
          required
        >
          <option value="">Select doctor</option>
          {availableDoctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              Dr. {doctor.firstName} {doctor.lastName}
            </option>
          ))}
        </select>

        <label htmlFor="reception-booking-date">Appointment Date</label>
        <input
          id="reception-booking-date"
          type="date"
          min={new Date(
            Date.now() - new Date().getTimezoneOffset() * 60000
          ).toISOString().slice(0, 10)}
          value={form.date}
          onChange={(event) => updateForm("date", event.target.value)}
          required
        />

        <label>Available Time Slots</label>
        <TimeSlotPicker
          slots={TIME_SLOTS}
          doctorId={form.doctorId}
          date={form.date}
          value={form.time}
          refreshKey={slotRefreshKey}
          onChange={(time) => updateForm("time", time)}
        />

        <label htmlFor="reception-booking-reason">Reason for Visit</label>
        <textarea
          id="reception-booking-reason"
          rows={3}
          value={form.reason}
          onChange={(event) => updateForm("reason", event.target.value)}
          placeholder="Enter reason for appointment"
          required
        />

        <button
          type="submit"
          className="reception-search-button"
          disabled={loading || !selectedPatient || !form.time || TIME_SLOTS.length === 0}
        >
          {loading ? "Booking..." : "Confirm Appointment"}
        </button>
      </form>
    </section>
  );
};

const BookAppointmentSection = ({ onNavigate }) => {
  const handleBooked = () => {
    // The booking is already saved by ReceptionistBookingForm.
    // Stay on this page so the receptionist can see the success message.
  };

  return (
    <>
      {/* <SectionHeader
        title="Book Appointment"
        text="Schedule appointments on behalf of patients who need assistance."
      /> */}

      <ReceptionistBookingForm
        onBooked={handleBooked}
        onClose={() => onNavigate("Appointments")}
      />
    </>
  );
};

const AppointmentsSection = () => {
  const { data, loading, error, reload } = useLiveData(fetchReceptionAppointments, 60000);
  const action = useAction(reload);

  const stats = data?.stats;

const activeAppointments = (data?.appointments || []).filter(
  (appointment) => isActiveAppointment(appointment, data?.date)
);

const canCheckIn = (a) => ["PENDING", "CONFIRMED"].includes(a.status);

  return (
    <>
      <SectionHeader
        title="Appointments"
        text="Manage today's hospital appointment schedule and patient arrivals."
      />

      <DataState loading={loading} error={error} data={data}>
        {data && (
          <>
            <section className="reception-stats">
              <StatCard
                icon={FiCalendar}
                label="Today's Appointments"
                value={stats.total}
                note={`${stats.remaining} appointments remaining`}
              />
              <StatCard
                icon={FiCheckCircle}
                label="Confirmed"
                value={stats.confirmed}
                note="Ready for today's schedule"
              />
              <StatCard
                icon={FiClock}
                label="Pending"
                value={stats.pending}
                note="Requires confirmation"
              />
              <StatCard
                icon={FiUserCheck}
                label="Checked In"
                value={stats.arrived}
                note="Patients arrived today"
              />
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
  <div>
    <h3>Today's Appointment Schedule</h3>
    <p>{formatLongDate(data.date)} | Reception desk schedule</p>
  </div>


</div>

        <Notice notice={action.notice} />

              <div className="reception-table-wrapper">
                <table className="reception-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeAppointments.length > 0 ? (
                activeAppointments.map((a) => (
                        <tr key={a.id}>
                          <td>{a.timeSlot}</td>
                          <td>{a.patientName}</td>
                          <td>{a.doctorName}</td>
                          <td>{a.department}</td>
                          <td>
                            <StatusBadge status={appointmentStatus(a.status)} />
                          </td>
                          <td>
                            {canCheckIn(a) ? (
                              <button
                                type="button"
                                className="reception-search-button"
                                disabled={action.busy}
                                style={busyStyle(action.busy)}
                                onClick={() =>
                                  action.run(
                                    `checkin-${a.id}`,
                                    `Checking in ${a.patientName}...`,
                                    () => checkInAppointment(a.id)
                                  )
                                }
                              >
                                {action.busyKey === `checkin-${a.id}`
                                  ? "Checking in..."
                                  : "Check In"}
                              </button>
                            ) : a.queueNumber ? (
                              `Queue #${String(a.queueNumber).padStart(2, "0")}`
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>No appointments scheduled for today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </DataState>
    </>
  );
};

// Read-only view of today's queue. All actions live in Manage Queue.
const QueueSection = () => {
  const { data, loading, error } = useLiveData(fetchReceptionQueue, REFRESH_MS);
  const stats = data?.stats;

  return (
    <>
      <SectionHeader
        title="Patient Queue"
        text="Live view of patients currently in today's queue."
      />

      <DataState loading={loading} error={error} data={data}>
        {data && (
          <>
            <section className="reception-stats">
              <StatCard
                icon={FiUsers}
                label="Patients Waiting"
                value={stats.waiting}
                note="Across today's queue"
              />
              <StatCard
                icon={FiUserCheck}
                label="Checked In"
                value={stats.arrived}
                note="Patients arrived today"
              />
              <StatCard
                icon={FiClock}
                label="Average Wait"
                value={stats.avgWaitMinutes === null ? "-" : `${stats.avgWaitMinutes} min`}
                note="Check-in to being called"
              />
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
                <div>
                  <h3>Live Patient Queue</h3>
                  <p>Current queue position and consultation status.</p>
                </div>
              </div>

              <div className="reception-workspace-list">
                {data.queue.length > 0 ? (
                  data.queue.map((entry) => (
                    <div className="reception-workspace-row" key={entry.id}>
                      <div>
                        <strong>
                          #{String(entry.queueNumber).padStart(2, "0")} |{" "}
                          {entry.patientName}
                        </strong>

                        <span>
                          {fileNumber(entry.patientNumber)} | {entry.doctorName} |{" "}
                          {entry.department}
                          {entry.checkedInAt ? ` | Arrived ${formatClock(entry.checkedInAt)}` : ""}
                          {entry.calledAt ? ` | Called ${formatClock(entry.calledAt)}` : ""}
                        </span>
                      </div>
                      <StatusBadge
                        status={
                          entry.appointmentStatus === "CANCELLED"
                            ? { label: "Cancelled", className: "cancelled" }
                            : queueStatus(entry.status)
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p style={stateStyle}>No patients in the queue today.</p>
                )}
              </div>
            </section>
          </>
        )}
      </DataState>
    </>
  );
};

const PatientsSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loader = useCallback(
    () => fetchReceptionPatients(debouncedSearch),
    [debouncedSearch]
  );
  const { data, loading, error } = useLiveData(loader);

  return (
    <>
      <SectionHeader
        title="Patients"
        text="Search and view registered patient information."
      />

      <section className="reception-card">
        <div className="reception-card-header">
          <div>
            <h3>Patient Directory</h3>
            <p>Registered patients currently using Vhutec Med.</p>
          </div>

          <div className="reception-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search patient..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <DataState loading={loading} error={error} data={data}>
          {data && (
            <div className="reception-table-wrapper">
              <table className="reception-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>File Number</th>
                    <th>Phone</th>
                    <th>Last Appointment</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {data.patients.length > 0 ? (
                    data.patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.name}</td>
                        <td>{fileNumber(patient.patientNumber)}</td>
                        <td>{patient.phone}</td>
                        <td>{formatShortDate(patient.lastAppointment)}</td>
                        <td>
                          {patient.lastStatus ? (
                            <StatusBadge status={appointmentStatus(patient.lastStatus)} />
                          ) : (
                            "No visits"
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No patients found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </section>
    </>
  );
};

const QUEUE_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "WAITING", label: "Waiting" },
  { key: "CALLED", label: "Called" },
  { key: "IN_CONSULTATION", label: "In Consultation" },
  { key: "COMPLETED", label: "Completed" },
];

// Order in the Manage Queue list: patients being seen first, finished last.
const STATUS_RANK = { IN_CONSULTATION: 0, CALLED: 1, WAITING: 2, COMPLETED: 3 };

// The one step a patient can take next, and the button that does it.
const ROW_ACTIONS = {
  WAITING: { label: "Call", busyLabel: "Calling...", status: "CALLED" },
  CALLED: {
    label: "Start consultation",
    busyLabel: "Starting...",
    status: "IN_CONSULTATION",
  },
  IN_CONSULTATION: { label: "Complete", busyLabel: "Completing...", status: "COMPLETED" },
};

const ManageQueueSection = () => {
  const { data, loading, error, reload } = useLiveData(
    fetchReceptionOverview,
    15000
  );
  const action = useAction(reload);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const queue = data?.queueAll || data?.queue || [];
  const isCancelled = (entry) => entry.appointmentStatus === "CANCELLED";
  const count = (status) => queue.filter((e) => e.status === status && !isCancelled(e)).length;

  const counts = {
    ALL: queue.filter((e) => !isCancelled(e)).length,
    WAITING: count("WAITING"),
    CALLED: count("CALLED"),
    IN_CONSULTATION: count("IN_CONSULTATION"),
    COMPLETED: count("COMPLETED"),
  };

  // Same rule the server uses for Call Next.
  const nextUp = queue
    .filter((e) => e.status === "WAITING" && !isCancelled(e))
    .sort((a, b) => a.queueNumber - b.queueNumber)[0];

  const term = search.trim().toLowerCase();
  const matchesSearch = (text) => !term || text.toLowerCase().includes(term);

  const rows = queue
    .filter((e) => filter === "ALL" || e.status === filter)
    .filter((e) =>
      matchesSearch(`${e.patientName} ${e.patientNumber || ""} ${e.doctorName}`)
    )
    .sort(
      (a, b) =>
        (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
        a.queueNumber - b.queueNumber
    );

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const arrivals = (data?.appointments || [])
    .filter((a) => ["PENDING", "CONFIRMED"].includes(a.status))
    .filter((a) =>
      matchesSearch(`${a.patientName} ${a.patientNumber || ""} ${a.doctorName}`)
    );

  const isLate = (a) => {
    const start = startMinutes(a.timeSlot);
    return start !== null && start < nowMinutes;
  };

  return (
    <>
      <SectionHeader
        title="Manage Queue"
        text="Check patients in, call them and move them through their consultation."
      />

      <DataState loading={loading} error={error} data={data}>
        {data && (
          <>
            <section className="reception-stats">
              <StatCard icon={FiUsers} label="Waiting" value={counts.WAITING} note="In the queue now" />
              <StatCard icon={FiBell} label="Called" value={counts.CALLED} note="On their way" />
              <StatCard
                icon={FiClock}
                label="In Consultation"
                value={counts.IN_CONSULTATION}
                note="With a doctor"
              />
              <StatCard
                icon={FiCheckCircle}
                label="Completed Today"
                value={counts.COMPLETED}
                note="Consultations finished"
              />
            </section>

            <Notice notice={action.notice} />

            <div className="mq-layout">
              <section className="reception-card mq-queue" aria-label="Live queue">
                <div className="reception-card-header">
                  <div>
                    <h3>Live Queue</h3>
                    <p>Update each patient as they move through the visit.</p>
                  </div>
                  <CallNextButton action={action} waiting={nextUp ? 1 : 0} />
                </div>

                <div className="mq-next">
                  {nextUp ? (
                    <>
                      <span className="mq-next-label">Next up</span>
                      <strong>
                        #{String(nextUp.queueNumber).padStart(2, "0")} {nextUp.patientName}
                      </strong>
                      <span>{nextUp.doctorName}</span>
                    </>
                  ) : (
                    <span className="mq-next-label">No patients are waiting.</span>
                  )}
                </div>

                <div className="mq-filters" role="group" aria-label="Filter queue by status">
                  {QUEUE_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`mq-filter${filter === f.key ? " active" : ""}`}
                      aria-pressed={filter === f.key}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label} <span>{counts[f.key]}</span>
                    </button>
                  ))}
                </div>

                <div className="mq-list">
                  {rows.length > 0 ? (
                    rows.map((entry) => {
                      const step = ROW_ACTIONS[entry.status];
                      const cancelled = isCancelled(entry);
                      const key = `move-${entry.queueId}`;
                      const busyHere = action.busyKey === key;

                      return (
                        <div
                          className={`mq-row${cancelled ? " cancelled" : ""}`}
                          key={entry.queueId ?? entry.id}
                        >
                          <div className="mq-number">
                            {String(entry.queueNumber).padStart(2, "0")}
                          </div>

                          <div className="mq-info">
                            <strong>{entry.patientName}</strong>
                            <span>
                              {fileNumber(entry.patientNumber)} | {entry.doctorName} |{" "}
                              {entry.department}
                            </span>
                            <span>
                              {entry.timeSlot ? `Slot ${entry.timeSlot}` : ""}
                              {entry.checkedInAt ? ` | Arrived ${formatClock(entry.checkedInAt)}` : ""}
                              {entry.calledAt ? ` | Called ${formatClock(entry.calledAt)}` : ""}
                            </span>
                          </div>

                          <div className="mq-actions">
                            <StatusBadge
                              status={
                                cancelled
                                  ? { label: "Cancelled", className: "cancelled" }
                                  : queueStatus(entry.status)
                              }
                            />
                            {step && !cancelled && (
                              <button
                                type="button"
                                className="reception-search-button"
                                aria-label={`${step.label} ${entry.patientName}`}
                                disabled={action.busy}
                                style={busyStyle(action.busy)}
                                onClick={() =>
                                  action.run(
                                    key,
                                    `Updating ${entry.patientName}...`,
                                    () =>
                                      entry.status === "WAITING"
                                        ? callSpecificPatient(entry.queueId)
                                        : updateQueueStatus(entry.queueId, step.status)
                                  )
                                }
                              >
                                {busyHere ? step.busyLabel : step.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={stateStyle}>
                      {queue.length === 0
                        ? "No patients in the queue today."
                        : "No patients match this view."}
                    </p>
                  )}
                </div>
              </section>

              <section className="reception-card mq-arrivals" aria-label="Expected arrivals">
                <div className="reception-card-header">
                  <div>
                    <h3>Check In</h3>
                    <p>Today's patients who have not arrived yet.</p>
                  </div>
                </div>

                <div className="reception-search-box mq-search">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search patient or doctor..."
                    aria-label="Search patients"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="mq-list">
                  {arrivals.length > 0 ? (
                    arrivals.map((a) => (
                      <div className="mq-row" key={a.id}>
                        <div className="mq-info">
                          <strong>{a.patientName}</strong>
                          <span>
                            {a.timeSlot} | {a.department} | {a.doctorName}
                          </span>
                        </div>

                        <div className="mq-actions">
                          <StatusBadge
                            status={
                              isLate(a)
                                ? { label: "Late", className: "pending" }
                                : { label: "Expected", className: "waiting" }
                            }
                          />
                          <button
                            type="button"
                            className="reception-search-button"
                            aria-label={`Check in ${a.patientName}`}
                            disabled={action.busy}
                            style={busyStyle(action.busy)}
                            onClick={() =>
                              action.run(
                                `checkin-${a.id}`,
                                `Checking in ${a.patientName}...`,
                                () => checkInAppointment(a.id)
                              )
                            }
                          >
                            {action.busyKey === `checkin-${a.id}` ? "Checking in..." : "Check In"}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={stateStyle}>
                      {term ? "No matching patients to check in." : "Everyone expected today has checked in."}
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </DataState>
    </>
  );
};

/* ---------- page ---------- */

const ReceptionistDashboard = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
  notifications,
  unreadCount: unreadNotificationCount,
  loading: notificationsLoading,
  error: notificationsError,
  loadNotifications,
  markAsRead: handleMarkNotificationAsRead,
} = useNotifications();

  const user = getStoredUser();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email ||
    "Reception Staff";
  const initials =
    displayName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "RS";

  const handleNavigation = (label) => {
    setActiveSection(label);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="reception-dashboard">
      <aside className={`reception-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="reception-brand">
          <div className="reception-brand-icon">
            <img src="/images/logo/logo.jpeg" alt="Vhutec Med logo" />
          </div>

          <div>
            <h2>Vhutec Med</h2>
            <span>Reception</span>
          </div>
        </div>

        <nav className="reception-nav">
          <p className="reception-nav-label">Reception</p>

          {NAVIGATION.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={activeSection === item.label ? "active" : ""}
                onClick={() => handleNavigation(item.label)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button className="reception-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <div
        className={`reception-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <main className="reception-main">
        <header className="reception-header">
          <div className="reception-header-left">
            <button
              className="reception-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu />
            </button>

            <div>
              <h1>Receptionist Dashboard</h1>
              <p>Welcome back. Manage today's hospital reception activities.</p>
            </div>
          </div>

          <div className="reception-header-actions">
  <NotificationBell
    notifications={notifications}
    unreadCount={unreadNotificationCount}
    loading={notificationsLoading}
    error={notificationsError}
    onRefresh={loadNotifications}
    onMarkAsRead={handleMarkNotificationAsRead}
    onViewAll={() => handleNavigation("Notifications")}
  />

  <div className="reception-profile">
    <div className="reception-profile-avatar">{initials}</div>

    <div className="reception-profile-info">
      <strong>{displayName}</strong>
      <span>Receptionist</span>
    </div>
  </div>
</div>
        </header>

        <section className="reception-content">
          {activeSection === "Dashboard" && (
            <OverviewSection onNavigate={handleNavigation} />
          )}
          {activeSection === "Book Appointment" && (
  <BookAppointmentSection onNavigate={handleNavigation} />
)}
          {activeSection === "Appointments" && <AppointmentsSection />}
          {activeSection === "Queue" && <QueueSection />}
          {activeSection === "Patients" && <PatientsSection />}
          {activeSection === "Manage Queue" && <ManageQueueSection />}


{activeSection === "Notifications" && (
  <section className="reception-notifications-page">
    <div className="reception-notifications-heading">
      <div>
        <span className="reception-notifications-eyebrow">
          NOTIFICATION CENTRE
        </span>
        <h2>Notifications</h2>
        <p>
          Stay updated on appointments, patient arrivals and reception activities.
        </p>
      </div>

      <div className="reception-notifications-summary">
        <span className="reception-notifications-summary-icon">
          <FiBell />
        </span>
        <div>
          <strong>{unreadNotificationCount}</strong>
          <span>Unread notifications</span>
        </div>
      </div>
    </div>

    <div className="reception-notifications-panel">
      <div className="reception-notifications-panel-header">
        <div>
          <h3>Recent updates</h3>
          <p>Your latest notifications from Vhutec Med</p>
        </div>

        <button
          type="button"
          className="reception-notifications-refresh"
          onClick={loadNotifications}
          disabled={notificationsLoading}
        >
          <FiClock />
          {notificationsLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {notificationsLoading && notifications.length === 0 ? (
        <div className="reception-notifications-state">
          <FiBell />
          <strong>Loading notifications</strong>
          <p>Please wait while we retrieve your latest updates.</p>
        </div>
      ) : notificationsError && notifications.length === 0 ? (
        <div className="reception-notifications-state">
          <strong>Unable to load notifications</strong>
          <p>{notificationsError}</p>
          <button
            type="button"
            className="reception-notifications-primary-button"
            onClick={loadNotifications}
          >
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="reception-notifications-state">
          <span className="reception-notifications-empty-icon">
            <FiCheckCircle />
          </span>
          <strong>You're all caught up!</strong>
          <p>New updates will appear here when they become available.</p>
        </div>
      ) : (
        <div className="reception-notifications-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`reception-notification-item ${
                notification.readAt ? "is-read" : "is-unread"
              }`}
            >
              <div className="reception-notification-icon">
                <FiBell />
              </div>

              <div className="reception-notification-content">
                <div className="reception-notification-title-row">
                  <h4>{notification.title || "Vhutec Med Update"}</h4>

                  {!notification.readAt && (
                    <span className="reception-notification-unread-badge">
                      New
                    </span>
                  )}
                </div>

                <p>{notification.message}</p>

                <span className="reception-notification-time">
                  <FiClock />
                  {notification.createdAt
                    ? new Date(notification.createdAt).toLocaleString("en-ZA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Date unavailable"}
                </span>
              </div>

              <div className="reception-notification-action">
                {notification.readAt ? (
                  <span className="reception-notification-read-status">
                    <FiCheckCircle />
                    Read
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      handleMarkNotificationAsRead(notification)
                    }
                    className="reception-notification-mark-button"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {notificationsError && notifications.length > 0 && (
        <p className="reception-notifications-inline-error" role="alert">
          {notificationsError}
        </p>
      )}

      <div className="reception-notifications-footer">
        Showing your latest {notifications.length} notification
        {notifications.length === 1 ? "" : "s"}
      </div>
    </div>
  </section>
)}

        </section>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;