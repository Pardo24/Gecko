import { useState, useEffect } from 'react';
import { X, Trash2, Search, Film, Tv, RefreshCw, AlertTriangle } from 'lucide-react';

type MediaItem = {
  id: number;
  title: string;
  year: number;
  type: 'movie' | 'series';
  sizeOnDisk: number;
};

type Filter = 'all' | 'movie' | 'series';
type Confirming = { id: number; mode: 'delete' | 'search' } | null;

const formatSize = (bytes: number) => {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
};

export default function SpaceManager({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.electron.getMediaList()
      .then(setItems)
      .catch(() => setError('Could not load media list. Is the stack running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  const toggleConfirm = (id: number, mode: 'delete' | 'search') => {
    setConfirming(prev => (prev?.id === id && prev.mode === mode) ? null : { id, mode });
  };

  const execute = async (item: MediaItem, searchAfter: boolean) => {
    setDeleting(item.id);
    setConfirming(null);
    try {
      await window.electron.deleteMedia({ id: item.id, type: item.type, searchAfter });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      setError(`Failed to delete "${item.title}". Is the stack running?`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'stretch',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
      }}>

        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <span className="font-bold text-sm flex-1" style={{ color: 'var(--text)' }}>Storage Manager</span>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 6px' }}>
            <X size={14} />
          </button>
        </div>

        {/* Filter + count row */}
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 6,
          flexShrink: 0,
        }}>
          {(['all', 'movie', 'series'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 12px', borderRadius: 99, fontSize: '0.73rem', fontWeight: 600,
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text-3)',
                border: filter === f ? 'none' : '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : 'Series'}
            </button>
          ))}
          {!loading && (
            <span className="text-xs flex-1 text-right" style={{ color: 'var(--text-3)' }}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
              {filtered.length > 0 && (
                <> · {formatSize(filtered.reduce((s, i) => s + i.sizeOnDisk, 0))}</>
              )}
            </span>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--text-3)', gap: 8 }}>
              <RefreshCw size={14} className="spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
              <AlertTriangle size={20} style={{ color: '#eab308' }} />
              <p className="text-sm" style={{ color: 'var(--text-3)', textAlign: 'center', maxWidth: 280 }}>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)', fontSize: '0.85rem' }}>
              No media found
            </div>
          ) : (
            filtered.map(item => (
              <div key={item.id}>
                {/* Item row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  borderBottom: '1px solid var(--border)',
                  opacity: deleting === item.id ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                }}>
                  {item.type === 'movie'
                    ? <Film size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    : <Tv size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                  }
                  <span className="text-sm font-medium flex-1" style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                    {item.year ? <span className="font-normal" style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: '0.72rem' }}>{item.year}</span> : null}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-2)', flexShrink: 0, minWidth: 54, textAlign: 'right' }}>
                    {formatSize(item.sizeOnDisk)}
                  </span>
                  <button
                    onClick={() => toggleConfirm(item.id, 'search')}
                    disabled={deleting === item.id}
                    title="Delete files and search for a new release"
                    className="btn-ghost"
                    style={{
                      padding: '4px 7px', flexShrink: 0,
                      color: confirming?.id === item.id && confirming.mode === 'search' ? 'var(--accent)' : 'var(--text-3)',
                    }}
                  >
                    <Search size={13} />
                  </button>
                  <button
                    onClick={() => toggleConfirm(item.id, 'delete')}
                    disabled={deleting === item.id}
                    title="Delete from library"
                    className="btn-ghost"
                    style={{
                      padding: '4px 7px', flexShrink: 0,
                      color: confirming?.id === item.id && confirming.mode === 'delete' ? '#ef4444' : 'var(--text-3)',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Inline confirmation */}
                {confirming?.id === item.id && (
                  <div style={{
                    margin: '0 12px 8px',
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: confirming.mode === 'delete' ? 'rgba(239,68,68,0.06)' : 'rgba(13,148,136,0.06)',
                    border: `1px solid ${confirming.mode === 'delete' ? 'rgba(239,68,68,0.2)' : 'rgba(13,148,136,0.2)'}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <AlertTriangle size={12} style={{ color: confirming.mode === 'delete' ? '#ef4444' : 'var(--accent)', flexShrink: 0 }} />
                    <p className="text-xs flex-1" style={{ color: 'var(--text-2)' }}>
                      {confirming.mode === 'delete'
                        ? `Remove "${item.title}" from library and delete all files?`
                        : `Delete files for "${item.title}" and search for a new release?`
                      }
                    </p>
                    <button
                      onClick={() => execute(item, confirming.mode === 'search')}
                      style={{
                        padding: '3px 12px', borderRadius: 99, fontSize: '0.71rem', fontWeight: 700,
                        background: confirming.mode === 'delete' ? '#ef4444' : 'var(--accent)',
                        color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      Confirm
                    </button>
                    <button onClick={() => setConfirming(null)} className="btn-ghost" style={{ padding: '3px 5px', flexShrink: 0 }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16, flexShrink: 0,
        }}>
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
            <Search size={11} style={{ color: 'var(--accent)' }} /> Delete files + search new release
          </span>
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
            <Trash2 size={11} style={{ color: '#ef4444' }} /> Remove from library
          </span>
        </div>
      </div>
    </div>
  );
}
