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
} from "react-icons/fi";

// The api file is src/api/api.js (this page is src/pages/receptionist/).
import {
  callNextPatient,
  checkInAppointment,
  fetchReceptionAppointments,
  fetchReceptionOverview,
  fetchReceptionPatients,
  fetchReceptionQueue,
} from "../../api/api";

import "./ReceptionistDashboard.css";

const NAVIGATION = [
  { label: "Dashboard", icon: FiGrid },
  { label: "Appointments", icon: FiCalendar },
  { label: "Queue", icon: FiClock },
  { label: "Patients", icon: FiUsers },
  { label: "Check-In", icon: FiUserCheck },
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

const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

const fileNumber = (value) => value || "—";

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
        {entry.checkedInAt ? ` • Arrived ${formatClock(entry.checkedInAt)}` : ""}
        {entry.calledAt ? ` • Called ${formatClock(entry.calledAt)}` : ""}
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
                      onClick={() => onNavigate("Queue")}
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
                    {data.appointments.length > 0 ? (
                      data.appointments.slice(0, 8).map((a) => (
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
                  onClick={() => onNavigate("Check-In")}
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
                  onClick={() => onNavigate("Queue")}
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

const AppointmentsSection = () => {
  const { data, loading, error, reload } = useLiveData(fetchReceptionAppointments, 60000);
  const action = useAction(reload);
  const stats = data?.stats;
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
                  <p>{formatLongDate(data.date)} • Reception desk schedule</p>
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
                    {data.appointments.length > 0 ? (
                      data.appointments.map((a) => (
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
                              "—"
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

const QueueSection = () => {
  const { data, loading, error, reload } = useLiveData(
    fetchReceptionQueue,
    REFRESH_MS
  );
  const action = useAction(reload);
  const stats = data?.stats;

  return (
    <>
      <SectionHeader
        title="Patient Queue"
        text="Monitor and manage patients currently waiting at the hospital."
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
                value={
                  stats.avgWaitMinutes === null ? "—" : `${stats.avgWaitMinutes} min`
                }
                note="Check-in to being called"
              />
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
                <div>
                  <h3>Live Patient Queue</h3>
                  <p>Current queue position and consultation status.</p>
                </div>

                <CallNextButton action={action} waiting={stats.waiting} />
              </div>

              <Notice notice={action.notice} />

              <div className="reception-workspace-list">
                {data.queue.length > 0 ? (
                  data.queue.map((entry) => (
                    <div className="reception-workspace-row" key={entry.id}>
                      <div>
                        <strong>
                          #{String(entry.queueNumber).padStart(2, "0")} •{" "}
                          {entry.patientName}
                        </strong>
                        <span>
                          {fileNumber(entry.patientNumber)} • {entry.doctorName} •{" "}
                          {entry.department}
                        </span>
                      </div>
                      <StatusBadge status={queueStatus(entry.status)} />
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

const CheckInSection = () => {
  const { data, loading, error, reload } = useLiveData(
    fetchReceptionAppointments,
    60000
  );
  const action = useAction(reload);

  const arrivedStatuses = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
  const canCheckIn = (a) => ["PENDING", "CONFIRMED"].includes(a.status);
  const appointments = (data?.appointments || []).filter(
    (a) => a.status !== "CANCELLED"
  );

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const arrivalStatus = (a) => {
    if (arrivedStatuses.includes(a.status)) {
      return { label: "Checked In", className: "checked" };
    }
    const start = startMinutes(a.timeSlot);
    if (start !== null && start < nowMinutes) {
      return { label: "Late", className: "pending" };
    }
    return { label: "Expected", className: "waiting" };
  };

  const lateCount = appointments.filter(
    (a) => arrivalStatus(a).label === "Late"
  ).length;

  return (
    <>
      <SectionHeader
        title="Patient Check-In"
        text="Manage arriving patients and verify today's appointments."
      />

      <DataState loading={loading} error={error} data={data}>
        {data && (
          <>
            <section className="reception-stats">
              <StatCard
                icon={FiUserCheck}
                label="Checked In Today"
                value={data.stats.arrived}
                note={`${percent(data.stats.arrived, data.stats.total)}% of appointments`}
              />
              <StatCard
                icon={FiClock}
                label="Expected Arrivals"
                value={data.stats.remaining}
                note="Remaining today"
              />
              <StatCard
                icon={FiCalendar}
                label="Late Arrivals"
                value={lateCount}
                note="Needs attention"
              />
            </section>

            <section className="reception-card">
              <div className="reception-card-header">
                <div>
                  <h3>Today's Patient Arrivals</h3>
                  <p>Appointment verification and check-in status.</p>
                </div>
              </div>

              <Notice notice={action.notice} />

              <div className="reception-workspace-list">
                {appointments.length > 0 ? (
                  appointments.map((a) => (
                    <div className="reception-workspace-row" key={a.id}>
                      <div>
                        <strong>{a.patientName}</strong>
                        <span>
                          {a.timeSlot} • {a.department} • {a.doctorName}
                          {a.queueNumber
                            ? ` • Queue #${String(a.queueNumber).padStart(2, "0")}`
                            : ""}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {canCheckIn(a) && (
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
                        )}

                        <StatusBadge status={arrivalStatus(a)} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={stateStyle}>No appointments to check in today.</p>
                )}
              </div>
            </section>
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

          <div className="reception-profile">
            <div className="reception-profile-avatar">{initials}</div>

            <div className="reception-profile-info">
              <strong>{displayName}</strong>
              <span>Receptionist</span>
            </div>
          </div>
        </header>

        <section className="reception-content">
          {activeSection === "Dashboard" && (
            <OverviewSection onNavigate={handleNavigation} />
          )}
          {activeSection === "Appointments" && <AppointmentsSection />}
          {activeSection === "Queue" && <QueueSection />}
          {activeSection === "Patients" && <PatientsSection />}
          {activeSection === "Check-In" && <CheckInSection />}
        </section>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;