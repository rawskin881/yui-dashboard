import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mood, setMood] = useState('happy');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ===== GET TELEGRAM USER DATA =====
  const getTelegramUserData = () => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.expand();
        
        const initData = webApp.initDataUnsafe;
        
        if (initData?.user?.id) {
          return {
            id: initData.user.id,
            first_name: initData.user.first_name || 'Kak',
            last_name: initData.user.last_name || '',
            username: initData.user.username || '',
          };
        }
      }
    } catch (err) {
      console.error('Telegram error:', err);
    }
    return null;
  };

  // ===== FETCH DATA =====
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const telegramUser = getTelegramUserData();
      
      if (!telegramUser) {
        setError("⚠️ Buka dashboard dari tombol di Telegram!");
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setUser({
        name: telegramUser.first_name,
        id: telegramUser.id,
        username: telegramUser.username,
      });

      const apiUrl = import.meta.env.VITE_API_URL;
      const userId = telegramUser.id;

      console.log(`[DEBUG] Fetching for user ${userId}`);

      // Fetch airdrops
      const res = await fetch(`${apiUrl}/api/airdrops`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      console.log('[DEBUG] Data:', data);
      
      setAirdrops(data);

      // Set mood
      const pending = data.filter(a => a.status === 'pending').length;
      if (pending > 5) setMood('tired');
      else if (pending > 0) setMood('happy');
      else setMood('excited');

      setError(null);
    } catch (err) {
      console.error('[ERROR]', err);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for Telegram script to load
    const timer = setTimeout(() => {
      fetchData();
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌸</div>
        <div>Loading data...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="loading">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>⚠️ Error</div>
        <div style={{ textAlign: 'center', color: '#666', lineHeight: '1.6' }}>
          {error || "Buka dashboard dari tombol di Telegram untuk login"}
          <br/>
          <small style={{ marginTop: '1rem', display: 'block' }}>
            (Dashboard memerlukan Telegram Web App untuk mengakses data Anda)
          </small>
        </div>
      </div>
    );
  }

  const stats = {
    total: airdrops.length,
    pending: airdrops.filter(a => a.status === 'pending').length,
    done: airdrops.filter(a => a.status === 'done').length,
    claimed: airdrops.filter(a => a.status === 'claim').length,
  };

  const greetings = {
    happy: 'Semangat ya! 💪',
    tired: 'Istirahat sebentar... 😴',
    excited: 'Mari mulai! ✨'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: '200px',
        background: 'linear-gradient(180deg, #f5e6ff 0%, #fff0f5 100%)',
        padding: '2rem 1rem',
        textAlign: 'center',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <img 
          src="/images/yui-sidebar.png" 
          alt="Yui" 
          style={{
            width: '140px',
            height: 'auto',
            marginBottom: '1.5rem',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
            borderRadius: '8px',
          }}
        />
        
        <div style={{ marginBottom: '1.5rem', width: '100%' }}>
          <h2 style={{
            fontSize: '1.3rem',
            marginBottom: '0.3rem',
            color: '#764ba2',
            fontWeight: '700',
          }}>
            Yui 🌸
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: '#999',
            fontStyle: 'italic',
            margin: '0.5rem 0',
            lineHeight: '1.3',
          }}>
            {greetings[mood]}
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.8)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          width: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '500',
            marginBottom: '0.7rem',
            color: '#666',
          }}>
            📊 Total Airdrop
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#764ba2',
            marginBottom: '0.7rem',
          }}>
            {airdrops.length}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#aaa',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            paddingTop: '0.7rem',
          }}>
            <div>{stats.pending} pending</div>
            <div>{stats.done} selesai</div>
          </div>
        </div>

        <div style={{
          fontSize: '0.8rem',
          color: '#999',
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          width: '100%',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
            {user?.name}
          </div>
          {user?.username && (
            <div style={{ fontSize: '0.7rem' }}>@{user.username}</div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="container">
        <div className="header">
          <h1>✨ Yui Dashboard</h1>
          <p>Halo {user?.name}! Kelola airdrop-mu di sini 🌸</p>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        <div className="card">
          <h2>📊 Summary</h2>
          <div className="stats">
            <div className="stat-box">
              <h3>Total Airdrop</h3>
              <div className="number">{stats.total}</div>
            </div>
            <div className="stat-box">
              <h3>Pending</h3>
              <div className="number">{stats.pending}</div>
            </div>
            <div className="stat-box">
              <h3>Selesai</h3>
              <div className="number">{stats.done}</div>
            </div>
            <div className="stat-box">
              <h3>Claimed</h3>
              <div className="number">{stats.claimed}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>📋 Airdrop List</h2>
          {airdrops.length === 0 ? (
            <p style={{color: '#999', fontStyle: 'italic'}}>
              📭 Belum ada airdrop. Tambah via /tambah di bot! 🌸
            </p>
          ) : (
            <div className="airdrop-list">
              {airdrops.map((a, idx) => (
                <div key={idx} className="airdrop-item">
                  <div>
                    <div className="airdrop-name">{a.nama}</div>
                    <div style={{fontSize: '0.85rem', color: '#999', marginTop: '0.3rem'}}>
                      📅 {a.deadline ? new Date(a.deadline).toLocaleDateString('id-ID') : '—'}
                    </div>
                  </div>
                  <div className={`airdrop-status status-${a.status}`}>
                    {a.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{textAlign: 'center', color: '#666'}}>
          <p>💼 Yui always support you! Jangan nyerah ya~</p>
          <button style={{marginTop: '1rem'}} onClick={() => fetchData()}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<YuiDashboard />);