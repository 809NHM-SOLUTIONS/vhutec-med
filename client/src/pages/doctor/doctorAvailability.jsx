import { useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiTrash2 } from "react-icons/fi";

import {
  addUnavailableDate,
  fetchMyAvailability,
  removeUnavailableDate,
  saveMyAvailability,
} from "../../api/api";

import "./doctorAvailability.css";

// Shown Monday first; the numbers are what the server stores (0 = Sunday).
const WEEKDAYS = [
  { value: 1, label: "Mon", name: "Monday" },
  { value: 2, label: "Tue", name: "Tuesday" },
  { value: 3, label: "Wed", name: "Wednesday" },
  { value: 4, label: "Thu", name: "Thursday" },
  { value: 5, label: "Fri", name: "Friday" },
  { value: 6, label: "Sat", name: "Saturday" },
  { value: 0, label: "Sun", name: "Sunday" },
];

const AFFECTED_REASONS = {
  DOCTOR_UNAVAILABLE_DATE: "You are unavailable on this date",
  NOT_A_WORKING_DAY: "Not one of your working days",
  OUTSIDE_WORKING_HOURS: "Outside your working hours",
  INVALID_SLOT: "Not one of your appointment times",
};

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Same rule the server uses, so the preview matches what patients will see.
const previewSlots = ({ startTime, endTime, slotMinutes }) => {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return [];
  const slots = [];
  for (let t = toMinutes(startTime); t <= toMinutes(endTime); t += slotMinutes) {
    slots.push(toHHMM(t));
    if (slots.length > 100) break;
  }
  return slots;
};

const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
};

const formatDateKey = (dateKey) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const toForm = (data) => ({
  startTime: data.startTime,
  endTime: data.endTime,
  slotMinutes: data.slotMinutes,
  workingDays: [...data.workingDays].sort((a, b) => a - b),
});

const sameForm = (a, b) =>
  a.startTime === b.startTime &&
  a.endTime === b.endTime &&
  a.slotMinutes === b.slotMinutes &&
  a.workingDays.join() === b.workingDays.join();

