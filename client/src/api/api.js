import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the stored JWT to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle expired/invalid sessions and normalise error messages.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.message ||
      (error.request && !error.response
        ? "Unable to connect to the server. Please check your connection and try again."
        : "Something went wrong. Please try again.");

    return Promise.reject(new Error(message));
  }
);

export default api;

// ---- Patients ----
export const fetchMyProfile = () =>
  api.get("/patients/me").then((res) => res.data);

// ---- Departments ----
export const fetchDepartments = () =>
  api.get("/departments").then((res) => res.data);

// ---- Doctors ----
export const fetchDoctors = () =>
  api.get("/doctors").then((res) => res.data);

// ---- Doctor-Department links (used to filter doctors by department) ----
export const fetchDoctorDepartments = () =>
  api.get("/doctor-departments").then((res) => res.data);

// ---- Appointments ----
export const fetchMyAppointments = () =>
  api.get("/appointments/me").then((res) => res.data);

export const createAppointment = (payload) =>
  api.post("/appointments", payload).then((res) => res.data);