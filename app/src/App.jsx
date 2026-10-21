import {BrowserRouter, Route, Routes} from 'react-router';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import NewProject from './pages/dashboard/NewProject'
import Project from './pages/dashboard/Project'
import Settings from './pages/dashboard/Setting'
import DashboardLayout from './pages/dashboard/DashboardLayout'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<NewProject />} />
            <Route path="project/:pid" element={<Project />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
