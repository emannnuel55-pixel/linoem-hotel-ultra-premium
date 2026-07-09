import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ClientPortal from './views/ClientPortal';
import EmployeePortal from './views/EmployeePortal';
import { Sun, Moon } from '@phosphor-icons/react';

function App() {
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  return (
    <Router>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <button 
          onClick={toggleTheme} 
          style={{ background: 'transparent', border: 'none', color: 'var(--brand-gold)', cursor: 'pointer' }}
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Sun size={32} weight="fill" /> : <Moon size={32} weight="fill" />}
        </button>
      </div>

      <Routes>
        {/* Portal de Clientes */}
        <Route path="/" element={<ClientPortal />} />
        
        {/* Portal de Empleados */}
        <Route path="/admin/*" element={<EmployeePortal />} />
      </Routes>
    </Router>
  );
}

export default App;
