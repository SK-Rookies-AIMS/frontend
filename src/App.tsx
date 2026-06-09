
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ManufacturingPage from "./pages/ManufacturingPage";
import InspectionPage from "./pages/InspectionPage";
import EventsPage from "./pages/EventsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/manufacturing" element={<ManufacturingPage />} />
      <Route path="/inspection" element={<InspectionPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