function DoctorAvailability() {
  const [saved, setSaved] = useState(null); // what the server has
  const [form, setForm] = useState(null); // what the doctor is editing
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [allowedSlotMinutes, setAllowedSlotMinutes] = useState([15, 20, 30, 45, 60]);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { type, text }
  const [affected, setAffected] = useState([]);

  const [dayOffDate, setDayOffDate] = useState("");
  const [dayOffReason, setDayOffReason] = useState("");
  const [dayOffBusy, setDayOffBusy] = useState(false);

  const applyServerData = useCallback((data) => {
    const next = toForm(data);
    setSaved(next);
    setForm(next);
    setUnavailableDates(data.unavailableDates || []);
    if (Array.isArray(data.allowedSlotMinutes)) setAllowedSlotMinutes(data.allowedSlotMinutes);
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setLoadError("");

    try {
      const result = await fetchMyAvailability();
      if (!result?.success) throw new Error(result?.message || "Unable to load your availability.");
      applyServerData(result.data);
      setStatus("ready");
    } catch (error) {
      setLoadError(error.message || "Unable to load your availability.");
      setStatus("error");
    }
  }, [applyServerData]);

  useEffect(() => {
    load();
  }, [load]);

  const validationError = useMemo(() => {
    if (!form) return "";
    if (!/^\d{2}:\d{2}$/.test(form.startTime)) return "Choose a start time.";
    if (!/^\d{2}:\d{2}$/.test(form.endTime)) return "Choose the last appointment time.";
    if (toMinutes(form.endTime) < toMinutes(form.startTime)) {
      return "The last appointment time cannot be earlier than the start time.";
    }
    if (form.workingDays.length === 0) return "Select at least one working day.";
    return "";
  }, [form]);

  const slotPreview = useMemo(() => (form && !validationError ? previewSlots(form) : []), [form, validationError]);
  const changed = form && saved && !sameForm(form, saved);

  const updateField = (field, value) => {
    setNotice(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDay = (day) => {
    setNotice(null);
    setForm((current) => {
      const days = current.workingDays.includes(day)
        ? current.workingDays.filter((d) => d !== day)
        : [...current.workingDays, day];
      return { ...current, workingDays: days.sort((a, b) => a - b) };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving || validationError || !changed) return;

    setSaving(true);
    setNotice(null);
    setAffected([]);

    try {
      const result = await saveMyAvailability(form);
      if (!result?.success) throw new Error(result?.message || "Unable to save your availability.");

      applyServerData(result.data);
      setAffected(result.affectedAppointments || []);
      setNotice({
        type: "success",
        text: "Availability saved. Patients now see your new hours and days.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Unable to save your availability." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDayOff = async (event) => {
    event.preventDefault();
    if (dayOffBusy || !dayOffDate) return;

    setDayOffBusy(true);
    setNotice(null);
    setAffected([]);

    try {
      const result = await addUnavailableDate({ date: dayOffDate, reason: dayOffReason.trim() });
      if (!result?.success) throw new Error(result?.message || "Unable to mark the date as unavailable.");

      // Only the dates list changes here; unsaved edits to hours stay as they are.
      setUnavailableDates(result.data.unavailableDates || []);
      setAffected(result.affectedAppointments || []);
      setNotice({ type: "success", text: `${formatDateKey(dayOffDate)} is now marked as unavailable.` });
      setDayOffDate("");
      setDayOffReason("");
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Unable to mark the date as unavailable." });
    } finally {
      setDayOffBusy(false);
    }
  };

  const handleRemoveDayOff = async (dateKey) => {
    if (dayOffBusy) return;

    setDayOffBusy(true);
    setNotice(null);
    setAffected([]);

    try {
      const result = await removeUnavailableDate(dateKey);
      if (!result?.success) throw new Error(result?.message || "Unable to update the date.");

      setUnavailableDates(result.data.unavailableDates || []);
      setNotice({ type: "success", text: `${formatDateKey(dateKey)} is available for booking again.` });
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Unable to update the date." });
    } finally {
      setDayOffBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <p className="da-state" role="status">
        Loading your availability...
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="doctor-card da-state-card" role="alert">
        <h3>Unable to load your availability</h3>
        <p>{loadError}</p>
        <button type="button" className="da-button" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="doctor-section-header">
        <h2>Availability</h2>
        <p>Choose the days and hours patients can book with you.</p>
      </div>

      {notice && (
        <p
          className={`da-notice da-notice-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
          {notice.text}
        </p>
      )}

      {affected.length > 0 && (
        <section className="da-warning" role="status">
          <strong>
            {affected.length} existing {affected.length === 1 ? "appointment is" : "appointments are"} outside
            your new availability
          </strong>
          <p>
            Nothing was cancelled or moved. Please contact these patients if the time needs to change.
          </p>
          <ul>
            {affected.map((item) => (
              <li key={item.id}>
                {formatDateKey(item.date)} at {item.timeSlot} - {item.patientName}{" "}
                <span>({AFFECTED_REASONS[item.reason] || "Outside your availability"})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="da-layout">
        <form className="doctor-card" onSubmit={handleSave} noValidate>
          <div className="doctor-card-header">
            <div>
              <h3>Working hours and days</h3>
              <p>The default is 08:00 to 15:00, Monday to Friday.</p>
            </div>
          </div>

          <div className="da-fields">
            <div className="da-field">
              <label htmlFor="da-start">First appointment</label>
              <input
                id="da-start"
                type="time"
                value={form.startTime}
                onChange={(event) => updateField("startTime", event.target.value)}
                required
              />
            </div>

            <div className="da-field">
              <label htmlFor="da-end">Last appointment</label>
              <input
                id="da-end"
                type="time"
                value={form.endTime}
                onChange={(event) => updateField("endTime", event.target.value)}
                required
              />
            </div>

            <div className="da-field">
              <label htmlFor="da-length">Appointment length</label>
              <select
                id="da-length"
                value={form.slotMinutes}
                onChange={(event) => updateField("slotMinutes", Number(event.target.value))}
              >
                {allowedSlotMinutes.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="da-days">
            <legend>Days you work</legend>
            <div className="da-day-buttons">
              {WEEKDAYS.map((day) => {
                const active = form.workingDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`da-day${active ? " active" : ""}`}
                    aria-pressed={active}
                    aria-label={day.name}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="da-preview">
            <span>Patients will be able to book:</span>
            {validationError ? (
              <p className="da-error" role="alert">
                {validationError}
              </p>
            ) : (
              <div className="da-chips">
                {slotPreview.map((time) => (
                  <span key={time}>{time}</span>
                ))}
              </div>
            )}
          </div>

          <div className="da-actions">
            <button
              type="button"
              className="da-button da-button-secondary"
              disabled={!changed || saving}
              onClick={() => {
                setForm(saved);
                setNotice(null);
              }}
            >
              Reset
            </button>
            <button
              type="submit"
              className="da-button"
              disabled={!changed || saving || Boolean(validationError)}
            >
              {saving ? "Saving..." : "Save availability"}
            </button>
          </div>
        </form>

        <section className="doctor-card">
          <div className="doctor-card-header">
            <div>
              <h3>Days off</h3>
              <p>Mark a specific date as unavailable, such as leave.</p>
            </div>
          </div>

          <form className="da-dayoff-form" onSubmit={handleAddDayOff}>
            <div className="da-field">
              <label htmlFor="da-dayoff-date">Date</label>
              <input
                id="da-dayoff-date"
                type="date"
                min={localToday()}
                value={dayOffDate}
                onChange={(event) => setDayOffDate(event.target.value)}
                required
              />
            </div>

            <div className="da-field">
              <label htmlFor="da-dayoff-reason">Reason (optional)</label>
              <input
                id="da-dayoff-reason"
                type="text"
                maxLength={200}
                placeholder="For example: Annual leave"
                value={dayOffReason}
                onChange={(event) => setDayOffReason(event.target.value)}
              />
            </div>

            <button type="submit" className="da-button" disabled={dayOffBusy || !dayOffDate}>
              {dayOffBusy ? "Please wait..." : "Mark unavailable"}
            </button>
          </form>

          {unavailableDates.length === 0 ? (
            <p className="da-empty">You have no upcoming days off.</p>
          ) : (
            <ul className="da-dayoff-list" aria-label="Upcoming days off">
              {unavailableDates.map((item) => (
                <li key={item.date}>
                  <div>
                    <strong>{formatDateKey(item.date)}</strong>
                    {item.reason && <span>{item.reason}</span>}
                  </div>
                  <button
                    type="button"
                    className="da-icon-button"
                    aria-label={`Make ${formatDateKey(item.date)} available again`}
                    disabled={dayOffBusy}
                    onClick={() => handleRemoveDayOff(item.date)}
                  >
                    <FiTrash2 />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default DoctorAvailability;
