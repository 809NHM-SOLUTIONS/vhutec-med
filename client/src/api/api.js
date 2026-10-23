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

// ---- Receptionist ----
export const fetchReceptionOverview = () =>
  api.get("/receptionist/overview").then((res) => res.data);

export const fetchReceptionAppointments = () =>
  api.get("/receptionist/appointments").then((res) => res.data);

export const fetchReceptionQueue = () =>
  api.get("/receptionist/queue").then((res) => res.data);

export const fetchReceptionPatients = (search = "") =>
  api.get("/receptionist/patients", { params: { search } }).then((res) => res.data);

export const fetchDoctorDashboard = () =>
    api.get("/doctors/me/dashboard").then(res => res.data);
export const checkInAppointment = (id) =>
  api.post(`/receptionist/appointments/${id}/check-in`).then((res) => res.data);
 
export const callNextPatient = () =>
  api.post("/receptionist/queue/call-next").then((res) => res.data);
<<<<<<< HEAD
   export const fetchMyQueue = () =>
     api.get("/patients/me/queue").then((res) => res.data);
=======


// ---- Notifications ----
export const fetchNotifications = (limit = 20) =>
  api.get("/notifications", { params: { limit } }).then((res) => res.data);

export const fetchUnreadNotificationCount = () =>
  api.get("/notifications/unread-count").then((res) => res.data);

export const markNotificationAsRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data);
>>>>>>> 350448de1cbdbb29be1cd90c5e82f2c0798c952e
