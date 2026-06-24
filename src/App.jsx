import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

const MusicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
)

const DownloadIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
)

const LibraryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const HeadphonesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
)

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
)

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

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
  const [dark, setDark] = useState(true)
  const cancelRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved !== null) setDark(saved === 'dark')
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

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
              <LibraryIcon />
            </div>
            <div>
              <h1>SongCentre</h1>
              <p className="subtitle">Song Library Dashboard</p>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <div className="stats">
          <div className="stat-card">
            <MusicIcon />
            <div>
              <div className="stat-val">{songs.length}</div>
              <div className="stat-lbl">Songs</div>
            </div>
          </div>
          <div className="stat-card">
            <HeadphonesIcon />
            <div>
              <div className="stat-val">{stats.downloads}</div>
              <div className="stat-lbl">Downloads</div>
            </div>
          </div>
          <div className="stat-card">
            <EyeIcon />
            <div>
              <div className="stat-val">{stats.views}</div>
              <div className="stat-lbl">Views</div>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap">
            <SearchIcon />
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
          <DownloadIcon size={16} />
          {dlActive ? 'Downloading...' : 'Download All'}
        </button>
      </div>

      <main className="container">
        {dlActive && (
          <div className="dl-bar">
            <div className="dl-bar-top">
              <span className="dl-label">
                <DownloadIcon size={12} />
                Downloading: <strong>{dlProgress.title}</strong>
              </span>
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
                    <MusicIcon />
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
                  <DownloadIcon />
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
