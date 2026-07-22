(function () {
  'use strict';
  var source = document.currentScript && document.currentScript.src;
  var dataUrl = source ? new URL('sf-startup-map.json', source).href : '';
  var state = { map: null, selected: -1 };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeUrl(value) {
    try {
      var url = new URL(String(value || ''));
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function valid(map) {
    var b = map && map.bounds;
    return map && map.schema === 'demigod.sf-startup-map/1' &&
      Array.isArray(map.neighborhoods) && map.neighborhoods.length > 0 &&
      map.coverage && ['west', 'south', 'east', 'north'].every(function (key) {
        return b && Number.isFinite(Number(b[key]));
      });
  }

  function pathFor(geometry, bounds, width, height) {
    function point(coordinate) {
      var lng = Number(coordinate && coordinate[0]);
      var lat = Number(coordinate && coordinate[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      return [
        ((lng - bounds.west) / (bounds.east - bounds.west)) * width,
        ((bounds.north - lat) / (bounds.north - bounds.south)) * height,
      ];
    }
    function ring(coordinates) {
      var points = (Array.isArray(coordinates) ? coordinates : []).map(point).filter(Boolean);
      return points.length > 2 ? points.map(function (p, index) {
        return (index ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2);
      }).join('') + 'Z' : '';
    }
    function polygon(coordinates) {
      return (Array.isArray(coordinates) ? coordinates : []).map(ring).join('');
    }
    if (!geometry) return '';
    if (geometry.type === 'Polygon') return polygon(geometry.coordinates);
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).map(polygon).join('');
    return '';
  }

  function css() {
    if (document.getElementById('dg-startup-map-css')) return;
    var style = document.createElement('style');
    style.id = 'dg-startup-map-css';
    style.textContent =
      '#dg-page.dg-page-map .dg-page-card{max-width:min(76rem,96vw);padding:clamp(1rem,3vw,2rem)}' +
      '.dg-atlas-intro{max-width:72ch;color:#d6d3cc;line-height:1.6;margin:.1rem 0 1rem}' +
      '.dg-atlas-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;margin:1rem 0}' +
      '.dg-atlas-metric{border:1px solid rgba(166,255,203,.2);border-radius:12px;background:#07150f;padding:.8rem}' +
      '.dg-atlas-metric strong{display:block;color:#a6ffcb;font:700 clamp(1.25rem,3vw,1.8rem) Manrope,system-ui,sans-serif}' +
      '.dg-atlas-metric span{color:#a8a29e;font-size:.78rem;line-height:1.35}' +
      '.dg-atlas-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(16rem,.8fr);gap:1rem;align-items:start}' +
      '.dg-atlas-map-wrap,.dg-atlas-list-wrap{border:1px solid rgba(166,255,203,.18);border-radius:14px;background:#04100b;padding:.75rem}' +
      '.dg-atlas-map{display:block;width:100%;height:auto;max-height:66vh}' +
      '.dg-atlas-shape{fill:#0c2419;stroke:#38785a;stroke-width:1.2;vector-effect:non-scaling-stroke}' +
      '.dg-atlas-shape.has-count{fill:#123d29}.dg-atlas-shape.is-selected{fill:#2b6b4a;stroke:#a6ffcb;stroke-width:2.5}' +
      '.dg-atlas-marker circle{fill:#a6ffcb;stroke:#04100b;stroke-width:2;vector-effect:non-scaling-stroke}' +
      '.dg-atlas-marker text{fill:#03140d;font:700 13px Manrope,system-ui,sans-serif;text-anchor:middle;dominant-baseline:central}' +
      '.dg-atlas-marker.is-selected circle{fill:#f4d03f;stroke:#fff}' +
      '.dg-atlas-list-wrap h2{font-size:.95rem!important;color:#f3f0e7!important;margin:.1rem 0 .65rem!important}' +
      '.dg-atlas-list{display:grid;gap:.4rem;max-height:34rem;overflow:auto;padding-right:.2rem}' +
      '.dg-atlas-neighborhood{display:flex;justify-content:space-between;align-items:center;gap:.75rem;width:100%;min-height:44px;padding:.55rem .7rem;border:1px solid rgba(166,255,203,.16);border-radius:9px;background:#07150f;color:#e7e5e4;text-align:left;cursor:pointer}' +
      '.dg-atlas-neighborhood b{color:#a6ffcb}.dg-atlas-neighborhood:hover,.dg-atlas-neighborhood.is-selected{border-color:#a6ffcb;background:#0d2b1d}' +
      '.dg-atlas-neighborhood:focus-visible,.dg-atlas-retry:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-atlas-detail{min-height:3.5rem;margin:.8rem 0 0;padding:.75rem;border-left:3px solid #a6ffcb;background:rgba(166,255,203,.05);color:#d6d3cc;line-height:1.45}' +
      '.dg-atlas-meta{color:#a8a29e;font-size:.78rem;line-height:1.55;margin:.85rem 0 0}' +
      '.dg-atlas-error{padding:1rem;border:1px solid #9f4a4a;border-radius:12px;color:#f6caca}' +
      '.dg-atlas-retry{min-height:44px;margin-top:.7rem;border:1px solid #a6ffcb;border-radius:8px;background:transparent;color:#a6ffcb;padding:.45rem .8rem;cursor:pointer}' +
      '@media(max-width:760px){.dg-atlas-layout{grid-template-columns:1fr}.dg-atlas-metrics{grid-template-columns:1fr}.dg-atlas-map{max-height:none}.dg-atlas-list{max-height:22rem}}' +
      '@media(forced-colors:active){.dg-atlas-map-wrap,.dg-atlas-list-wrap,.dg-atlas-metric,.dg-atlas-neighborhood{border:1px solid CanvasText;background:Canvas;color:CanvasText}.dg-atlas-shape{fill:Canvas;stroke:CanvasText}.dg-atlas-marker circle{fill:Highlight}.dg-atlas-marker text{fill:HighlightText}}';
    document.head.appendChild(style);
  }

  function select(index, root) {
    state.selected = index;
    root.querySelectorAll('[data-atlas-index]').forEach(function (element) {
      element.classList.toggle('is-selected', Number(element.getAttribute('data-atlas-index')) === index);
    });
    var row = state.map.neighborhoods[index];
    var detail = root.querySelector('.dg-atlas-detail');
    detail.innerHTML = row && row.count
      ? '<strong>' + esc(row.name) + '</strong><br>' + esc(row.count) + ' recent technology business location' + (row.count === 1 ? '' : 's') + ' in the open DataSF aggregate.'
      : '<strong>' + esc(row && row.name) + '</strong><br>No matching recent technology business locations in this open-data slice.';
  }

  function render(root, map) {
    state.map = map;
    var width = 720;
    var height = 560;
    var max = Math.max.apply(null, map.neighborhoods.map(function (row) { return Number(row.count) || 0; }).concat([1]));
    var shapes = map.neighborhoods.map(function (row, index) {
      return '<path class="dg-atlas-shape' + (row.count ? ' has-count' : '') + '" data-atlas-index="' + index + '" d="' + esc(pathFor(row.geometry, map.bounds, width, height)) + '"><title>' + esc(row.name) + '</title></path>';
    }).join('');
    var markers = map.neighborhoods.map(function (row, index) {
      if (!row.count) return '';
      var x = ((row.centroid.lng - map.bounds.west) / (map.bounds.east - map.bounds.west)) * width;
      var y = ((map.bounds.north - row.centroid.lat) / (map.bounds.north - map.bounds.south)) * height;
      var radius = 11 + Math.sqrt(row.count / max) * 18;
      return '<g class="dg-atlas-marker" data-atlas-index="' + index + '" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"><circle r="' + radius.toFixed(2) + '"></circle><text>' + esc(row.count) + '</text></g>';
    }).join('');
    var ordered = map.neighborhoods.map(function (row, index) { return { row: row, index: index }; })
      .sort(function (a, b) { return b.row.count - a.row.count || a.row.name.localeCompare(b.row.name); });
    var sources = map.sources.map(function (item) {
      var url = safeUrl(item.url);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.name) + '</a>' : esc(item.name);
    }).join(' · ');
    root.innerHTML =
      '<p class="dg-atlas-intro">A neighborhood-level view of recent technology business registrations in San Francisco. It shows aggregate activity—not offices, founders, homes, or individual company pins.</p>' +
      '<div class="dg-atlas-metrics"><div class="dg-atlas-metric"><strong>' + esc(map.coverage.total) + '</strong><span>qualifying active locations</span></div>' +
      '<div class="dg-atlas-metric"><strong>' + esc(map.coverage.mapped) + '</strong><span>with a public neighborhood classification</span></div>' +
      '<div class="dg-atlas-metric"><strong>' + esc(map.coverage.neighborhoods) + '</strong><span>neighborhoods with activity</span></div></div>' +
      '<div class="dg-atlas-layout"><div class="dg-atlas-map-wrap"><svg class="dg-atlas-map" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"><g fill-rule="evenodd">' + shapes + '</g><g>' + markers + '</g></svg>' +
      '<p class="dg-atlas-meta">Marker centers are neighborhood centroids, never business addresses.</p></div>' +
      '<aside class="dg-atlas-list-wrap" aria-label="Neighborhood startup activity"><h2>Neighborhoods</h2><div class="dg-atlas-list">' +
      ordered.map(function (item) { return '<button type="button" class="dg-atlas-neighborhood" data-atlas-index="' + item.index + '"><span>' + esc(item.row.name) + '</span><b>' + esc(item.row.count) + '</b></button>'; }).join('') +
      '</div></aside></div><div class="dg-atlas-detail" role="status" aria-live="polite">Choose a neighborhood for its count.</div>' +
      '<p class="dg-atlas-meta"><strong>Definition:</strong> ' + esc(map.coverage.definition) + '<br><strong>Important:</strong> ' + esc(map.coverage.caveat) + '<br>Sources: ' + sources + '. Related directory: <a href="https://www.ycombinator.com/companies?regions=San%20Francisco%20Bay%20Area" target="_blank" rel="noopener noreferrer">browse YC companies on YC</a>.</p>';
    root.querySelector('.dg-atlas-list').addEventListener('click', function (event) {
      var button = event.target.closest('button[data-atlas-index]');
      if (button) select(Number(button.getAttribute('data-atlas-index')), root);
    });
  }

  function mount(root) {
    if (!root) return;
    css();
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<p class="dg-atlas-intro">Loading the SF startup map…</p>';
    fetch(dataUrl, { cache: 'force-cache', credentials: 'omit' })
      .then(function (response) { if (!response.ok) throw new Error('Map data HTTP ' + response.status); return response.json(); })
      .then(function (map) { if (!valid(map)) throw new Error('Map data is invalid'); render(root, map); })
      .catch(function () {
        root.innerHTML = '<div class="dg-atlas-error" role="alert">The map could not load.<br><button type="button" class="dg-atlas-retry">Try again</button></div>';
        root.querySelector('.dg-atlas-retry').addEventListener('click', function () { mount(root); });
      })
      .finally(function () { root.removeAttribute('aria-busy'); });
  }

  window.DemigodStartupMap = { mount: mount };
})();
