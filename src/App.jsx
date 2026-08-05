import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ControlPanel from './pages/ControlPanel';
import Overlay from './pages/Overlay';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ControlPanel />} />
        <Route path="/overlay" element={<Overlay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
