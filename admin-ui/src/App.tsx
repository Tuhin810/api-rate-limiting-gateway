import React, { useState, useEffect } from 'react';
import './index.css';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

interface RateConfig {
  capacity: number;
  refillRate: number;
}

interface ConfigMap {
  [path: string]: RateConfig;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [configs, setConfigs] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [editPath, setEditPath] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RateConfig>({ capacity: 0, refillRate: 0 });

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${GATEWAY_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
      } else {
        alert('Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Login error');
    }
  };

  // Fetch Configs
  const fetchConfigs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${GATEWAY_URL}/admin/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        setToken(null);
        localStorage.removeItem('token');
        return;
      }
      const data = await res.json();
      setConfigs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchConfigs();
  }, [token]);

  // Update Config
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPath) return;

    try {
      const res = await fetch(`${GATEWAY_URL}/admin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          path: editPath,
          ...editForm
        })
      });
      if (res.ok) {
        setEditPath(null);
        fetchConfigs();
      } else {
        alert('Failed to update');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="card">
          <h1>Admin Login</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Rate Limit Gateway Admin</h1>
        <button className="logout" onClick={() => { setToken(null); localStorage.removeItem('token'); }}>Logout</button>
      </header>

      <div className="content">
        <div className="actions">
          <button onClick={fetchConfigs}>Refresh</button>
          <button onClick={() => {
            const newPath = prompt("Enter new API Path (e.g., /api/new)");
            if (newPath) {
              setEditPath(newPath);
              setEditForm({ capacity: 10, refillRate: 1 });
            }
          }}>+ Add Rule</button>
        </div>

        {loading ? <p>Loading...</p> : (
          <div className="grid">
            {Object.entries(configs).map(([path, config]) => (
              <div key={path} className="card config-card">
                <h3>{path}</h3>
                <div className="details">
                  <p><strong>Capacity:</strong> {config.capacity}</p>
                  <p><strong>Refill Rate:</strong> {config.refillRate}/sec</p>
                </div>
                <button onClick={() => {
                  setEditPath(path);
                  setEditForm(config);
                }}>Edit</button>
              </div>
            ))}
            {Object.keys(configs).length === 0 && <p>No rules defined. Add one!</p>}
          </div>
        )}
      </div>

      {editPath && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Rule: {editPath}</h2>
            <form onSubmit={handleUpdate}>
              <label>
                Capacity (Max Tokens)
                <input
                  type="number"
                  value={editForm.capacity}
                  onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                />
              </label>
              <label>
                Refill Rate (Tokens/Sec)
                <input
                  type="number"
                  step="0.1"
                  value={editForm.refillRate}
                  onChange={e => setEditForm({ ...editForm, refillRate: Number(e.target.value) })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditPath(null)}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
