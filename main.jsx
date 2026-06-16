import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  // ===== STATES =====
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mood, setMood] = useState('happy');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // States Tambahan untuk Fitur OTP
  const [telegramIdInput, setTelegramIdInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

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

  // ===== FETCH DATA (PERBAIKAN) =====
  const fetchData = async (loggedInUserId = null) => {
    try {
      setLoading(true);
      const telegramUser = getTelegramUserData();
      
      // 1. Tentukan ID pengguna secara konsisten
      const finalUserId = loggedInUserId || user?.id || telegramUser?.id;
      
      if (!finalUserId) {
        setError("⚠️ Buka dashboard dari tombol di Telegram atau login menggunakan OTP!");
        setLoading(false);
        return;
      }

      // 2. Tentukan Nama secara cerdas: Prioritaskan state user yang sudah ada (dari OTP), 
      // baru kemudian fallback ke data Telegram WebApp, dan terakhir "Kak".
      let finalUserName = "Kak";
      if (user?.name && user.name !== "Kak") {
        finalUserName = user.name;
      } else if (telegramUser?.first_name) {
        finalUserName = telegramUser.first_name;
      }

      setIsAuthenticated(true);
      
      // Update state user secara aman tanpa merusak data lama
      setUser(prev => ({
        id: finalUserId,
        name: finalUserName,
        username: telegramUser?.username || prev?.username || '',
      }));

      const apiUrl = import.meta.env.VITE_API_URL;
      console.log(`[DEBUG] Fetching for user ${finalUserId}`);

      // Fetch airdrops
      const res = await fetch(`${apiUrl}/api/airdrops`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${finalUserId}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setAirdrops(data);

      // Set mood berdasarkan jumlah pending
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

  // ===== HANDLER REQUEST OTP =====
  const handleRequestOtp = async () => {
    if (!telegramIdInput.trim()) {
      setError("Masukkan ID Telegram kamu dulu ya! 🌸");
      return;
    }

    setIsOtpLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: telegramIdInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim OTP.");
      }

      setIsOtpSent(true);
      setError(null);
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setIsOtpLoading(false);
    }
  };

  // ===== HANDLER VERIFY OTP =====
  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      setError("Kode OTP nggak boleh kosong! 🌸");
      return;
    }

    setIsOtpLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId: telegramIdInput.trim(), 
          otp: otpInput.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Kode OTP salah atau kedaluwarsa.");
      }

      setError(null);
      
      // Set data user dari response backend
      setUser({
        name: data.user.name,
        id: data.user.id,
      });

      setIsAuthenticated(true);
      
      // Jalankan fetch data airdrop dengan ID yang sukses diverifikasi
      fetchData(data.user.id);

    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setIsOtpLoading(false);
    }
  };

  // ===== INITIAL EFFECTS =====
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // ===== RENDER VIEW =====

  // 1. Loading Screen
  if (loading && !isAuthenticated) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fff0f5' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌸</div>
        <div style={{ color: '#764ba2', fontWeight: '600' }}>Loading data Yui...</div>
      </div>
    );
  }

  // 2. Login / OTP Form Screen (Jika tidak diakses dari Telegram WebApp & belum auth)
  if (!isAuthenticated) {
    return (
      <div className="login-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(180deg, #f5e6ff 0%, #fff0f5 100%)', padding: '2rem' }}>
        <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌸</div>
          <h2 style={{ color: '#764ba2', marginBottom: '0.5rem' }}>Yui Dashboard</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2rem' }}>Silakan verifikasi akun untuk mengelola data airdrop-mu</p>
          
          {!isOtpSent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Masukkan Telegram ID" 
                value={telegramIdInput}
                onChange={(e) => setTelegramIdInput(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', textAlign: 'center', fontSize: '1rem' }}
              />
              <button 
                onClick={handleRequestOtp} 
                disabled={isOtpLoading}
                style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#764ba2', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: isOtpLoading ? 0.7 : 1 }}
              >
                {isOtpLoading ? "Mengirim..." : "Minta Kode OTP"}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Masukkan 6 Digit OTP" 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', textAlign: 'center', fontSize: '1rem', letterSpacing: '4px' }}
              />
              <button 
                onClick={handleVerifyOtp} 
                disabled={isOtpLoading}
                style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#2ecc71', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: isOtpLoading ? 0.7 : 1 }}
              >
                {isOtpLoading ? "Memverifikasi..." : "Verifikasi & Masuk"}
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1rem', color: '#e74c3c', fontSize: '0.85rem', background: '#fadbd8', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Main Dashboard Screen (Jika sukses terautentikasi)
  const stats = {
    total: airdrops.length,
    pending: airdrops.filter(a => a.status === 'pending').length,
    done: airdrops.filter(a => a.status === 'done' || a.status === 'selesai').length,
    claimed: airdrops.filter(a => a.status === 'claim' || a.status === 'claimed').length,
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
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.3rem', color: '#764ba2', fontWeight: '700' }}>
            Yui 🌸
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic', margin: '0.5rem 0', lineHeight: '1.3' }}>
            {greetings[mood] || greetings.happy}
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.8)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.7rem', color: '#666' }}>
            📊 Total Airdrop
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#764ba2', marginBottom: '0.7rem' }}>
            {airdrops.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#aaa', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.7rem' }}>
            <div>{stats.pending} pending</div>
            <div>{stats.done} selesai</div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#999', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)', width: '100%' }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
            {user?.name}
          </div>
          {user?.username && (
            <div style={{ fontSize: '0.7rem' }}>@{user.username}</div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="container" style={{ flex: 1, padding: '2rem', background: '#faf8fb' }}>
        <div className="header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#764ba2' }}>✨ Yui Dashboard</h1>
          <p>Halo {user?.name}! Kelola airdrop-mu di sini 🌸</p>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '2rem', color: 'red', background: '#fde8e8', padding: '1rem', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <div className="card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#444' }}>📊 Summary</h2>
          <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div className="stat-box" style={{ background: '#f8f6fb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#666' }}>Total Airdrop</h3>
              <div className="number" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#764ba2' }}>{stats.total}</div>
            </div>
            <div className="stat-box" style={{ background: '#fff9e6', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#666' }}>Pending</h3>
              <div className="number" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.pending}</div>
            </div>
            <div className="stat-box" style={{ background: '#e8f8f5', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#666' }}>Selesai</h3>
              <div className="number" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ecc71' }}>{stats.done}</div>
            </div>
            <div className="stat-box" style={{ background: '#eaf2f8', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#666' }}>Claimed</h3>
              <div className="number" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.claimed}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#444' }}>📋 Airdrop List</h2>
          {airdrops.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              📭 Belum ada airdrop. Tambah via /tambah di bot! 🌸
            </p>
          ) : (
            <div className="airdrop-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {airdrops.map((a, idx) => (
                <div key={idx} className="airdrop-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#fcfbfe', borderRadius: '8px', border: '1px solid #f1edf7' }}>
                  <div>
                    <div className="airdrop-name" style={{ fontWeight: '600', color: '#333' }}>{a.nama || a.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.3rem' }}>
                      📅 {a.deadline && !isNaN(new Date(a.deadline).getTime()) 
                        ? new Date(a.deadline).toLocaleDateString('id-ID') 
                        : '—'}
                    </div>
                  </div>
                  <div className={`airdrop-status status-${a.status}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {a.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ textAlign: 'center', color: '#666', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <p>💼 Yui always support you! Jangan nyerah ya~</p>
          <button style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #764ba2', background: 'transparent', color: '#764ba2', cursor: 'pointer', fontWeight: '600' }} onClick={() => fetchData()}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Render ke root element DOM
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<YuiDashboard />);
}
