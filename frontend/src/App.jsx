import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { Landing, AuthPage, Verify, Reset, Contact, Join } from './pages.jsx';
import { Privacy, CookiePolicy } from './policies.jsx';
import { Layout, ScanPage, Library, Team } from './dashboard.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/verify/:token" element={<Verify />} />
        <Route path="/reset/:token" element={<Reset />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/join/:token" element={<Join />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<ScanPage />} />
          <Route path="library" element={<Library />} />
          <Route path="team" element={<Team />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}
