import { useEffect, useRef, useState } from "react";
import { fetchDoctorAvailability } from "../../api/api";
import "./timeSlotPicker.css";

// How often the list quietly re-checks the doctor's availability while open.
const BACKGROUND_REFRESH_MS = 30000;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

// A slot earlier than "now" cannot be booked when the chosen date is today.
function isPast(date, slot) {
  if (date !== todayKey()) return false;
  const [hours, minutes] = slot.split(":").map(Number);
  const now = new Date();
  return hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes();
}

// Why a doctor has no slots on the chosen date.
const DAY_OFF_MESSAGES = {
  DOCTOR_UNAVAILABLE_DATE:
    "This doctor is not available on this date. Please choose another date.",
  NOT_A_WORKING_DAY:
    "This doctor does not work on this day. Please choose another date.",
};

/**
 * Shows the time slots for one doctor on one date, exactly as the doctor has
 * set them up (working days, hours, days off). Slots that are already booked
 * (or in the past) are shown greyed out and cannot be selected.
 *
 * The list comes from the server (GET /doctors/:id/availability?date=...), so
 * it follows the doctor's availability and re-checks itself every 30 seconds.
 *
 * Props:
 *  slots       no longer used (the doctor's own hours decide); kept so existing
 *              pages that still pass it keep working
 *  doctorId    selected doctor id ("" until chosen)
 *  date        selected date, YYYY-MM-DD ("" until chosen)
 *  value       currently selected slot ("" for none)
 *  onChange    called with the chosen slot, or "" when the choice is cleared
 *  refreshKey  change this number to force the slots to be checked again
 */
function TimeSlotPicker({ doctorId, date, value, onChange, refreshKey = 0 }) {
  const [day, setDay] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [removedNotice, setRemovedNotice] = useState(false);

  // Always the latest selection, so background checks never use a stale one.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    setRemovedNotice(false);
  }, [doctorId, date]);

  useEffect(() => {
    if (!doctorId || !date) {
      setStatus("idle");
      setDay(null);
      return undefined;
    }

    // Ignore answers that arrive after the doctor/date changed again.
    let current = true;

    const load = (background) => {
      if (!background) {
        setStatus("loading");
        setErrorMessage("");
      }

      fetchDoctorAvailability(doctorId, date)
        .then((result) => {
          if (!current) return;

          const loaded = result?.data?.day;
          if (!loaded) throw new Error("Unable to check available times.");

          setDay(loaded);
          setStatus("ready");

          // The slot the patient had chosen may have been taken, or the doctor
          // may have changed their availability, in the meantime.
          const chosen = valueRef.current;
          if (chosen) {
            const stillFree = (loaded.slots || []).some(
              (slot) => slot.time === chosen && slot.status === "available"
            );
            if (!stillFree) {
              onChangeRef.current("");
              setRemovedNotice(true);
            }
          }
        })
        .catch((error) => {
          if (!current) return;
          // A failed background check keeps the list that is already shown.
          if (background) return;

          console.error("Failed to load time slots:", error);
          setDay(null);
          setStatus("error");
          setErrorMessage(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to check available times."
          );
          if (valueRef.current) onChangeRef.current("");
        });
    };

    load(false);

    const timer = setInterval(() => load(true), BACKGROUND_REFRESH_MS);

    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [doctorId, date, refreshKey, retryKey]);

  if (!doctorId || !date) {
    return (
      <p className="slot-message">Select a doctor and a date to see available times.</p>
    );
  }

  if (status === "idle" || status === "loading") {
    return (
      <p className="slot-message" role="status">
        Checking available times...
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="slot-message slot-message-error" role="alert">
        <span>{errorMessage}</span>
        <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
          Try again
        </button>
      </div>
    );
  }

  const slots = day?.slots || [];

  if (DAY_OFF_MESSAGES[day?.reason]) {
    return (
      <p className="slot-message" role="status">
        {DAY_OFF_MESSAGES[day.reason]}
      </p>
    );
  }

  const isBooked = (slot) => slot.status === "booked";
  const isUnavailable = (slot) => isBooked(slot) || isPast(date, slot.time);
  const availableCount = slots.filter((slot) => !isUnavailable(slot)).length;

  if (availableCount === 0) {
    return (
      <p className="slot-message" role="status">
        No times are available for this doctor on this date. Please choose another
        date or doctor.
      </p>
    );
  }

  return (
    <div>
      {removedNotice && (
        <p className="slot-message slot-message-error" role="alert">
          The time you chose is no longer available. Please pick another time.
        </p>
      )}

      <div className="slot-grid" role="radiogroup" aria-label="Available appointment times">
        {slots.map((slot) => {
          const unavailable = isUnavailable(slot);
          const selected = value === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={unavailable}
              title={unavailable ? "This time is not available" : undefined}
              className={`slot-button${selected ? " selected" : ""}${
                unavailable ? " unavailable" : ""
              }`}
              onClick={() => {
                setRemovedNotice(false);
                onChange(slot.time);
              }}
            >
              {slot.time}
              {unavailable && <small>{isBooked(slot) ? "Booked" : "Passed"}</small>}
            </button>
          );
        })}
      </div>
      <small className="slot-hint">
        {availableCount} {availableCount === 1 ? "time" : "times"} available
      </small>
    </div>
  );
}

export default TimeSlotPicker;
