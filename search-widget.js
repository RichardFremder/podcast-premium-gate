/**
 * search-widget.js — Timeline Story
 * Widget de recherche universel, à inclure dans toutes les pages.
 * Nécessite dans la nav :
 *   - un <button class="nav-search-btn" id="search-toggle-btn">
 *   - le bloc #search-overlay (injecté automatiquement si absent)
 */

(function() {
  'use strict';

  // ── Injection du bloc search overlay dans le DOM ──────────────────────────
  function injectSearchOverlay() {
    if (document.getElementById('search-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.innerHTML = [
      '<div id="search-panel">',
      '  <div id="search-header">',
      '    <div id="search-input-wrap">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      '      </svg>',
      '      <input type="text" id="search-input" placeholder="Rechercher un épisode, un thème…" autocomplete="off">',
      '      <button id="search-close-btn" aria-label="Fermer">',
      '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      '        </svg>',
      '      </button>',
      '    </div>',
      '  </div>',
      '  <div id="search-body">',
      '    <div id="search-status"></div>',
      '    <div id="search-results"></div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    injectSearchStyles();
    bindSearchEvents();
  }

  // ── Styles injectés une seule fois ───────────────────────────────────────
  function injectSearchStyles() {
    if (document.getElementById('search-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'search-widget-styles';
    style.textContent = [
      '#search-overlay {',
      '  display: none; position: fixed; inset: 0; z-index: 999;',
      '  background: rgba(8,15,30,0.88); backdrop-filter: blur(8px);',
      '  align-items: flex-start; justify-content: center; padding-top: 80px;',
      '}',
      '#search-overlay.open { display: flex; }',
      '#search-panel {',
      '  width: 100%; max-width: 680px; margin: 0 16px;',
      '  background: #0e1e3a; border: 1px solid rgba(22,107,245,0.25);',
      '  border-radius: 8px; overflow: hidden;',
      '  box-shadow: 0 24px 80px rgba(0,0,0,0.6);',
      '  max-height: calc(100vh - 120px); display: flex; flex-direction: column;',
      '}',
      '#search-header { padding: 0; border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }',
      '#search-input-wrap {',
      '  display: flex; align-items: center; gap: 12px; padding: 16px 20px;',
      '  color: rgba(200,214,232,0.5);',
      '}',
      '#search-input {',
      '  flex: 1; background: none; border: none; outline: none;',
      '  font-size: 17px; color: #fff; font-family: inherit;',
      '}',
      '#search-input::placeholder { color: rgba(200,214,232,0.35); }',
      '#search-close-btn {',
      '  background: none; border: none; cursor: pointer;',
      '  color: rgba(200,214,232,0.5); display: flex; padding: 4px;',
      '  transition: color 0.2s;',
      '}',
      '#search-close-btn:hover { color: #fff; }',
      '#search-body { overflow-y: auto; flex: 1; }',
      '#search-status {',
      '  font-size: 12px; color: rgba(200,214,232,0.4);',
      '  padding: 10px 20px; text-transform: uppercase; letter-spacing: 0.1em;',
      '}',
      '.sr-item {',
      '  display: flex; align-items: center; gap: 14px;',
      '  padding: 12px 20px; cursor: pointer;',
      '  border-bottom: 1px solid rgba(255,255,255,0.05);',
      '  transition: background 0.15s; text-decoration: none;',
      '}',
      '.sr-item:hover { background: rgba(22,107,245,0.12); }',
      '.sr-thumb {',
      '  width: 60px; height: 60px; object-fit: cover;',
      '  border-radius: 4px; flex-shrink: 0; background: #1e2d4a;',
      '}',
      '.sr-body { flex: 1; overflow: hidden; }',
      '.sr-emission {',
      '  font-size: 10px; color: #166bf5; text-transform: uppercase;',
      '  letter-spacing: 0.1em; margin-bottom: 3px;',
      '}',
      '.sr-title { font-size: 15px; color: #fff; line-height: 1.35; margin-bottom: 4px; }',
      '.sr-desc { font-size: 12px; color: #4a607f; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.sr-play {',
      '  width: 36px; height: 36px; background: #166bf5; border-radius: 50%;',
      '  display: flex; align-items: center; justify-content: center;',
      '  flex-shrink: 0; transition: background 0.2s; border: none; cursor: pointer;',
      '}',
      '.sr-play:hover { background: #0d4fd4; }',
      '.sr-play svg { width: 13px; height: 13px; fill: white; margin-left: 2px; }',
      '.sr-empty {',
      '  padding: 48px 20px; text-align: center;',
      '  color: rgba(200,214,232,0.35); font-size: 14px;',
      '}',
      '.sr-loader {',
      '  display: flex; align-items: center; justify-content: center;',
      '  gap: 8px; padding: 32px; color: rgba(200,214,232,0.4); font-size: 14px;',
      '}',
      '.sr-spinner {',
      '  width: 18px; height: 18px; border: 2px solid rgba(22,107,245,0.3);',
      '  border-top-color: #166bf5; border-radius: 50%;',
      '  animation: sr-spin 0.8s linear infinite;',
      '}',
      '@keyframes sr-spin { to { transform: rotate(360deg); } }',
      '@media (max-width: 600px) {',
      '  #search-overlay { padding-top: 60px; }',
      '  #search-panel { margin: 0 8px; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Logique de recherche ──────────────────────────────────────────────────
  var searchTimer = null;
  var lastQuery = '';

  function openSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    setTimeout(function() {
      var inp = document.getElementById('search-input');
      if (inp) inp.focus();
    }, 50);
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    var inp = document.getElementById('search-input');
    if (inp) inp.value = '';
    setStatus('');
    setResults('');
    lastQuery = '';
  }

  function setStatus(txt) {
    var el = document.getElementById('search-status');
    if (el) el.textContent = txt;
  }

  function setResults(html) {
    var el = document.getElementById('search-results');
    if (el) el.innerHTML = html;
  }

  function doSearch(q) {
    if (!q || q.length < 2) {
      setStatus('');
      setResults('');
      return;
    }
    if (q === lastQuery) return;
    lastQuery = q;

    setStatus('Recherche…');
    setResults('<div class="sr-loader"><div class="sr-spinner"></div> Chargement…</div>');

    fetch('/.netlify/functions/search?q=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) {
          setStatus('Erreur : ' + data.error);
          setResults('<div class="sr-empty">Une erreur est survenue.</div>');
          return;
        }
        var results = data.results || [];
        if (results.length === 0) {
          setStatus('Aucun résultat');
          setResults('<div class="sr-empty">Aucun épisode trouvé pour « ' + escHtml(q) + ' »</div>');
          return;
        }
        setStatus(results.length + (data.total > results.length ? '+ ' : '') + ' résultat' + (results.length > 1 ? 's' : ''));
        setResults(results.map(function(r) { return renderItem(r); }).join(''));
      })
      .catch(function(e) {
        setStatus('Erreur réseau');
        setResults('<div class="sr-empty">Impossible de contacter le serveur.</div>');
        console.error('[search-widget]', e);
      });
  }

  function getEmissionId(emission) {
    var map = {
      'Les Interviews Histoire': 'interviews',
      '5000 ans d\'Histoire': '5000ans',
      '5 Minutes d\'Histoire': '5minutes',
      'La Matinale de l\'Histoire': 'matinale',
      'After Week': 'afterweek',
      'La Planète des Hommes': 'planete',
      'Histoires de Business': 'business',
      'PhilosoFoot': 'philosofoot',
      'Le saviez-vous ?': 'saviez',
      'Le BookTok de l\'Histoire': 'booktok',
      'Histoire ou Fiction ?': 'fiction',
      'La Playlist de...': 'playlist',
      'Histoire Xtraordinaire': 'xtraordinaire'
    };
    return map[emission] || null;
  }

  function renderItem(r) {
    var thumb = r.image
      ? '<img class="sr-thumb" src="' + escAttr(r.image) + '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="sr-thumb"></div>';

    var playBtn = r.audioUrl
      ? '<button class="sr-play" onclick="event.stopPropagation();event.preventDefault();window.tsPlayAudio(\'' + escAttr(r.audioUrl) + '\',\'' + escAttr(r.titre) + '\')">' +
        '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>'
      : '';

    var emId = getEmissionId(r.emission);
    var url = emId ? '/episode.html?id=' + r.id.replace(/-/g,'') + '&emission=' + emId : null;
    var tag = url ? 'a' : 'div';
    var href = url ? ' href="' + url + '"' : '';

    return '<' + tag + ' class="sr-item"' + href + '>' +
      thumb +
      '<div class="sr-body">' +
        '<div class="sr-emission">' + escHtml(r.emission) + '</div>' +
        '<div class="sr-title">' + escHtml(r.titre) + '</div>' +
        (r.desc ? '<div class="sr-desc">' + escHtml(r.desc) + '</div>' : '') +
      '</div>' +
      playBtn +
    '</' + tag + '>';
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) {
    return String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;');
  }

  // ── Lecture audio depuis les résultats ───────────────────────────────────
  window.tsPlayAudio = function(url, titre) {
    // Cherche le player live existant sur la page (bandeau bas)
    var liveAudio = document.getElementById('radio-stream');
    if (liveAudio) {
      liveAudio.src = url;
      liveAudio.play();
      var showEl = document.querySelector('.live-show');
      if (showEl) showEl.textContent = titre;
      var trackEl = document.getElementById('live-track');
      if (trackEl) trackEl.textContent = 'Épisode en cours';
      // Sync icônes play/pause du bandeau
      var iconPlay = document.getElementById('icon-play');
      var iconPause = document.getElementById('icon-pause');
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconPause) iconPause.style.display = '';
      closeSearch();
      return;
    }
    // Fallback : player minimal
    if (window._tsSearchAudio) {
      window._tsSearchAudio.pause();
    }
    window._tsSearchAudio = new Audio(url);
    window._tsSearchAudio.play();
    closeSearch();
  };

  // ── Binding des événements ────────────────────────────────────────────────
  function bindSearchEvents() {
    var overlay = document.getElementById('search-overlay');
    var input = document.getElementById('search-input');
    var closeBtn = document.getElementById('search-close-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    // Clic sur le fond ferme
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeSearch();
      });
    }

    // Frappe dans l'input — debounce 350ms
    if (input) {
      input.addEventListener('input', function() {
        var q = input.value.trim();
        clearTimeout(searchTimer);
        if (q.length < 2) {
          setStatus('');
          setResults('');
          lastQuery = '';
          return;
        }
        searchTimer = setTimeout(function() { doSearch(q); }, 350);
      });

      input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSearch();
        if (e.key === 'Enter') {
          clearTimeout(searchTimer);
          doSearch(input.value.trim());
        }
      });
    }
  }

  // ── Bouton loupe dans la nav ──────────────────────────────────────────────
  function bindToggleButton() {
    // Bouton existant dans la nav
    var btn = document.getElementById('search-toggle-btn');
    if (!btn) {
      // Cherche par classe si pas d'id
      btn = document.querySelector('.nav-search-btn');
    }
    if (btn) {
      // Remplace les anciens listeners en clonant
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.id = 'search-toggle-btn';
      newBtn.addEventListener('click', openSearch);
    }
  }

  // ── Raccourci clavier global Cmd/Ctrl + K ─────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      var overlay = document.getElementById('search-overlay');
      if (overlay && overlay.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  });

  // ── Init au chargement ────────────────────────────────────────────────────
  function init() {
    injectSearchOverlay();
    bindToggleButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
