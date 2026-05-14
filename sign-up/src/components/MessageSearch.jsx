import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, Loader2, MessageSquare, Clock } from 'lucide-react';
import axios from '../api/Axios';

/**
 * MessageSearch — debounced Algolia search scoped to the current room.
 *
 * Props:
 *   roomId       {string}   - Supabase UUID of the current room (for filter)
 *   onSelectHit  {function} - Called with a hit object when the user clicks a result
 *   className    {string}   - Extra CSS classes on the wrapper
 */
const MessageSearch = ({ roomId, onSelectHit, className = '' }) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Debounced search — 300 ms after the user stops typing
  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2 || !roomId) {
      setHits([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/search/messages', {
        params: { q: q.trim(), roomId },
      });
      setHits(res.data.hits || []);
      setOpen(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many searches — please slow down.');
      } else {
        setError('Search unavailable right now.');
      }
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleClear = () => {
    setQuery('');
    setHits([]);
    setOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Highlight matched text (Algolia's _highlightResult)
  const Highlighted = ({ value }) => (
    <span
      dangerouslySetInnerHTML={{ __html: value }}
      className="search-highlight"
    />
  );

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className={`relative ${className}`} style={{ minWidth: 240 }}>
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:border-iris-500 transition-colors">
        {loading
          ? <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
          : <Search size={16} className="text-gray-400 shrink-0" />
        }
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search messages…"
          aria-label="Search messages in this room"
          className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none flex-1 min-w-0"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results Panel */}
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50"
          style={{ maxHeight: 360 }}
        >
          {error ? (
            <p className="px-4 py-3 text-sm text-red-400">{error}</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {hits.map((hit) => (
                <li key={hit.objectID}>
                  <button
                    role="option"
                    onClick={() => {
                      onSelectHit?.(hit);
                      setOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col gap-0.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-iris-500 flex items-center gap-1">
                        <MessageSquare size={11} />
                        {hit.sender}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {formatTime(hit.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
                      {hit._highlightResult?.content ? (
                        <Highlighted value={hit._highlightResult.content.value} />
                      ) : (
                        hit.content
                      )}
                    </p>
                  </button>
                </li>
              ))}

              {/* Algolia attribution — required by Algolia ToS */}
              <li className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <span className="text-[10px] text-gray-400">Search by Algolia</span>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* Inline style for Algolia highlight marks */}
      <style>{`
        .search-highlight mark,
        .search-highlight em {
          background: transparent;
          color: #6366f1;
          font-weight: 700;
          font-style: normal;
        }
      `}</style>
    </div>
  );
};

export default MessageSearch;
