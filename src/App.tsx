import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AboutPage } from './pages/AboutPage';
import { HomePage } from './pages/HomePage';
import { PlayerPage } from './pages/PlayerPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/:attributeId" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
