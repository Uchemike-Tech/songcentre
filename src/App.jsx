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

  useEffect(() => {
    loadSongs()
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    const f = songs.filter(s =>
      (s.title?.toLowerCase().includes(q) || s.composer?.toLowerCase().includes(q)) &&
      (!category || s.category === category || s.categories?.includes(category))
    )
    setFiltered(f)
  }, [songs, search, category])

  async function loadSongs() {
    try {
      let all = [], from = 0, pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('songs')
          .select('*')
          .range(from, from + pageSize - 1)
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

  function cancelDownload() {
    cancelRef.current = true
  }

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
    return (
      <div className="loading-screen">
        <p style={{ color: '#e74c3c' }}>Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>SongCentre</h1>
        <p>Browse and download PDF song sheets from the library</p>
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{songs.length}</div>
            <div className="stat-label">Songs</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.downloads}</div>
            <div className="stat-label">Downloads</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.views}</div>
            <div className="stat-label">Views</div>
          </div>
        </div>
      </header>

      <nav className="toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            id="search"
            placeholder="Search songs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {dlActive && (
            <div className="progress-inline">
              <progress value={dlProgress.current} max={dlProgress.total} />
              <span>{dlProgress.current} / {dlProgress.total}</span>
            </div>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={downloadAll}
          disabled={dlActive}
        >
          {dlActive ? 'Downloading...' : 'Download All'}
        </button>
      </nav>

      <main className="container">
        {dlActive && (
          <div className="dl-bar">
            <div className="dl-bar-info">
              <span>Downloading: {dlProgress.title}</span>
              <span>{dlProgress.current} / {dlProgress.total}</span>
            </div>
            <div className="dl-bar-track">
              <div
                className="dl-bar-fill"
                style={{ width: `${(dlProgress.current / dlProgress.total) * 100}%` }}
              />
            </div>
            <button className="btn btn-danger btn-sm" onClick={cancelDownload}>
              Cancel
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty"><p>No songs match your search.</p></div>
        ) : (
          <div className="songs-grid">
            {filtered.map(s => (
              <div key={s.id} className="song-card">
                <div className="song-title">{s.title}</div>
                <div className="song-composer">{s.composer || ''}</div>
                <div className="song-meta">
                  {s.category && <span>{s.category}</span>}
                  <span>{s.downloads || 0} downloads</span>
                  <span>{s.views || 0} views</span>
                </div>
                <a
                  href={dlUrl(s.google_drive_file_id)}
                  className="btn btn-success"
                >
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
