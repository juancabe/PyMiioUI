import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Layout from "./Layout";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<App />} />
          {/* you can add more pages like this:
          <Route path="new-page" element={<NewPage />} />
          */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}