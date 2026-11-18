import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import PopupProvider from "./components/popup/PopupProvider";
import SettingsProvider from "./context/SettingsProvider";
import HomePage from "./pages/HomePage";
import KanjiPage from "./pages/KanjiPage";
import NotFoundPage from "./pages/NotFoundPage";
import PredictPage from "./pages/PredictPage";
import ReaderPage from "./pages/ReaderPage";
import RuleDetailPage from "./pages/RuleDetailPage";
import RulesPage from "./pages/RulesPage";
import SearchPage from "./pages/SearchPage";
import SeriesPage from "./pages/SeriesPage";
import SettingsPage from "./pages/SettingsPage";
import WordsPage from "./pages/WordsPage";

export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <PopupProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="rules/:id" element={<RuleDetailPage />} />
            <Route path="kanji/:char" element={<KanjiPage />} />
            <Route path="words" element={<WordsPage />} />
            <Route path="series" element={<SeriesPage />} />
            <Route path="predict" element={<PredictPage />} />
            <Route path="reader" element={<ReaderPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </PopupProvider>
      </HashRouter>
    </SettingsProvider>
  );
}
