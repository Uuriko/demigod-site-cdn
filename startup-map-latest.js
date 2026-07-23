(function () {
  'use strict';
  var source = document.currentScript && document.currentScript.src;
  var dataUrl = source ? new URL('sf-startup-map.json', source).href : '';
  var state = {
    map: null, baseMap: null, root: null,
    communityStartups: Array.isArray(window.dgCommunityStartups) ? window.dgCommunityStartups : [],
    selected: -1, selectedVenue: '', center: null, radiusMiles: 3, view: 'split',
    layers: { startups: true, venues: true }, query: '', hiring: '',
  };

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

  function withCommunityStartups(map) {
    var names = new Set(map.companies.map(function (company) { return String(company.name || '').trim().toLowerCase(); }));
    var additions = state.communityStartups.map(function (row) {
      var name = String(row && row.name || '').trim().slice(0, 160);
      if (!name || names.has(name.toLowerCase())) return null;
      names.add(name.toLowerCase());
      return {
        id: String(row.id || ''), name: name, website: safeUrl(row.website),
        description: String(row.description || '').trim().slice(0, 1200),
        neighborhood: String(row.neighborhood || '').trim().slice(0, 120),
        hiring: ['yes', 'no', 'unknown'].includes(row.hiring) ? row.hiring : 'unknown',
        reviewedAt: row.reviewedAt || null, tags: ['community-reviewed'],
        locationPrecision: 'city', source: 'Community submission',
      };
    }).filter(Boolean);
    return Object.assign({}, map, {
      companies: map.companies.concat(additions),
      coverage: Object.assign({}, map.coverage, { communityCompanies: additions.length }),
    });
  }

  function addCommunityStartups(rows) {
    state.communityStartups = Array.isArray(rows) ? rows : [];
    if (state.root && state.baseMap) render(state.root, withCommunityStartups(state.baseMap));
  }

  function valid(map) {
    var b = map && map.bounds;
    return map && map.schema === 'demigod.sf-startup-map/3' &&
      Array.isArray(map.neighborhoods) && map.neighborhoods.length > 0 && Array.isArray(map.companies) && Array.isArray(map.venues) &&
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

  function milesBetween(a, b) {
    var toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad;
    var dLng = (b.lng - a.lng) * toRad;
    var lat1 = a.lat * toRad;
    var lat2 = b.lat * toRad;
    var h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function css() {
    if (document.getElementById('dg-startup-map-css')) return;
    var style = document.createElement('style');
    style.id = 'dg-startup-map-css';
    style.textContent =
      '#dg-page.dg-page-map .dg-page-card{max-width:min(76rem,96vw);padding:clamp(1rem,3vw,2rem)}' +
      '.dg-atlas-intro{max-width:72ch;color:#d6d3cc;line-height:1.6;margin:.1rem 0 1rem}' +
      '.dg-atlas-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.7rem;margin:1rem 0}' +
      '.dg-atlas-metric{border:1px solid rgba(166,255,203,.2);border-radius:12px;background:#07150f;padding:.8rem}' +
      '.dg-atlas-metric strong{display:block;color:#a6ffcb;font:700 clamp(1.25rem,3vw,1.8rem) Manrope,system-ui,sans-serif}' +
      '.dg-atlas-metric span{color:#a8a29e;font-size:.78rem;line-height:1.35}' +
      '.dg-atlas-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(16rem,.8fr);gap:1rem;align-items:start}' +
      '.dg-atlas-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;margin:.8rem 0}.dg-atlas-tools fieldset{display:flex;gap:.7rem;min-width:0;margin:0;border:0;padding:0}.dg-atlas-tools label{display:flex;align-items:center;gap:.35rem;min-height:44px;color:#e7e5e4}.dg-atlas-tools input{accent-color:#a6ffcb}.dg-atlas-radius{flex:1 1 15rem}.dg-atlas-radius input{width:min(16rem,48vw)}' +
      '.dg-atlas-reset{min-height:44px;border:1px solid rgba(166,255,203,.3);border-radius:9px;background:#07150f;color:#d6d3cc;padding:.5rem .8rem;cursor:pointer}' +
      '.dg-atlas-view{display:flex;border:1px solid rgba(166,255,203,.3);border-radius:9px;overflow:hidden}.dg-atlas-view button{min-height:44px;border:0;background:#07150f;color:#d6d3cc;padding:.5rem .8rem;cursor:pointer}.dg-atlas-view button[aria-pressed="true"]{background:#a6ffcb;color:#03140d;font-weight:700}' +
      '.dg-atlas-map-wrap,.dg-atlas-list-wrap{border:1px solid rgba(166,255,203,.18);border-radius:14px;background:#04100b;padding:.75rem}' +
      '.dg-atlas-map{display:block;width:100%;height:auto;max-height:66vh}.dg-atlas-map:focus-visible{outline:2px solid #a6ffcb;outline-offset:3px}' +
      '.dg-atlas-shape{fill:#0c2419;stroke:#38785a;stroke-width:1.2;vector-effect:non-scaling-stroke}' +
      '.dg-atlas-shape.has-count{fill:#123d29}.dg-atlas-shape.is-selected{fill:#2b6b4a;stroke:#a6ffcb;stroke-width:2.5}' +
      '.dg-atlas-marker{cursor:pointer}.dg-atlas-marker circle{fill:#a6ffcb;stroke:#04100b;stroke-width:2;vector-effect:non-scaling-stroke}' +
      '.dg-atlas-marker text{fill:#03140d;font:700 13px Manrope,system-ui,sans-serif;text-anchor:middle;dominant-baseline:central}' +
      '.dg-atlas-marker.is-selected circle{fill:#f4d03f;stroke:#fff}' +
      '.dg-atlas-marker:focus-visible{outline:none}.dg-atlas-marker:focus-visible circle{stroke:#a6ffcb;stroke-width:4}' +
      '.dg-atlas-venue{cursor:pointer}.dg-atlas-venue circle{fill:#f4d03f;stroke:#04100b;stroke-width:2;vector-effect:non-scaling-stroke}.dg-atlas-venue text{fill:#f4d03f;font:700 11px Manrope,system-ui,sans-serif}.dg-atlas-venue.is-selected circle{stroke:#fff;stroke-width:4}.dg-atlas-venue:focus-visible{outline:none}.dg-atlas-venue:focus-visible circle{stroke:#a6ffcb;stroke-width:4}.dg-atlas-search-area{fill:rgba(166,255,203,.08);stroke:#a6ffcb;stroke-width:2;stroke-dasharray:7 5;vector-effect:non-scaling-stroke;pointer-events:none}.dg-atlas-center{fill:#fff;stroke:#04100b;stroke-width:2;pointer-events:none}' +
      '.dg-atlas-list-wrap h2{font-size:.95rem!important;color:#f3f0e7!important;margin:.1rem 0 .65rem!important}' +
      '.dg-atlas-list{display:grid;gap:.4rem;max-height:34rem;overflow:auto;padding-right:.2rem}' +
      '.dg-atlas-neighborhood{display:flex;justify-content:space-between;align-items:center;gap:.75rem;width:100%;min-height:44px;padding:.55rem .7rem;border:1px solid rgba(166,255,203,.16);border-radius:9px;background:#07150f;color:#e7e5e4;text-align:left;cursor:pointer}' +
      '.dg-atlas-neighborhood b{color:#a6ffcb}.dg-atlas-neighborhood:hover,.dg-atlas-neighborhood.is-selected{border-color:#a6ffcb;background:#0d2b1d}' +
      '.dg-atlas-result{width:100%;min-height:44px;padding:.65rem .7rem;border:1px solid rgba(166,255,203,.16);border-radius:9px;background:#07150f;color:#d6d3cc;font:inherit;line-height:1.4;text-align:left;cursor:pointer}.dg-atlas-result strong{display:block;color:#e7e5e4}.dg-atlas-result small{display:block;color:#a8a29e}.dg-atlas-result:hover,.dg-atlas-result.is-selected{border-color:#f4d03f;background:#2b2410}.dg-atlas-empty{color:#a8a29e;padding:.7rem}' +
      '.dg-atlas-neighborhood:focus-visible,.dg-atlas-result:focus-visible,.dg-atlas-retry:focus-visible,.dg-atlas-reset:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-atlas-detail{min-height:3.5rem;margin:.8rem 0 0;padding:.75rem;border-left:3px solid #a6ffcb;background:rgba(166,255,203,.05);color:#d6d3cc;line-height:1.45}' +
      '.dg-atlas-companies{margin:1.1rem 0 0;border:1px solid rgba(166,255,203,.18);border-radius:14px;background:#04100b;padding:clamp(.75rem,2vw,1rem)}' +
      '.dg-atlas-companies>summary{display:flex;align-items:center;min-height:48px;color:#f3f0e7;cursor:pointer;list-style:none}.dg-atlas-companies>summary::-webkit-details-marker{display:none}.dg-atlas-companies>summary:after{content:"+";margin-left:auto;color:#a6ffcb;font-size:1.25rem}.dg-atlas-companies[open]>summary:after{content:"−"}.dg-atlas-companies>summary strong{display:block;font-size:1rem}.dg-atlas-companies>summary small{display:block;margin-top:.2rem;color:#a8a29e;font-size:.78rem}' +
      '.dg-atlas-companies-head{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:.7rem;margin-bottom:.7rem}' +
      '.dg-atlas-companies h2{margin:0!important;color:#f3f0e7!important;font-size:1rem!important}.dg-atlas-companies p{margin:.2rem 0 0;color:#a8a29e;font-size:.78rem}' +
      '.dg-atlas-search,.dg-atlas-hiring-filter{min-height:44px;width:min(100%,19rem);border:1px solid rgba(166,255,203,.3);border-radius:9px;background:#07150f;color:#f3f0e7;padding:.55rem .7rem;font:inherit}' +
      '.dg-atlas-search:focus-visible,.dg-atlas-hiring-filter:focus-visible,.dg-atlas-company summary:focus-visible,.dg-atlas-company a:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
      '.dg-atlas-company-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));align-items:start;gap:.55rem}' +
      '.dg-atlas-company{border:1px solid rgba(166,255,203,.13);border-radius:9px;background:#07150f;min-width:0;overflow:hidden}' +
      '.dg-atlas-company[open]{border-color:rgba(166,255,203,.5);background:#0a1d14}.dg-atlas-company summary{display:flex;align-items:center;justify-content:space-between;gap:.75rem;min-height:52px;padding:.65rem;cursor:pointer;list-style:none}.dg-atlas-company summary::-webkit-details-marker{display:none}' +
      '.dg-atlas-company summary:after{content:"+";flex:0 0 auto;color:#a6ffcb;font-size:1.15rem}.dg-atlas-company[open] summary:after{content:"−"}.dg-atlas-company-name{min-width:0}.dg-atlas-company strong{display:block;color:#e7e5e4;font-weight:700;overflow-wrap:anywhere}' +
      '.dg-atlas-hiring{display:inline-block;margin-top:.3rem;border-radius:999px;padding:.12rem .42rem;background:#20251f;color:#c6c3bb;font-size:.68rem}' +
      '.dg-atlas-company-detail{border-top:1px solid rgba(166,255,203,.12);padding:.7rem;color:#d6d3cc;font-size:.82rem;line-height:1.55}.dg-atlas-company-detail p{margin:0 0 .55rem}.dg-atlas-company-actions{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.7rem}.dg-atlas-company-actions a{display:inline-flex;align-items:center;min-height:44px;border:1px solid rgba(166,255,203,.32);border-radius:8px;padding:.45rem .65rem;color:#a6ffcb;text-decoration:none}.dg-atlas-company-actions a:first-child{background:#a6ffcb;color:#03140d;font-weight:700}' +
      '.dg-atlas-company-meta{color:#a8a29e;font-size:.74rem;line-height:1.45}' +
      '.dg-atlas-tag{display:inline-block;margin:.35rem .25rem 0 0;border:1px solid rgba(166,255,203,.32);border-radius:999px;padding:.12rem .4rem;color:#a6ffcb;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em}' +
      '.dg-atlas-meta{color:#a8a29e;font-size:.78rem;line-height:1.55;margin:.85rem 0 0}' +
      '.dg-atlas-error{padding:1rem;border:1px solid #9f4a4a;border-radius:12px;color:#f6caca}' +
      '.dg-atlas-retry{min-height:44px;margin-top:.7rem;border:1px solid #a6ffcb;border-radius:8px;background:transparent;color:#a6ffcb;padding:.45rem .8rem;cursor:pointer}' +
      '.dg-atlas-layout[data-view="list"]{grid-template-columns:1fr}.dg-atlas-layout[data-view="list"] .dg-atlas-map-wrap{display:none}.dg-atlas-layout[data-view="map"] .dg-atlas-list-wrap{display:none}' +
      '@media(max-width:760px){.dg-atlas-layout{grid-template-columns:1fr}.dg-atlas-map{max-height:none}.dg-atlas-list{max-height:22rem}.dg-atlas-search{width:100%}.dg-atlas-tools{align-items:flex-start}.dg-atlas-tools fieldset{flex-wrap:wrap}.dg-atlas-radius input{width:55vw}}' +
      '@media(forced-colors:active){.dg-atlas-map-wrap,.dg-atlas-list-wrap,.dg-atlas-metric,.dg-atlas-neighborhood{border:1px solid CanvasText;background:Canvas;color:CanvasText}.dg-atlas-shape{fill:Canvas;stroke:CanvasText}.dg-atlas-marker circle{fill:Highlight}.dg-atlas-marker text{fill:HighlightText}}';
    document.head.appendChild(style);
  }

  function select(index, root) {
    state.selected = index;
    state.selectedVenue = '';
    root.querySelectorAll('[data-atlas-venue-id]').forEach(function (element) { element.classList.remove('is-selected'); });
    root.querySelectorAll('[data-atlas-index]').forEach(function (element) {
      element.classList.toggle('is-selected', Number(element.getAttribute('data-atlas-index')) === index);
    });
    var row = state.map.neighborhoods[index];
    var detail = root.querySelector('.dg-atlas-detail');
    detail.innerHTML = row && row.count
      ? '<strong>' + esc(row.name) + '</strong><br>' + esc(row.count) + ' recent technology business location' + (row.count === 1 ? '' : 's') + ' in the open DataSF aggregate.'
      : '<strong>' + esc(row && row.name) + '</strong><br>No matching recent technology business locations in this open-data slice.';
  }

  function selectVenue(id, root) {
    var venue = state.map.venues.find(function (row) { return row.id === id; });
    if (!venue) return;
    state.selected = -1;
    state.selectedVenue = id;
    root.querySelectorAll('[data-atlas-index]').forEach(function (element) { element.classList.remove('is-selected'); });
    root.querySelectorAll('[data-atlas-venue-id]').forEach(function (element) {
      element.classList.toggle('is-selected', element.getAttribute('data-atlas-venue-id') === id);
    });
    root.querySelector('.dg-atlas-detail').innerHTML = '<strong>' + esc(venue.name) + '</strong><br>Venue lead · ' + esc(venue.area) + ' · availability not verified' + (venue.capacity ? ' · planning estimate up to ' + esc(venue.capacity) : '') + '<br>' + esc(venue.cost || 'Check cost') + (venue.notes ? ' · ' + esc(venue.notes) : '');
  }

  function render(root, map) {
    var active = root.contains(document.activeElement) ? document.activeElement : null;
    var directory = root.querySelector('.dg-atlas-companies');
    var directoryOpen = directory ? directory.open : null;
    var openCompanies = new Set(Array.from(root.querySelectorAll('.dg-atlas-company[open]')).map(function (node) { return node.getAttribute('data-company-key'); }));
    var focused = active && active.hasAttribute('data-atlas-venue-id')
      ? { attribute: 'data-atlas-venue-id', value: active.getAttribute('data-atlas-venue-id'), list: active.tagName === 'BUTTON' }
      : active && active.hasAttribute('data-atlas-index')
        ? { attribute: 'data-atlas-index', value: active.getAttribute('data-atlas-index'), list: active.tagName === 'BUTTON' }
        : null;
    var focusedControl = active && active.matches('.dg-atlas-search,.dg-atlas-hiring-filter')
      ? { selector: active.matches('.dg-atlas-search') ? '.dg-atlas-search' : '.dg-atlas-hiring-filter', start: active.selectionStart, end: active.selectionEnd }
      : null;
    state.map = map;
    var width = 720;
    var height = 560;
    var max = Math.max.apply(null, map.neighborhoods.map(function (row) { return Number(row.count) || 0; }).concat([1]));
    var shapes = map.neighborhoods.map(function (row, index) {
      return '<path class="dg-atlas-shape' + (row.count ? ' has-count' : '') + '" data-atlas-layer="startups" data-atlas-index="' + index + '" d="' + esc(pathFor(row.geometry, map.bounds, width, height)) + '"><title>' + esc(row.name) + '</title></path>';
    }).join('');
    var markers = map.neighborhoods.map(function (row, index) {
      if (!row.count) return '';
      var x = ((row.centroid.lng - map.bounds.west) / (map.bounds.east - map.bounds.west)) * width;
      var y = ((map.bounds.north - row.centroid.lat) / (map.bounds.north - map.bounds.south)) * height;
      var radius = 11 + Math.sqrt(row.count / max) * 18;
      return '<g class="dg-atlas-marker" data-atlas-layer="startups" data-atlas-index="' + index + '" role="button" tabindex="0" aria-label="Select ' + esc(row.name) + ', ' + row.count + ' recent technology business locations" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"><circle r="' + radius.toFixed(2) + '"></circle><text aria-hidden="true">' + esc(row.count) + '</text></g>';
    }).join('');
    var venueMarkers = map.venues.map(function (venue) {
      var x = ((venue.lng - map.bounds.west) / (map.bounds.east - map.bounds.west)) * width;
      var y = ((map.bounds.north - venue.lat) / (map.bounds.north - map.bounds.south)) * height;
      return '<g class="dg-atlas-venue" data-atlas-layer="venues" data-atlas-venue-id="' + esc(venue.id) + '" role="button" tabindex="0" aria-label="Select venue ' + esc(venue.name) + '" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"><circle r="7"></circle><text x="10" y="4">' + esc(venue.name) + '</text></g>';
    }).join('');
    var ordered = map.neighborhoods.map(function (row, index) { return { row: row, index: index }; })
      .sort(function (a, b) { return b.row.count - a.row.count || a.row.name.localeCompare(b.row.name); });
    var sources = map.sources.map(function (item) {
      var url = safeUrl(item.url);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.name) + '</a>' : esc(item.name);
    }).join(' · ');
    var companies = map.companies.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var companySearchText = companies.map(function (company) {
      return [company.name, company.description].concat(company.tags || []).join(' ').toLocaleLowerCase('en-US');
    });
    var companyHiring = companies.map(function (company) {
      return company.source === 'Community submission' ? company.hiring : 'unknown';
    });
    var view = ['split', 'map', 'list'].includes(state.view) ? state.view : 'split';
    var companyHtml = companies.map(function (company, index) {
      var companyKey = String(company.id || company.name);
      var website = safeUrl(company.website);
      var jobsUrl = safeUrl(company.jobsUrl);
      var sourceUrl = safeUrl(company.sourceUrl);
      var community = company.source === 'Community submission';
      var tags = (company.tags || []).map(function (tag) { return '<span class="dg-atlas-tag">' + esc(tag === 'yc' ? 'YC · independent evidence' : tag === 'community-reviewed' ? 'Reviewed submission' : 'Wikidata startup') + '</span>'; }).join('');
      var hiring = community
        ? { label: company.hiring === 'yes' ? 'Hiring reported' : company.hiring === 'no' ? 'Not hiring reported' : 'Hiring unknown', detail: 'Hiring status was reported by the submitter and has not been independently verified.' }
        : { label: 'Hiring not verified', detail: 'Hiring status has not been independently verified. Check the company site for current openings.' };
      var links = (website ? '<a href="' + esc(website) + '" target="_blank" rel="' + (community ? 'noopener noreferrer ugc nofollow' : 'noopener noreferrer') + '">Visit ' + (community ? 'submitted' : 'official') + ' website</a>' : '<span class="dg-atlas-company-meta">No verified official website is available in this record.</span>') +
        (jobsUrl ? '<a href="' + esc(jobsUrl) + '" target="_blank" rel="noopener noreferrer">Visit careers page</a>' : '') +
        (sourceUrl ? '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open-data evidence</a>' : '');
      return '<details class="dg-atlas-company" data-company-index="' + index + '" data-company-key="' + esc(companyKey) + '"' + (openCompanies.has(companyKey) ? ' open' : '') + '><summary><span class="dg-atlas-company-name"><strong>' + esc(company.name) + '</strong><span class="dg-atlas-hiring">' + hiring.label + '</span></span></summary>' +
        '<div class="dg-atlas-company-detail"><p>' + esc(company.description || 'A fuller open-data company description is not available yet.') + '</p>' +
        '<p><strong>Hiring:</strong> ' + esc(hiring.detail) + '</p><div class="dg-atlas-company-meta">' + (community ? 'Operator-reviewed community submission · SF neighborhood is descriptive only · city-level · not pinned' : 'Wikidata lists an SF headquarters · city-level only · current status not verified · not pinned') +
        (company.inceptionYear ? ' · founded ' + esc(company.inceptionYear) : '') + '</div>' + tags +
        '<div class="dg-atlas-company-actions">' + links + '</div></div></details>';
    }).join('');
    root.innerHTML =
      '<p class="dg-atlas-intro">A neighborhood-level view of recent technology business registrations in San Francisco. It shows aggregate activity—not offices, founders, homes, or individual company pins.</p>' +
      '<div class="dg-atlas-metrics"><div class="dg-atlas-metric"><strong>' + esc(map.coverage.total) + '</strong><span>qualifying active locations</span></div>' +
      '<div class="dg-atlas-metric"><strong>' + esc(map.coverage.mapped) + '</strong><span>with a public neighborhood classification</span></div>' +
      '<div class="dg-atlas-metric"><strong>' + esc(map.coverage.neighborhoods) + '</strong><span>neighborhoods with activity</span></div>' +
      '<div class="dg-atlas-metric"><strong>' + esc(companies.length) + '</strong><span>named company profiles</span></div>' +
      '<div class="dg-atlas-metric"><strong>' + esc(map.coverage.venueLeads) + '</strong><span>public venue leads</span></div></div>' +
      '<div class="dg-atlas-tools"><fieldset aria-label="Map layers"><label><input type="checkbox" data-atlas-toggle="startups"' + (state.layers.startups ? ' checked' : '') + '> Startups</label><label><input type="checkbox" data-atlas-toggle="venues"' + (state.layers.venues ? ' checked' : '') + '> Venues</label></fieldset>' +
      '<label class="dg-atlas-radius">Radius <input type="range" min="0.5" max="7" step="0.5" value="' + esc(state.radiusMiles) + '" aria-label="Search radius in miles"> <output>' + esc(state.radiusMiles) + ' mi</output></label>' +
      '<button type="button" class="dg-atlas-reset">Reset area</button>' +
      '<div class="dg-atlas-view" role="group" aria-label="View mode"><button type="button" data-atlas-view="split" aria-pressed="' + (view === 'split') + '">Map + list</button><button type="button" data-atlas-view="map" aria-pressed="' + (view === 'map') + '">Map</button><button type="button" data-atlas-view="list" aria-pressed="' + (view === 'list') + '">List</button></div></div>' +
      '<div class="dg-atlas-layout" data-view="' + view + '"><div class="dg-atlas-map-wrap"><svg class="dg-atlas-map" viewBox="0 0 ' + width + ' ' + height + '" role="group" tabindex="0" aria-label="San Francisco startup activity, venue leads, and adjustable search area. Use arrow keys to move the search center." preserveAspectRatio="xMidYMid meet"><g fill-rule="evenodd">' + shapes + '</g><g>' + markers + '</g><g>' + venueMarkers + '</g><ellipse class="dg-atlas-search-area"></ellipse><circle class="dg-atlas-center" r="4"></circle></svg>' +
      '<p class="dg-atlas-meta">Click the map or focus it and use arrow keys to move the search center; use the radius control to resize it. Startup markers are neighborhood centroids, never business addresses.</p></div>' +
      '<aside class="dg-atlas-list-wrap" aria-label="Results inside search area"><h2>Inside the search area</h2><p class="dg-atlas-result-status" role="status" aria-live="polite"></p><div class="dg-atlas-list"></div></aside></div><div class="dg-atlas-detail" role="status" aria-live="polite">Choose a startup neighborhood for its count.</div>' +
      '<details class="dg-atlas-companies" open><summary><span><strong>Company directory · ' + esc(companies.length) + ' profiles</strong><small>' + esc(map.coverage.ycIndependentlyEvidenced) + ' have independent CC0 YC evidence · ' + esc(map.coverage.communityCompanies || 0) + ' are reviewed community submissions. City-level only.</small></span></summary>' +
      '<div class="dg-atlas-companies-head"><input class="dg-atlas-search" type="search" aria-label="Search company directory" placeholder="Search company…" autocomplete="off" value="' + esc(state.query) + '"><select class="dg-atlas-hiring-filter" aria-label="Filter companies by hiring status"><option value="">All hiring statuses</option><option value="yes"' + (state.hiring === 'yes' ? ' selected' : '') + '>Hiring reported</option><option value="unknown"' + (state.hiring === 'unknown' ? ' selected' : '') + '>Hiring unknown</option><option value="no"' + (state.hiring === 'no' ? ' selected' : '') + '>Not hiring reported</option></select></div>' +
      '<div class="dg-atlas-company-list">' + companyHtml + '</div><p class="dg-atlas-company-status" role="status" aria-live="polite">' + esc(companies.length) + ' companies shown</p></details>' +
      '<p class="dg-atlas-meta"><strong>Definition:</strong> ' + esc(map.coverage.definition) + '<br><strong>Important:</strong> ' + esc(map.coverage.caveat) + '<br>Sources: ' + sources + '. Related directory: <a href="https://www.ycombinator.com/companies?regions=San%20Francisco%20Bay%20Area" target="_blank" rel="noopener noreferrer">browse YC companies on YC</a>.</p>';
    var center = state.center ? { lat: state.center.lat, lng: state.center.lng } : { lat: 37.7749, lng: -122.4194 };
    var radiusMiles = Number(state.radiusMiles) || 3;
    var svg = root.querySelector('.dg-atlas-map');
    var list = root.querySelector('.dg-atlas-list');
    var radiusInput = root.querySelector('.dg-atlas-radius input');
    if (directoryOpen === false || (directoryOpen == null && window.matchMedia('(max-width:760px)').matches)) root.querySelector('.dg-atlas-companies').removeAttribute('open');
    function xy(point) {
      return {
        x: ((point.lng - map.bounds.west) / (map.bounds.east - map.bounds.west)) * width,
        y: ((map.bounds.north - point.lat) / (map.bounds.north - map.bounds.south)) * height,
      };
    }
    function updateArea() {
      var layers = {};
      root.querySelectorAll('[data-atlas-toggle]').forEach(function (input) { layers[input.getAttribute('data-atlas-toggle')] = input.checked; });
      state.center = { lat: center.lat, lng: center.lng };
      state.radiusMiles = radiusMiles;
      state.layers = layers;
      root.querySelectorAll('[data-atlas-layer]').forEach(function (node) { node.hidden = !layers[node.getAttribute('data-atlas-layer')]; });
      root.querySelector('.dg-atlas-companies').hidden = !layers.startups;
      var point = xy(center);
      var ellipse = root.querySelector('.dg-atlas-search-area');
      ellipse.setAttribute('cx', point.x.toFixed(2));
      ellipse.setAttribute('cy', point.y.toFixed(2));
      ellipse.setAttribute('rx', (radiusMiles / (69.172 * Math.cos(center.lat * Math.PI / 180)) / (map.bounds.east - map.bounds.west) * width).toFixed(2));
      ellipse.setAttribute('ry', (radiusMiles / 69 / (map.bounds.north - map.bounds.south) * height).toFixed(2));
      root.querySelector('.dg-atlas-center').setAttribute('cx', point.x.toFixed(2));
      root.querySelector('.dg-atlas-center').setAttribute('cy', point.y.toFixed(2));
      var rows = [], startupCount = 0, venueCount = 0;
      if (layers.startups) map.neighborhoods.forEach(function (row, index) {
        var distance = milesBetween(center, row.centroid);
        if (row.count && distance <= radiusMiles) {
          startupCount++;
          rows.push({
            distance: distance,
            html: '<button type="button" class="dg-atlas-neighborhood" data-atlas-index="' + index + '"><span><strong>' + esc(row.name) + '</strong><small>' + esc(row.count) + ' recent technology business location' + (row.count === 1 ? '' : 's') + ' · centroid · ' + distance.toFixed(1) + ' mi</small></span><b>' + esc(row.count) + '</b></button>',
          });
        }
      });
      if (layers.venues) map.venues.forEach(function (venue) {
        var distance = milesBetween(center, venue);
        if (distance <= radiusMiles) {
          venueCount++;
          rows.push({
            distance: distance,
            html: '<button type="button" class="dg-atlas-result" data-atlas-venue-id="' + esc(venue.id) + '"><strong>' + esc(venue.name) + '</strong><small>Venue · ' + esc(venue.area) + ' · ' + distance.toFixed(1) + ' mi · availability not verified' + (venue.capacity ? ' · planning estimate up to ' + esc(venue.capacity) : '') + '</small>' +
              '<small>' + esc(venue.cost || 'Check cost') + (venue.notes ? ' · ' + esc(venue.notes) : '') + '</small></button>',
          });
        }
      });
      rows.sort(function (a, b) { return a.distance - b.distance; });
      list.innerHTML = rows.length ? rows.map(function (row) { return row.html; }).join('') : '<p class="dg-atlas-empty">No selected results in this area. Expand the radius or turn on another layer.</p>';
      var selected = list.querySelector('[data-atlas-index="' + state.selected + '"]');
      if (selected) selected.classList.add('is-selected');
      var selectedVenue = list.querySelector('[data-atlas-venue-id="' + state.selectedVenue + '"]');
      if (selectedVenue) selectedVenue.classList.add('is-selected');
      root.querySelector('.dg-atlas-result-status').textContent = rows.length + ' result' + (rows.length === 1 ? '' : 's') + ' within ' + radiusMiles + ' miles · ' + startupCount + ' startup area' + (startupCount === 1 ? '' : 's') + ' · ' + venueCount + ' venue' + (venueCount === 1 ? '' : 's');
      root.querySelector('.dg-atlas-radius output').textContent = radiusMiles + ' mi';
    }
    list.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-atlas-index]');
      if (button) {
        var index = Number(button.getAttribute('data-atlas-index'));
        center = { lat: map.neighborhoods[index].centroid.lat, lng: map.neighborhoods[index].centroid.lng };
        updateArea();
        select(index, root);
        var next = list.querySelector('[data-atlas-index="' + index + '"]');
        if (next) next.focus();
        return;
      }
      var venueButton = event.target.closest('button[data-atlas-venue-id]');
      if (venueButton) activateVenue(venueButton.getAttribute('data-atlas-venue-id'), false);
    });
    root.querySelector('.dg-atlas-tools').addEventListener('change', updateArea);
    radiusInput.addEventListener('input', function () { radiusMiles = Number(radiusInput.value); updateArea(); });
    root.querySelector('.dg-atlas-reset').addEventListener('click', function () {
      center = { lat: 37.7749, lng: -122.4194 };
      radiusMiles = 3;
      radiusInput.value = '3';
      state.selected = -1;
      state.selectedVenue = '';
      root.querySelectorAll('.is-selected').forEach(function (node) { node.classList.remove('is-selected'); });
      root.querySelector('.dg-atlas-detail').textContent = 'Choose a startup neighborhood for its count.';
      updateArea();
    });
    root.querySelector('.dg-atlas-view').addEventListener('click', function (event) {
      var button = event.target.closest('button[data-atlas-view]');
      if (!button) return;
      state.view = button.getAttribute('data-atlas-view');
      root.querySelector('.dg-atlas-layout').setAttribute('data-view', state.view);
      root.querySelectorAll('[data-atlas-view]').forEach(function (node) { node.setAttribute('aria-pressed', String(node === button)); });
    });
    function activateVenue(id, scroll) {
      var venue = map.venues.find(function (row) { return row.id === id; });
      if (!venue) return;
      center = { lat: venue.lat, lng: venue.lng };
      updateArea();
      selectVenue(id, root);
      var row = list.querySelector('[data-atlas-venue-id="' + id + '"]');
      if (row) {
        if (scroll) row.scrollIntoView({ block: 'nearest' });
        row.focus();
      }
    }
    function activateNeighborhood(index) {
      center = { lat: map.neighborhoods[index].centroid.lat, lng: map.neighborhoods[index].centroid.lng };
      updateArea();
      select(index, root);
      var row = list.querySelector('[data-atlas-index="' + index + '"]');
      if (row) {
        row.scrollIntoView({ block: 'nearest' });
        row.focus();
      }
    }
    svg.addEventListener('click', function (event) {
      var venueMarker = event.target.closest('[data-atlas-venue-id]');
      if (venueMarker) { activateVenue(venueMarker.getAttribute('data-atlas-venue-id'), true); return; }
      var marker = event.target.closest('[data-atlas-index]');
      if (marker) {
        activateNeighborhood(Number(marker.getAttribute('data-atlas-index')));
        return;
      }
      var matrix = svg.getScreenCTM();
      if (!matrix) return;
      var point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      center = {
        lat: map.bounds.north - (point.y / height) * (map.bounds.north - map.bounds.south),
        lng: map.bounds.west + (point.x / width) * (map.bounds.east - map.bounds.west),
      };
      updateArea();
    });
    svg.addEventListener('keydown', function (event) {
      var venueMarker = event.target.closest('[data-atlas-venue-id]');
      if (venueMarker && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); activateVenue(venueMarker.getAttribute('data-atlas-venue-id'), true); return;
      }
      var marker = event.target.closest('[data-atlas-index]');
      if (marker && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); activateNeighborhood(Number(marker.getAttribute('data-atlas-index'))); return;
      }
      var moves = { ArrowUp: [0.0025, 0], ArrowDown: [-0.0025, 0], ArrowLeft: [0, -0.0025], ArrowRight: [0, 0.0025] };
      var move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      center.lat = Math.max(map.bounds.south, Math.min(map.bounds.north, center.lat + move[0]));
      center.lng = Math.max(map.bounds.west, Math.min(map.bounds.east, center.lng + move[1]));
      updateArea();
    });
    function filterCompanies() {
      var rawQuery = root.querySelector('.dg-atlas-search').value.trim();
      var query = rawQuery.toLocaleLowerCase('en-US');
      var hiring = root.querySelector('.dg-atlas-hiring-filter').value;
      state.query = rawQuery;
      state.hiring = hiring;
      var shown = 0;
      root.querySelectorAll('.dg-atlas-company').forEach(function (node, index) {
        var visible = (!query || companySearchText[index].includes(query)) && (!hiring || companyHiring[index] === hiring);
        node.hidden = !visible;if(visible)shown++;
      });
      root.querySelector('.dg-atlas-company-status').textContent = shown
        ? shown + ' of ' + companies.length + ' companies shown'
        : hiring
          ? 'No companies with that hiring report. Hiring status is only available on reviewed community submissions.'
          : 'No companies match that search.';
    }
    root.querySelector('.dg-atlas-search').addEventListener('input', filterCompanies);
    root.querySelector('.dg-atlas-hiring-filter').addEventListener('change', filterCompanies);
    updateArea();
    filterCompanies();
    if (state.selected >= 0 && state.selected < map.neighborhoods.length) select(state.selected, root);
    else if (state.selectedVenue) selectVenue(state.selectedVenue, root);
    if (focused) {
      var replacement = Array.from(root.querySelectorAll('[' + focused.attribute + ']')).find(function (node) {
        return node.getAttribute(focused.attribute) === focused.value && (node.tagName === 'BUTTON') === focused.list;
      });
      if (replacement) replacement.focus();
    }
    if (focusedControl) {
      var control = root.querySelector(focusedControl.selector);
      control.focus();
      if (control.setSelectionRange && focusedControl.start != null) control.setSelectionRange(focusedControl.start, focusedControl.end);
    }
  }

  function mount(root) {
    if (!root) return;
    css();
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<p class="dg-atlas-intro">Loading the SF startup map…</p>';
    fetch(dataUrl, { cache: 'force-cache', credentials: 'omit' })
      .then(function (response) { if (!response.ok) throw new Error('Map data HTTP ' + response.status); return response.json(); })
      .then(function (map) { if (!valid(map)) throw new Error('Map data is invalid'); state.root = root; state.baseMap = map; render(root, withCommunityStartups(map)); })
      .catch(function () {
        root.innerHTML = '<div class="dg-atlas-error" role="alert">The map could not load.<br><button type="button" class="dg-atlas-retry">Try again</button></div>';
        root.querySelector('.dg-atlas-retry').addEventListener('click', function () { mount(root); });
      })
      .finally(function () { root.removeAttribute('aria-busy'); });
  }

  window.DemigodStartupMap = { mount: mount, addCommunityStartups: addCommunityStartups };
})();
