import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiUserCheck,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

import { fetchMyQueue } from "../../api/api";

import "./patientQueueStatus.css";

const POLL_MS = 15000;
const TIME_ZONE = "Africa/Johannesburg";

const STATE_META = {
  NOT_CHECKED_IN: {
    label: "Not checked in",
    tone: "idle",
    icon: FiCalendar,
    headline: "You haven't checked in yet",
    text: "Please check in at the reception desk when you arrive. Your place in the queue starts once you are checked in.",
  },
  WAITING: {
    label: "Waiting",
    tone: "waiting",
    icon: FiClock,
    headline: "You're in the queue",
    text: "Please stay close to the waiting area. You'll be called when it's your turn.",
  },
  CALLED: {
    label: "Called",
    tone: "called",
    icon: FiUserCheck,
    headline: "You're being called",
    text: "Please go to the consultation room now.",
  },
  IN_CONSULTATION: {
    label: "In Consultation",
    tone: "consultation",
    icon: FiActivity,
    headline: "Your consultation is in progress",
    text: "You are currently with your doctor.",
  },
  COMPLETED: {
    label: "Completed",
    tone: "completed",
    icon: FiCheckCircle,
    headline: "Your visit is complete",
    text: "Thank you for visiting Vhutec Med.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "cancelled",
    icon: FiXCircle,
    headline: "This appointment was cancelled",
    text: "You are not in today's queue for this appointment. You can book a new appointment at any time.",
  },
};

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIME_ZONE,
      })
    : "—";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC", // appointment.date is stored as UTC midnight
      })
    : "—";

const ordinal = (n) => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

const Detail = ({ label, value }) => (
  <div>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

function PatientQueueStatus({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const tokenRef = useRef({ cancelled: false });

  const load = useCallback(async (token, { manual = false } = {}) => {
    if (manual) setRefreshing(true);

    try {
      const result = await fetchMyQueue();
      if (!token.cancelled) {
        setData(result.data);
        setError("");
        setUpdatedAt(new Date());
      }
    } catch (err) {
      if (!token.cancelled) {
        setError(err.message || "Unable to load your queue status.");
      }
    } finally {
      if (!token.cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Load once, then refresh on an interval and whenever the tab becomes
  // visible again (so a patient returning to the page sees current data).
  useEffect(() => {
    const token = { cancelled: false };
    tokenRef.current = token;

    load(token);

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") load(token);
    };

    const timer = setInterval(refreshIfVisible, POLL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      token.cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [load]);

  const handleRefresh = () => load(tokenRef.current, { manual: true });

  const header = (
    <div className="section-page-header">
      <h2>Queue Status</h2>
      <p>View your current position in the patient queue.</p>
    </div>
  );

  if (loading) {
    return (
      <section className="dashboard-section">
        {header}
        <p className="appointments-loading">Loading your queue status...</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="dashboard-section">
        {header}
        <div className="auth-error" role="alert">
          {error || "Unable to load your queue status."}
        </div>
        <button type="button" className="primary-button" onClick={handleRefresh}>
          <FiRefreshCw />
          Try again
        </button>
      </section>
    );
  }

  if (data.state === "NO_APPOINTMENT") {
    return (
      <section className="dashboard-section">
        {header}
        <div className="appointments-empty">
          <div className="appointments-empty-icon">
            <FiCalendar />
          </div>
          <h4>You have no appointment today</h4>
          <p>
            Your queue status appears here on the day of an appointment, once
            you've checked in at reception.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate("Book Appointment")}
          >
            <FiCalendar />
            Book Appointment
          </button>
        </div>
      </section>
    );
  }

  const meta = STATE_META[data.state] || STATE_META.NOT_CHECKED_IN;
  const StateIcon = meta.icon;
  const { appointment, queue } = data;
  const doctorName = appointment?.doctor
    ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
    : "—";

  return (
    <section className="dashboard-section">
      {header}

      {error && (
        <div className="auth-error" role="alert">
          Couldn't refresh just now, showing the last information we have.{" "}
          <button type="button" className="text-button" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      )}

      <div className="queue-page-grid">
        <div className={`queue-info-card queue-state-${meta.tone}`}>
          <div className="queue-info-icon">
            <StateIcon />
          </div>

          <span className={`queue-state-badge queue-state-badge-${meta.tone}`}>
            {meta.label}
          </span>

          <h3>{meta.headline}</h3>
          <p>{meta.text}</p>

          {data.state === "WAITING" && data.position !== null && (
            <div className="queue-position" aria-live="polite">
              <div className="queue-position-number">{ordinal(data.position)}</div>
              <p>
                in line ·{" "}
                {data.ahead === 0
                  ? "you're next"
                  : `${data.ahead} ${data.ahead === 1 ? "patient" : "patients"} ahead of you`}
                {data.waitingTotal > 1 ? ` · ${data.waitingTotal} waiting in total` : ""}
              </p>
            </div>
          )}

          {data.state === "WAITING" && data.position === null && (
            <p className="queue-note">
              <FiAlertCircle /> We couldn't work out your position right now.
              Reception can tell you where you are in the queue.
            </p>
          )}

          <div className="profile-information-grid queue-details">
            {queue && data.state !== "CANCELLED" && (
              <Detail
                label="Queue Number"
                value={`#${String(queue.queueNumber).padStart(2, "0")}`}
              />
            )}
            <Detail label="Status" value={meta.label} />
            <Detail label="Doctor" value={doctorName} />
            <Detail label="Department" value={appointment?.department?.name || "—"} />
            <Detail label="Appointment" value={`${formatDate(appointment?.date)}, ${appointment?.timeSlot || ""}`} />
            {queue && data.state !== "CANCELLED" && (
              <>
                <Detail label="Checked in" value={formatTime(queue.checkedInAt)} />
                <Detail
                  label="Called"
                  value={queue.calledAt ? formatTime(queue.calledAt) : "Not called yet"}
                />
              </>
            )}
          </div>

          {data.otherVisitsToday > 0 && (
            <p className="queue-note">
              You have {data.otherVisitsToday} other{" "}
              {data.otherVisitsToday === 1 ? "appointment" : "appointments"} today.
              This is the one that needs your attention first.
            </p>
          )}

          {data.state === "CANCELLED" && (
            <button
              type="button"
              className="primary-button"
              onClick={() => onNavigate("Book Appointment")}
            >
              <FiCalendar />
              Book Appointment
            </button>
          )}

          <div className="queue-footer">
            <span>
              <FiUsers /> Updates automatically
              {updatedAt ? ` · last updated ${updatedAt.toLocaleTimeString("en-ZA", { timeZone: TIME_ZONE })}` : ""}
            </span>
            <button
              type="button"
              className="text-button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw /> {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PatientQueueStatus;