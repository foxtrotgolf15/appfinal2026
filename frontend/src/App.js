import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LegalWarning from "./components/LegalWarning";
import ModeSelection from "./components/ModeSelection";
import FormScreen from "./components/FormScreen";
import RealtimeFormScreen from "./components/RealtimeFormScreen";
import WarningContainer from "./components/WarningContainer";
import ResultsScreen from "./components/ResultsScreen";
import DiverLogForm from "./components/DiverLogForm";
import OfflineIndicator from "./components/OfflineIndicator";

function App() {
  return (
    <div className="App">
      <OfflineIndicator />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LegalWarning />} />
          <Route path="/mode-selection" element={<ModeSelection />} />
          <Route path="/form" element={<FormScreen />} />
          <Route path="/realtime-form" element={<RealtimeFormScreen />} />
          <Route path="/warning" element={<WarningContainer />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/diver-log" element={<DiverLogForm />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;