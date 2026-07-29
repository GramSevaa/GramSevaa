import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import ProviderServices from "./pages/ProviderServices";
import Register from "./pages/Register";
import Services from "./pages/Services";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/services" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/services" element={<Services />} />
      <Route path="/provider/services" element={<ProviderServices />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
