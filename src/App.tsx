import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GestioneSubaffidamenti from './pages/GestioneSubaffidamenti';
import ControlloDocumentale from './pages/ControlloDocumentale';
import AnagraficaAppaltatori from './pages/AnagraficaAppaltatori';
import StoricoAttivita from './pages/StoricoAttivita';
import ReportExport from './pages/ReportExport';
import ImportaExcel from './pages/ImportaExcel';
import Impostazioni from './pages/Impostazioni';
import Rubrica from './pages/Rubrica';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { dataLoading } = useData();

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#534AB7]/20 border-t-[#534AB7] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="subaffidamenti" element={<GestioneSubaffidamenti />} />
              <Route path="controllo-documentale" element={<ControlloDocumentale />} />
              <Route path="anagrafica" element={<AnagraficaAppaltatori />} />
              <Route path="storico" element={<StoricoAttivita />} />
              <Route path="report" element={<ReportExport />} />
              <Route path="importa" element={<ImportaExcel />} />
              <Route path="impostazioni" element={<Impostazioni />} />
              <Route path="rubrica" element={<Rubrica />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
