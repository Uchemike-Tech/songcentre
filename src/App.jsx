import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [songs, setSongs] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dlActive, setDlActive] = useState(false)
  const [dlProgress, setDlProgress] = useState({ current: 0, total: 0, title: '' })
  const cancelRef = useRef(false)

  useEffect(() => { loadSongs() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(songs.filter(s =>
      (s.title?.toLowerCase().includes(q) || s.composer?.toLowerCase().includes(q)) &&
      (!category || s.category === category || s.categories?.includes(category))
    ))
  }, [songs, search, category])

  async function loadSongs() {
    try {
      let all = [], from = 0, pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('songs').select('*').range(from, from + pageSize - 1)
        if (error) throw new Error(error.message)
        if (!data?.length) break
        all.push(...data)
        from += pageSize
        if (data.length < pageSize) break
      }
      setSongs(all)
      const cats = new Set()
      all.forEach(s => {
        if (s.category) cats.add(s.category)
        s.categories?.forEach(c => cats.add(c))
      })
      setCategories([...cats].sort())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function dlUrl(id) {
    return `https://drive.google.com/uc?export=download&id=${id}&confirm=t`
  }

  async function downloadAll() {
    cancelRef.current = false
    setDlActive(true)
    const toDl = songs.filter(s => s.google_drive_file_id)
    for (let i = 0; i < toDl.length; i++) {
      if (cancelRef.current) break
      const s = toDl[i]
      const a = document.createElement('a')
      a.href = dlUrl(s.google_drive_file_id)
      a.download = `${s.title || 'song'}.pdf`
      a.target = '_blank'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setDlProgress({ current: i + 1, total: toDl.length, title: s.title })
      await new Promise(r => setTimeout(r, 800))
    }
    setDlActive(false)
    setDlProgress({ current: 0, total: 0, title: '' })
  }

  function cancelDownload() { cancelRef.current = true }

  const stats = songs.reduce((acc, s) => ({
    downloads: acc.downloads + (s.downloads || 0),
    views: acc.views + (s.views || 0),
  }), { downloads: 0, views: 0 })

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading songs from database...</p>
      </div>
    )
  }

  if (error) {
    return <div className="loading-screen"><p className="error-msg">{error}</p></div>
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <h1>SongCentre</h1>
              <p className="subtitle">Song Library Dashboard</p>
            </div>
          </div>
          <div className="stats">
            <div className="stat-card">
              <span className="stat-icon">🎵</span>
              <div>
                <div className="stat-val">{songs.length}</div>
                <div className="stat-lbl">Total Songs</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⬇️</span>
              <div>
                <div className="stat-val">{stats.downloads}</div>
                <div className="stat-lbl">Downloads</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👁️</span>
              <div>
                <div className="stat-val">{stats.views}</div>
                <div className="stat-lbl">Views</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text" placeholder="Search songs..." value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={downloadAll} disabled={dlActive}>
          {dlActive ? 'Downloading...' : 'Download All'}
        </button>
      </div>

      <main className="container">
        {dlActive && (
          <div className="dl-bar">
            <div className="dl-bar-top">
              <span className="dl-label">Downloading: <strong>{dlProgress.title}</strong></span>
              <span className="dl-count">{dlProgress.current} / {dlProgress.total}</span>
              <button className="btn-cancel" onClick={cancelDownload}>Cancel</button>
            </div>
            <div className="dl-track">
              <div className="dl-fill" style={{ width: `${(dlProgress.current / dlProgress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty"><p>No songs match your search.</p></div>
        ) : (
          <div className="song-grid">
            {filtered.map(s => (
              <div key={s.id} className="song-card">
                <div className="card-top">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="card-info">
                    <div className="card-title">{s.title}</div>
                    <div className="card-composer">{s.composer || ''}</div>
                  </div>
                </div>
                <div className="card-tags">
                  {s.category && <span className="tag">{s.category}</span>}
                  <span className="tag tag-light">{s.downloads || 0} downloads</span>
                  <span className="tag tag-light">{s.views || 0} views</span>
                </div>
                <a href={dlUrl(s.google_drive_file_id)} className="btn-download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
