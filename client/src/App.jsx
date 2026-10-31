import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import InvestigationPage from './pages/InvestigationPage';
import AccusationPage from './pages/AccusationPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cases/:id" element={<InvestigationPage />} />
        <Route path="/cases/:id/accuse" element={<AccusationPage />} />
        <Route path="/cases/:id/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
