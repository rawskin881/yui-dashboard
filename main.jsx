import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mood, setMood] = useState('happy');

  const getTelegramUserId = async () => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return null;
  };

  const fetchData = async () => {
    try {
      const userId = await getTelegramUserId();
      if (!userId) {
        setError("Harus buka dari Telegram!");
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL;

      const res = await fetch(`${apiUrl}/api/airdrops`, {
        headers: { "Authorization": `Bearer ${userId}` }
      });
      const data = await res.json();
      setAirdrops(data);

      const userRes = await fetch(`${apiUrl}/api/user`, {
        headers: { "Authorization": `Bearer ${userId}` }
      });
      const userData = await userRes.json();
      setUser(userData);

      // Set mood berdasarkan airdrop status
      const pending = data.filter(a => a.status === 'pending').length;
      if (pending > 5) setMood('tired');
      else if (pending > 0) setMood('happy');
      else setMood('excited');

      setError(null);
    } catch (err) {
      setError("Gagal fetch data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">🌸 Yui lagi muat data...</div>;
  }

  const stats = {
    total: airdrops.length,
    pending: airdrops.filter(a => a.status === 'pending').length,
    done: airdrops.filter(a => a.status === 'done').length,
    claimed: airdrops.filter(a => a.status === 'claim').length,
  };

  // Mood greeting
  const greetings = {
    happy: 'Semangat ya! 💪',
    tired: 'Istirahat sebentar... 😴',
    excited: 'Mari mulai! ✨'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ========== SIDEBAR WITH YUI CHARACTER ========== */}
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
        {/* YUI CHARACTER IMAGE */}
        <img 
          src="/images/yui-sidebar.png" 
          alt="Yui" 
          style={{
            width: '140px',
            height: 'auto',
            marginBottom: '1.5rem',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
            borderRadius: '8px',
            transition: 'transform 0.3s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        />
        
        {/* CHARACTER NAME & GREETING */}
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

        {/* QUICK STATS BOX */}
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

        {/* MOTIVATIONAL MESSAGE */}
        <div style={{
          fontSize: '0.8rem',
          color: '#764ba2',
          fontWeight: '600',
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          width: '100%',
        }}>
          Yui mendukung mu! 💖
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className="container">
        <div className="header">
          <h1>✨ Yui Dashboard</h1>
          <p>Halo {user?.name || 'Kak'}! Kelola airdrop-mu di sini 🌸</p>
        </div>

        {error && <div className="error">{error}</div>}

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
            <p style={{color: '#999'}}>Belum ada airdrop. Tambah via /tambah di bot! 🌸</p>
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