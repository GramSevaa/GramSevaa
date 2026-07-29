import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AdminReviews from "./pages/AdminReviews";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import ProviderProfile from "./pages/ProviderProfile";
import ProviderServices from "./pages/ProviderServices";
import Register from "./pages/Register";
import Services from "./pages/Services";
import Book from "./pages/Book";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/services" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/services" element={<Services />} />
      <Route path="/book" element={<Book />} />
      <Route path="/providers/:id" element={<ProviderProfile />} />
      <Route path="/provider/services" element={<ProviderServices />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/reviews" element={<AdminReviews />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
