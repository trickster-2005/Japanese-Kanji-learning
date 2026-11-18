import { HashRouter, Route, Routes } from "react-router-dom";
import ComingSoon from "./components/ComingSoon";
import Layout from "./components/Layout";
import SettingsProvider from "./context/SettingsProvider";
import HomePage from "./pages/HomePage";
import KanjiPage from "./pages/KanjiPage";
import NotFoundPage from "./pages/NotFoundPage";
import RuleDetailPage from "./pages/RuleDetailPage";
import RulesPage from "./pages/RulesPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="rules/:id" element={<RuleDetailPage />} />
            <Route path="kanji/:char" element={<KanjiPage />} />
            <Route path="words" element={<ComingSoon title="詞彙" stage={3} desc="依類型瀏覽：免學清單、假朋友、台日共有詞、古義保留。" />} />
            <Route path="series" element={<ComingSoon title="聲符字族" stage={3} desc="同一個聲符的字，日語音讀常常相同。" />} />
            <Route path="predict" element={<ComingSoon title="反查推測器" stage={4} desc="輸入粵拼或台羅，列出可能的日語音讀與符合的漢字。" />} />
            <Route path="reader" element={<ComingSoon title="閱讀模式" stage={4} desc="貼上一段日文，每個漢字都能點開查讀音、規律與字典。" />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </SettingsProvider>
  );
}
