import { Navigate, Route, Routes } from "react-router-dom";
import CartPage from "./pages/CartPage";
import HomePage from "./pages/HomePage";
import MinerPage from "./pages/MinerPage";
import RestaurantPage from "./pages/RestaurantPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/miner" element={<MinerPage />} />
      <Route path="/restaurants/:restaurantId" element={<RestaurantPage />} />
      <Route path="/cart/:gameId" element={<CartPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
