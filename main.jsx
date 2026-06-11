import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mood, setMood] = useState('happy');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ===== TELEGRAM LOGIN =====
  const getTelegramUserData = () => {
    // Pastikan Telegram Web App sudah loaded
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      // Expand webapp (opsional, tapi bikin better UX)
      webApp.expand();
      
      // Ambil user data dari Telegram
      const initData = webApp.initDataUnsafe;
      
      if (initData && initData.user) {
        return {
          id: initData.user.id,
          first_name: initData.user.first_name,
          last_name: initData.user.last_name || '',
          username: initData.user.username || '',
          is_bot: initData.user.is_bot || false,
        };
      }
    }
    
    return null;
  };

  // ===== FETCH DATA DARI API =====
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get user dari Telegram
      const telegramUser = getTelegramUserData();
      
      if (!telegramUser) {
        setError("⚠️ Buka dashboard dari Telegram untuk login!");
        setLoading(false);
        return;
      }

      // Set authenticated
      setIsAuthenticated(true);
      
      // Simpan user info
      setUser({
        name: telegramUser.first_name || 'Kak',
        id: telegramUser.id,
        username: telegramUser.username,
      });

      const apiUrl = import.meta.env.VITE_API_URL;
      const userId = telegramUser.id;

      // ===== FETCH AIRDROPS DARI API =====
      console.log(`[DEBUG] Fetching airdrops for user ${userId}`);
      
      const airdropRes = await fetch(`${apiUrl}/api/airdrops`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json',
        },
      });

      if (!airdropRes.ok) {
        throw new Error(`API error: ${airdropRes.status}`);
      }

      const airdropData = await airdropRes.json();
      console.log('[DEBUG] Airdrop data:', airdropData);
      
      setAirdrops(airdropData);

      // Set mood berdasarkan pending tasks
      const pending = airdropData.filter(a => a.status === 'pending').length;
      if (pending > 5) setMood('tired');
      else if (pending > 0) setMood('happy');
      else setMood('excited');

      setError(null);
    } catch (err) {
      console.error('[ERROR]', err);
      setError(`❌ Gagal load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD DATA SAAT COMPONENT MOUNT =====
  useEffect(() => {
    // Delay untuk ensure Telegram script sudah loaded
    const timer = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌸</div>
        <div>Yui lagi muat data...</div>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="loading">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📱</div>
        <div>{error || "Buka dari Telegram untuk login"}</div>
      </div>
    );
  }

  // Stats calculation
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
      {/* ========== SIDEBAR ========== */}
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
        {/* CHARACTER IMAGE */}
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
        
        {/* NAME & GREETING */}
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

        {/* QUICK STATS */}
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

        {/* USER INFO */}
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

      {/* ========== MAIN CONTENT ========== */}
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