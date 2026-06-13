import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mood, setMood] = useState('happy');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // State untuk OTP manual di browser
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  // ==========================================
  // AUTH SYSTEM: SINKRONISASI TELEGRAM & BROWSER
  // ==========================================

  // 1. Verifikasi JWT ke API dan ambil data user
  const fetchProfile = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Token invalid');
      const data = await res.json();
      setUser({ name: data.name, id: data.userId });
      return true;
    } catch {
      localStorage.removeItem('auth_token');
      return false;
    }
  };

  // 2. Fetch Data Airdrop (menggunakan JWT)
  const fetchAirdrops = async (token) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/airdrops`, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      setAirdrops(data);

      const pending = data.filter(a => a.status === 'pending').length;
      if (pending > 5) setMood('tired');
      else if (pending > 0) setMood('happy');
      else setMood('excited');

      setError(null);
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Main Auth Initialization
  const initAuth = async () => {
    try {
      // A. Cek apakah dibuka lewat OTP Link di Browser (dari tombol Telegram)
      const urlParams = new URLSearchParams(window.location.search);
      const otp = urlParams.get('otp');
      
      if (otp) {
        const res = await fetch(`${API_URL}/auth/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp }),
        });
        const data = await res.json();
        
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          window.history.replaceState({}, document.title, window.location.pathname); // hapus ?otp= dari URL
          const valid = await fetchProfile(data.token);
          if (valid) {
            setIsAuthenticated(true);
            await fetchAirdrops(data.token);
            return;
          }
        }
      }

      // B. Cek apakah sudah pernah login (ada token di localStorage)
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        const valid = await fetchProfile(savedToken);
        if (valid) {
          setIsAuthenticated(true);
          await fetchAirdrops(savedToken);
          return;
        }
      }

      // C. Cek apakah dibuka di dalam Telegram Mini App
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.expand();
        
        const initData = webApp.initData;
        
        if (initData) {
          const res = await fetch(`${API_URL}/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          const data = await res.json();
          
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
            setUser({ name: data.user.name, id: data.user.id });
            setIsAuthenticated(true);
            await fetchAirdrops(data.token);
            return;
          }
        }
      }

      // D. Kalau semua gagal, berarti di browser biasa tanpa OTP. Minta login.
      setLoading(false);
      
    } catch (err) {
      console.error('Auth error:', err);
      setLoading(false);
      setError("Gagal menghubungi server.");
    }
  };

  // 4. Handle OTP Manual Input (untuk layar login browser)
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    
    const res = await fetch(`${API_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: otpInput }),
    });
    const data = await res.json();
    
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      setIsAuthenticated(true);
      await fetchAirdrops(data.token);
    } else {
      setOtpError('Kode OTP salah atau expired!');
    }
  };
  // ===== HANDLE OPEN IN BROWSER =====
  const handleOpenInBrowser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return alert('Token tidak ditemukan');

      // 1. Minta OTP ke Worker API
      const res = await fetch(`${API_URL}/auth/otp/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });

      const data = await res.json();
      
      if (data.otp) {
        // 2. Buka halaman dashboard di browser external dengan OTP di URL
        const dashboardUrl = window.location.origin; // Ambil URL dasar pages.dev kamu
        const browserLink = `${dashboardUrl}?otp=${data.otp}`;
        
        // Telegram WebApp API untuk buka link di browser luar (Chrome/Safari)
        window.Telegram.WebApp.openLink(browserLink);
      }
    } catch (err) {
      console.error('Gagal generate OTP:', err);
      alert('Gagal buka di browser');
    }
  };
  useEffect(() => {
    // Delay sedikit agar Telegram WebApp script sempat load
    const timer = setTimeout(() => {
      initAuth();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // ==========================================
  // RENDER UI
  // ==========================================

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌸</div>
        <div>Yui lagi nyiapin data...</div>
      </div>
    );
  }

  // LAYAR LOGIN BROWSER (Tampil kalau bukan dari Telegram & belum ada token)
  if (!isAuthenticated) {
    return (
      <div className="loading" style={{ maxWidth: '400px', margin: '10vh auto', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>🔒</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center' }}>Akses Ditolak</div>
        <div style={{ textAlign: 'center', color: '#666', lineHeight: '1.6', marginBottom: '2rem' }}>
          Dashboard hanya bisa diakses via Telegram, atau masukkan kode OTP yang kamu dapat dari Mini App Telegram.
        </div>
        
        <form onSubmit={handleOTPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.toUpperCase())}
            placeholder="MASUKKAN KODE OTP"
            maxLength={8}
            style={{
              padding: '0.8rem',
              borderRadius: '8px',
              border: '1px solid #ddd',
              textAlign: 'center',
              fontSize: '1.2rem',
              letterSpacing: '3px',
              fontWeight: 'bold'
            }}
          />
          <button 
            type="submit"
            style={{
              padding: '0.8rem',
              borderRadius: '8px',
              border: 'none',
              background: '#764ba2',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Verifikasi
          </button>
          {otpError && <div style={{ color: 'red', textAlign: 'center', fontSize: '0.9rem' }}>{otpError}</div>}
        </form>
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
          
          {/* TOMBOL BUKA DI BROWSER - HANYA MUNCUL DI TELEGRAM */}
          {typeof window !== 'undefined' && window.Telegram?.WebApp?.initData && (
            <button 
              onClick={handleOpenInBrowser}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: '#764ba2',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              🌐 Buka di Browser
            </button>
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
          <button 
            style={{marginTop: '1rem'}} 
            onClick={() => fetchAirdrops(localStorage.getItem('auth_token'))}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<YuiDashboard />);
