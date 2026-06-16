import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function YuiDashboard() {
  const [airdrops, setAirdrops] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mood, setMood] = useState('happy');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [platform, setPlatform] = useState(null); // 'telegram' | 'browser'
  const [debugInfo, setDebugInfo] = useState(null);
  
  // OTP state
  const [telegramIdInput, setTelegramIdInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false); // State untuk efek loading tombol
  
  const API_URL = import.meta.env.VITE_API_URL;
  const DEBUG = true; // Set ke false untuk production
  
  // Logging utility
  const log = (msg, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${msg}`, data || '');
    if (DEBUG && data) {
      setDebugInfo(msg);
    }
  };

  // ==========================================
  // HELPER: Fetch user profile
  // ==========================================
  const fetchProfile = async (token) => {
    try {
      log(`Fetching profile with token: ${token.substring(0, 20)}...`);
      
      const res = await fetch(`${API_URL}/api/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      log(`Profile response status: ${res.status}`);

      if (!res.ok) throw new Error('Token invalid');
      
      const data = await res.json();
      log(`Profile fetched:`, data);
      
      setUser({ name: data.name, id: data.userId });
      return true;
    } catch (err) {
      log(`Profile fetch error: ${err.message}`);
      localStorage.removeItem('auth_token');
      return false;
    }
  };

  // ==========================================
  // HELPER: Fetch airdrops list
  // ==========================================
  const fetchAirdrops = async (token) => {
    try {
      setLoading(true);
      log(`Fetching airdrops with token: ${token.substring(0, 20)}...`);

      const res = await fetch(`${API_URL}/api/airdrops`, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      log(`Airdrops response status: ${res.status}`);

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      log(`Airdrops fetched:`, { count: data.length, data });
      
      setAirdrops(data);

      // Update mood
      const pending = data.filter(a => a.status === 'pending').length;
      if (pending > 5) setMood('tired');
      else if (pending > 0) setMood('happy');
      else setMood('excited');

      setError(null);
    } catch (err) {
      log(`Airdrops fetch error: ${err.message}`);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // OTP VERIFICATION
  // ==========================================
  const verifyOTP = async (otpCode) => {
    try {
      log(`Verifying OTP: ${otpCode}`);

      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode }),
      });

      log(`OTP verification response status: ${res.status}`);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'OTP verification failed');
      }

      const data = await res.json();
      log(`OTP verification success:`, data);
      
      // Set semua state dengan benar
      localStorage.setItem('auth_token', data.token);
      setUser({ name: data.user.name, id: data.user.id });
      setPlatform('browser'); // <-- CRITICAL: Set platform
      setIsAuthenticated(true);
      setOtpInput('');
      setOtpError('');

      // Fetch data
      await fetchAirdrops(data.token);
      return true;
    } catch (err) {
      log(`OTP verification error: ${err.message}`);
      setOtpError(err.message || 'Kode OTP salah atau expired!');
      return false;
    }
  };

  // ==========================================
  // HANDLE: OTP Manual Submit
  // ==========================================
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    
    if (!otpInput.trim()) {
      setOtpError('Masukkan kode OTP terlebih dahulu');
      return;
    }

    setOtpLoading(true);
    await verifyOTP(otpInput);
    setOtpLoading(false);
  };

  // ==========================================
  // HANDLE: Open in Browser
  // ==========================================
  const handleOpenInBrowser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Token tidak ditemukan');
        return;
      }

      log(`Generating OTP with token: ${token.substring(0, 20)}...`);

      const res = await fetch(`${API_URL}/auth/otp/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });

      log(`OTP generation response status: ${res.status}`);

      if (!res.ok) {
        throw new Error('Gagal generate OTP');
      }

      const data = await res.json();
      log(`OTP generated:`, data);
      
      if (data.otp) {
        const dashboardUrl = window.location.origin;
        const browserLink = `${dashboardUrl}?otp=${data.otp}`;
        
        // Copy ke clipboard
        navigator.clipboard.writeText(browserLink);
        alert(`✅ Link disalin ke clipboard!\n\nOTP: ${data.otp}\nExpires in: 10 minutes`);
        
        // Atau buka langsung
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.openLink(browserLink);
        }
      }
    } catch (err) {
      log(`Generate OTP error: ${err.message}`);
      alert('❌ Gagal generate OTP: ' + err.message);
    }
  };

  // ==========================================
  // AUTH INITIALIZATION
  // ==========================================
  const initAuth = async (retryCount = 0) => {
    try {
      log(`=== AUTH INIT START (retry: ${retryCount}) ===`);

      // 1. Check OTP in URL
      const urlParams = new URLSearchParams(window.location.search);
      const otp = urlParams.get('otp');
      
      if (otp) {
        log(`OTP found in URL: ${otp}`);
        const success = await verifyOTP(otp);
        if (success) {
          window.history.replaceState({}, document.title, window.location.pathname);
          log(`=== AUTH INIT COMPLETE (OTP) ===`);
          return;
        }
      }

      // 2. Check saved token
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        log(`Saved token found in localStorage`);
        const valid = await fetchProfile(savedToken);
        if (valid) {
          log(`Token validation successful, setting platform: browser`);
          setPlatform('browser'); // <-- CRITICAL: Set platform
          setIsAuthenticated(true);
          await fetchAirdrops(savedToken);
          log(`=== AUTH INIT COMPLETE (localStorage) ===`);
          return;
        }
      }

      // 3. Check Telegram WebApp
      const telegramInitData = window.__TELEGRAM_INIT_DATA__;
      
      if (telegramInitData) {
        log(`Telegram initData detected`);
        const res = await fetch(`${API_URL}/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: telegramInitData }),
        });

        log(`Telegram auth response status: ${res.status}`);

        if (!res.ok) {
          throw new Error('Telegram auth failed');
        }

        const data = await res.json();
        log(`Telegram auth success:`, data);
        
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          setUser({ name: data.user.name, id: data.user.id });
          log(`Setting platform: telegram`);
          setPlatform('telegram'); // <-- CRITICAL: Set platform
          setIsAuthenticated(true);
          
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
          }
          
          await fetchAirdrops(data.token);
          log(`=== AUTH INIT COMPLETE (Telegram) ===`);
          return;
        }
      }

      // 4. Retry logic
      if (retryCount < 1) {
        log(`No auth method worked, retrying after 2s...`);
        setTimeout(() => initAuth(retryCount + 1), 2000);
        return;
      }

      // 5. Fallback to login screen
      log(`All auth methods failed, showing login screen`);
      setLoading(false);
      log(`=== AUTH INIT COMPLETE (FALLBACK) ===`);
      
    } catch (err) {
      log(`Auth init error: ${err.message}`);
      setLoading(false);
      setError("❌ Gagal menghubungi server.");
    }
  };

  // Effect: Initialize on mount
  useEffect(() => {
    initAuth();
  }, []);

  // ==========================================
  // RENDER: Loading
  // ==========================================
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5e6ff 0%, #fff0f5 100%)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌸</div>
        <div style={{ fontSize: '1.1rem', color: '#764ba2' }}>Yui lagi nyiapin data...</div>
        {debugInfo && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#666',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            {debugInfo}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: Not Authenticated
  // ==========================================
  if (!isAuthenticated) {
  return (
    <div className="login-container" style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌸</div>
      <h2>Login ke Dashboard Yui</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Buka dari Telegram, atau gunakan ID Telegram-mu untuk request OTP.</p>

      {!isOtpSent ? (
        <div>
          <input 
            type="text" 
            placeholder="Masukkan Telegram ID kamu" 
            value={telegramIdInput}
            onChange={(e) => setTelegramIdInput(e.target.value)}
            style={{ padding: '0.5rem', width: '200px', marginBottom: '1rem' }}
          />
          <br/>
          <button onClick={handleRequestOtp}>Kirim Kode OTP</button>
        </div>
      ) : (
        <div>
          <input 
            type="text" 
            placeholder="Masukkan 6 Digit OTP" 
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            style={{ padding: '0.5rem', width: '200px', marginBottom: '1rem' }}
          />
          <br/>
          <button onClick={handleVerifyOtp}>Verifikasi & Login</button>
        </div>
      )}
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
  // ==========================================
  // RENDER: Dashboard
  // ==========================================
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9f9f9' }}>
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
            {stats.total}
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
          
          {/* IMPORTANT: Show button ONLY if platform is 'telegram' */}
          {platform === 'telegram' && (
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
                gap: '0.3rem',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = '#5a3680'}
              onMouseOut={(e) => e.target.style.background = '#764ba2'}
            >
              🌐 Buka di Browser
            </button>
          )}

          {/* Platform badge */}
          <div style={{
            marginTop: '0.8rem',
            fontSize: '0.7rem',
            padding: '0.3rem 0.5rem',
            background: platform === 'telegram' ? '#e3f2fd' : '#f3e5f5',
            color: platform === 'telegram' ? '#1976d2' : '#7b1fa2',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {platform === 'telegram' ? '📱 Telegram' : platform === 'browser' ? '💻 Browser' : '❓ Unknown'}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#333' }}>✨ Yui Dashboard</h1>
          <p style={{ color: '#666' }}>Halo {user?.name}! Kelola airdrop-mu di sini 🌸</p>
        </div>

        {error && (
          <div style={{ 
            marginBottom: '2rem', 
            padding: '1rem', 
            background: '#ffe0e0', 
            color: '#c41c3b',
            borderRadius: '8px',
            borderLeft: '4px solid #c41c3b'
          }}>
            {error}
          </div>
        )}

        {/* STATS CARD */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>📊 Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.9 }}>Total Airdrop</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.9 }}>Pending</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.pending}</div>
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.9 }}>Selesai</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.done}</div>
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: '#333',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.8 }}>Claimed</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.claimed}</div>
            </div>
          </div>
        </div>

        {/* AIRDROP LIST */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>📋 Airdrop List ({airdrops.length})</h2>
          {airdrops.length === 0 ? (
            <p style={{color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '2rem'}}>
              📭 Belum ada airdrop. Tambah via /tambah di bot! 🌸
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {airdrops.map((a, idx) => (
                <div key={idx} style={{
                  padding: '1rem',
                  background: '#fafafa',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeft: '4px solid #764ba2'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.3rem' }}>{a.nama || a.name}</div>
                    <div style={{fontSize: '0.85rem', color: '#999'}}>
                      📅 {a.deadline ? new Date(a.deadline).toLocaleDateString('id-ID') : '—'}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.4rem 0.8rem',
                    background: getStatusColor(a.status),
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#666',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <p style={{ marginBottom: '1rem' }}>💼 Yui always support you! Jangan nyerah ya~</p>
          <button 
            onClick={() => fetchAirdrops(localStorage.getItem('auth_token'))}
            style={{
              padding: '0.8rem 1.5rem',
              background: '#764ba2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.background = '#5a3680'}
            onMouseOut={(e) => e.target.style.background = '#764ba2'}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper: Get status color
function getStatusColor(status) {
  const colors = {
    'pending': '#ff9800',
    'done': '#4caf50',
    'claim': '#2196f3',
    'completed': '#4caf50'
  };
  return colors[status] || '#999';
}

ReactDOM.createRoot(document.getElementById('root')).render(<YuiDashboard />);
