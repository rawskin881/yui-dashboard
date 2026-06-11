import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ambil Telegram User ID dari Login Widget
  const getTelegramUserId = async () => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return null;
  };

  // Fetch data dari API
  const fetchData = async () => {
    try {
      const userId = await getTelegramUserId();
      if (!userId) {
        setError("Harus buka dari Telegram!");
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL;

      // Fetch airdrops
      const res = await fetch(`${apiUrl}/api/airdrops`, {
        headers: { "Authorization": `Bearer ${userId}` }
      });
      const data = await res.json();
      setAirdrops(data);

      // Fetch user info
      const userRes = await fetch(`${apiUrl}/api/user`, {
        headers: { "Authorization": `Bearer ${userId}` }
      });
      const userData = await userRes.json();
      setUser(userData);

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

  return (
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
        <button style={{marginTop: '1rem'}} onclick={() => fetchData()}>
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<YuiDashboard />);