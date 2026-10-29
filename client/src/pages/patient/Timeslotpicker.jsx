import { useEffect, useState } from "react";
import { fetchBookedSlots } from "../../api/api";
import "./timeSlotPicker.css";

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

/**
 * Shows the time slots for one doctor on one date. Slots that are already
 * booked (or in the past) are shown greyed out and cannot be selected.
 *
 * Props:
 *  slots       all slots the clinic offers, e.g. ["08:00", "09:00"]
 *  doctorId    selected doctor id ("" until chosen)
 *  date        selected date, YYYY-MM-DD ("" until chosen)
 *  value       currently selected slot ("" for none)
 *  onChange    called with the chosen slot, or "" when the choice is cleared
 *  refreshKey  change this number to force the slots to be checked again
 */
function TimeSlotPicker({ slots, doctorId, date, value, onChange, refreshKey = 0 }) {
  const [booked, setBooked] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!doctorId || !date) {
      setStatus("idle");
      setBooked([]);
      return undefined;
    }

    // Ignore answers that arrive after the doctor/date changed again.
    let current = true;
    setStatus("loading");
    setErrorMessage("");

    fetchBookedSlots(doctorId, date)
      .then((taken) => {
        if (!current) return;
        setBooked(taken);
        setStatus("ready");
        // The slot the patient had chosen may have been taken in the meantime.
        if (value && taken.includes(value)) onChange("");
      })
      .catch((error) => {
        if (!current) return;
        console.error("Failed to load time slots:", error);
        setBooked([]);
        setStatus("error");
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to check available times."
        );
        if (value) onChange("");
      });

    return () => {
      current = false;
    };
    // `value` and `onChange` are intentionally left out: only a new doctor,
    // date, retry or refresh should trigger a new availability check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date, refreshKey, retryKey]);

  if (status === "idle") {
    return (
      <p className="slot-message">Select a doctor and a date to see available times.</p>
    );
  }

  if (status === "loading") {
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

  const isUnavailable = (slot) => booked.includes(slot) || isPast(date, slot);
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
      <div className="slot-grid" role="radiogroup" aria-label="Available appointment times">
        {slots.map((slot) => {
          const unavailable = isUnavailable(slot);
          const selected = value === slot;
          return (
            <button
              key={slot}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={unavailable}
              title={unavailable ? "This time is not available" : undefined}
              className={`slot-button${selected ? " selected" : ""}${
                unavailable ? " unavailable" : ""
              }`}
              onClick={() => onChange(slot)}
            >
              {slot}
              {unavailable && <small>{booked.includes(slot) ? "Booked" : "Passed"}</small>}
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