import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/users" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
