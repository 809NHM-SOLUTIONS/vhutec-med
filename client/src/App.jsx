import { useEffect, useState } from "react";
import api from "./api/api";

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [databaseTime, setDatabaseTime] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get("/health");

        setStatus(response.data.message || "Backend connected");
        setDatabaseTime(response.data.databaseTime || "");
      } catch (error) {
        console.error("Health check failed:", error);
        setStatus("Backend connection failed");
      }
    };

    checkBackend();
  }, []);

  return (
    <div>
      <h1>Vhutec Med</h1>

      <p>{status}</p>

      {databaseTime && (
        <p>Database time: {databaseTime}</p>
      )}
    </div>
  );
}

export default App;