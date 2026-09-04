var CATS = [
    { key: 'family',   name: "my family's music",
      blurb: 'three generations. my grandfather, my dad, and me.' },
    { key: 'dads',     name: "dad's records",
      blurb: 'the shelf i grew up next to.' },
    { key: 'vulf',     name: 'the vulf universe' },
    { key: 'michigan', name: 'michigan indies' },
    { key: 'crate',    name: 'crate digging' },
    { key: 'guitar',   name: 'guitar rock' },
    { key: 'songwriters', name: 'singer-songwriters' },
    { key: 'folk',     name: 'folk and americana' },
    { key: 'indie',    name: 'indie and everything else' },
    { key: 'jazz',     name: 'jazz, piano and ambient' },
    { key: 'holiday',  name: 'the holiday shelf' }
];

var BCATS = [
    { key: 'threads',  name: 'threads and online friends',
      blurb: 'musicians i met making music online.' },
    { key: 'vulf',     name: 'the vulf universe' },
    { key: 'michigan', name: 'michigan' },
    { key: 'denver',   name: 'denver and colorado' },
    { key: 'else',     name: 'everywhere else' }
];

var COPY = {
    vinyl: {
        subtitle: 'all the records on the shelf! denver, co.',
        intro: 'records i own. tap any cover for the pressing details.'
    },
    bandcamp: {
        subtitle: 'music i bought on bandcamp. straight from the artists.',
        intro: 'the artists i support here. tap one to see everything of theirs i own, and go hear it.'
    }
};

var SORTS = {
    vinyl: [
        ['artist', 'artist a to z'],
        ['added', 'recently added'],
        ['year-desc', 'year, newest'],
        ['year-asc', 'year, oldest'],
        ['runtime-asc', 'runtime, shortest'],
        ['runtime-desc', 'runtime, longest']
    ],
    bandcamp: [
        ['count', 'most releases'],
        ['artist', 'artist a to z'],
        ['added', 'recently added']
    ]
};

var RECORDS = [];
var BANDS = [];
var VIEW = [];
var CARDS = [];
var BANDCARDS = [];
var HEADS = {};
var BHEADS = {};
var SOURCE = 'vinyl';

var grid = document.getElementById('grid');
var statsEl = document.getElementById('stats');
var qEl = document.getElementById('q');
var sortEl = document.getElementById('sort');
var viewEl = document.getElementById('view');
var viewLabel = document.getElementById('viewLabel');
var emptyEl = document.getElementById('empty');
var subtitleEl = document.getElementById('subtitle');
var introEl = document.getElementById('intro');
var sheet = document.getElementById('sheet');

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hms(sec) {
    if (!sec) return null;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function bigDuration(totalSec) {
    var h = Math.floor(totalSec / 3600);
    var m = Math.round((totalSec % 3600) / 60);
    return h + 'h ' + m + 'm';
}

function matches(r, q) {
    if (!q) return true;
    var cat = (CATS.filter(function (c) { return c.key === r.category; })[0] || {}).name || '';
    var hay = [r.artist, r.title, r.label, r.catno, r.year, cat,
               (r.genres || []).join(' '), (r.styles || []).join(' '),
               r.format, r.formatDetail].join(' ').toLowerCase();
    return q.split(/\s+/).every(function (term) { return hay.indexOf(term) !== -1; });
}

function bandMatches(b, q) {
    if (!q) return true;
    return q.split(/\s+/).every(function (term) { return b.hay.indexOf(term) !== -1; });
}

function sorted(list, mode) {
    var out = list.slice();
    var byArtist = function (a, b) {
        var c = a.artist.toLowerCase().localeCompare(b.artist.toLowerCase());
        return c !== 0 ? c : (a.year || 0) - (b.year || 0);
    };

    var runtime = function (dir) {
        return function (a, b) {
            if (!a.runtime && !b.runtime) return byArtist(a, b);
            if (!a.runtime) return 1;
            if (!b.runtime) return -1;
            return dir * (a.runtime - b.runtime);
        };
    };
    if (mode === 'added')          out.sort(function (a, b) { return (b.added || '').localeCompare(a.added || '') || byArtist(a, b); });
    else if (mode === 'year-desc') out.sort(function (a, b) { return (b.year || 0) - (a.year || 0) || byArtist(a, b); });
    else if (mode === 'year-asc')  out.sort(function (a, b) { return (a.year || 0) - (b.year || 0) || byArtist(a, b); });
    else if (mode === 'runtime-asc')  out.sort(runtime(1));
    else if (mode === 'runtime-desc') out.sort(runtime(-1));
    else out.sort(byArtist);
    return out;
}

function sortedBands(list, mode) {
    var out = list.slice();
    var byName = function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); };
    if (mode === 'artist')     out.sort(byName);
    else if (mode === 'added') out.sort(function (a, b) { return (b.added || '').localeCompare(a.added || '') || byName(a, b); });
    else                       out.sort(function (a, b) { return b.count - a.count || byName(a, b); });
    return out;
}

function cardHTML(r) {
    var dur = hms(r.runtime);
    return '<span class="rec-art">' +
                '<img src="' + esc(r.art) + '" alt="' + esc(r.artist + ', ' + r.title) + '" loading="lazy">' +
                (dur ? '<span class="rec-dur">' + dur + '</span>' : '') +
            '</span>' +
            '<span class="rec-cap">' +
                '<span class="rec-artist">' + esc(r.artist) + '</span>' +
                '<span class="rec-title">' + esc(r.title) + '</span>' +
                (r.year ? '<span class="rec-year">' + r.year + '</span>' : '') +
            '</span>';
}

function bandCardHTML(b) {
    return '<span class="rec-art">' +
                '<img src="' + esc(b.art) + '" alt="' + esc(b.name) + '" loading="lazy">' +
            '</span>' +
            '<span class="rec-cap">' +
                '<span class="rec-artist">' + esc(b.name) + '</span>' +
                '<span class="rec-count">' + b.count + (b.count === 1 ? ' release' : ' releases') + '</span>' +
            '</span>';
}

function build() {
    grid.innerHTML = '';
    CATS.forEach(function (c) {
        var h = document.createElement('div');
        h.className = 'cat-head';
        h.innerHTML = '<div class="cat-name">' + esc(c.name) +
                      ' <span class="cat-count" data-count></span></div>' +
                      (c.blurb ? '<div class="cat-blurb">' + esc(c.blurb) + '</div>' : '');
        h.style.display = 'none';
        grid.appendChild(h);
        HEADS[c.key] = h;
    });
    BCATS.forEach(function (c) {
        var h = document.createElement('div');
        h.className = 'cat-head';
        h.innerHTML = '<div class="cat-name">' + esc(c.name) +
                      ' <span class="cat-count" data-count></span></div>' +
                      (c.blurb ? '<div class="cat-blurb">' + esc(c.blurb) + '</div>' : '');
        h.style.display = 'none';
        grid.appendChild(h);
        BHEADS[c.key] = h;
    });
    CARDS = RECORDS.filter(function (r) { return r.source === 'vinyl'; }).map(function (r) {
        var btn = document.createElement('button');
        btn.className = 'rec' + (r.mine ? ' mine' : '');
        btn.dataset.id = r.id;
        btn.innerHTML = cardHTML(r);
        grid.appendChild(btn);
        return { el: btn, rec: r };
    });
    BANDCARDS = BANDS.map(function (b) {
        var btn = document.createElement('button');
        btn.className = 'rec';
        btn.dataset.id = b.id;
        btn.style.display = 'none';
        btn.innerHTML = bandCardHTML(b);
        grid.appendChild(btn);
        return { el: btn, band: b };
    });
}

function render() {
    if (SOURCE === 'bandcamp') return renderBandcamp();

    BANDCARDS.forEach(function (c) { c.el.style.display = 'none'; });
    BCATS.forEach(function (c) { BHEADS[c.key].style.display = 'none'; });

    var q = qEl.value.trim().toLowerCase();
    var mode = viewEl.value;

    VIEW = sorted(RECORDS.filter(function (r) {
        return r.source === SOURCE && matches(r, q);
    }), sortEl.value);

    if (mode === 'category') {
        var rank = {};
        CATS.forEach(function (c, i) { rank[c.key] = i; });
        VIEW.sort(function (a, b) {
            return (rank[a.category] == null ? 99 : rank[a.category]) -
                   (rank[b.category] == null ? 99 : rank[b.category]);
        });
    }

    CATS.forEach(function (c) { HEADS[c.key].style.display = 'none'; });

    var ord = 0, pos = {}, counts = {};
    VIEW.forEach(function (r) { counts[r.category] = (counts[r.category] || 0) + 1; });
    var seen = {};
    VIEW.forEach(function (r) {
        if (mode === 'category' && !seen[r.category] && HEADS[r.category]) {
            seen[r.category] = 1;
            var h = HEADS[r.category];
            h.querySelector('[data-count]').textContent =
                counts[r.category] + (counts[r.category] === 1 ? ' record' : ' records');
            h.style.display = '';
            h.style.order = ord++;
        }
        pos[r.id] = ord++;
    });

    CARDS.forEach(function (c) {
        var o = pos[c.rec.id];
        if (o === undefined) {
            c.el.style.display = 'none';
        } else {
            c.el.style.display = '';
            c.el.style.order = o;
        }
    });

    emptyEl.style.display = VIEW.length ? 'none' : '';
    updateStats(q);
}

function renderBandcamp() {
    CARDS.forEach(function (c) { c.el.style.display = 'none'; });
    CATS.forEach(function (c) { HEADS[c.key].style.display = 'none'; });

    var q = qEl.value.trim().toLowerCase();
    var mode = viewEl.value;

    VIEW = sortedBands(BANDS.filter(function (b) { return bandMatches(b, q); }), sortEl.value);

    if (mode === 'category') {
        var rank = {};
        BCATS.forEach(function (c, i) { rank[c.key] = i; });
        VIEW.sort(function (a, b) {
            return (rank[a.category] == null ? 99 : rank[a.category]) -
                   (rank[b.category] == null ? 99 : rank[b.category]);
        });
    }

    BCATS.forEach(function (c) { BHEADS[c.key].style.display = 'none'; });

    var ord = 0, pos = {}, counts = {};
    VIEW.forEach(function (b) { counts[b.category] = (counts[b.category] || 0) + 1; });
    var seen = {};
    VIEW.forEach(function (b) {
        if (mode === 'category' && !seen[b.category] && BHEADS[b.category]) {
            seen[b.category] = 1;
            var h = BHEADS[b.category];
            h.querySelector('[data-count]').textContent =
                counts[b.category] + (counts[b.category] === 1 ? ' artist' : ' artists');
            h.style.display = '';
            h.style.order = ord++;
        }
        pos[b.id] = ord++;
    });

    BANDCARDS.forEach(function (c) {
        var o = pos[c.band.id];
        if (o === undefined) {
            c.el.style.display = 'none';
        } else {
            c.el.style.display = '';
            c.el.style.order = o;
        }
    });

    emptyEl.style.display = VIEW.length ? 'none' : '';

    var totalReleases = VIEW.reduce(function (s, b) { return s + b.count; }, 0);
    var poolArtists = BANDS.length;
    var bits = [];
    bits.push('<b>' + VIEW.length + '</b> artist' + (VIEW.length === 1 ? '' : 's'));
    if (q) bits.push('of ' + poolArtists);
    if (totalReleases) bits.push('<b>' + totalReleases + '</b> release' + (totalReleases === 1 ? '' : 's'));
    statsEl.innerHTML = bits.join(' &middot; ');
}

function updateStats(q) {
    var pool = RECORDS.filter(function (r) { return r.source === SOURCE; });
    var timed = VIEW.filter(function (r) { return r.runtime; });
    var total = timed.reduce(function (s, r) { return s + r.runtime; }, 0);
    var bits = [];
    bits.push('<b>' + VIEW.length + '</b> record' + (VIEW.length === 1 ? '' : 's'));
    if (q) bits.push('of ' + pool.length);
    if (total) bits.push('<b>' + bigDuration(total) + '</b> of music');
    statsEl.innerHTML = bits.join(' &middot; ');
}

var sheetIndex = -1;

function openSheet(i) {
    var r = VIEW[i];
    if (!r) return;
    sheetIndex = i;
    if (SOURCE === 'bandcamp') return openBandSheet(r, i);

    document.getElementById('sheetDisco').innerHTML = '';
    document.getElementById('sheetRows').style.display = '';

    var img = document.getElementById('sheetImg');
    img.src = r.art || '';
    img.alt = r.artist + ', ' + r.title;
    document.getElementById('sheetArtist').textContent = r.artist;
    document.getElementById('sheetTitle').textContent = r.title;

    var cat = CATS.filter(function (c) { return c.key === r.category; })[0];
    var tags = [];
    if (r.mine) tags.push('<span class="sheet-tag gold">my own record</span>');
    if (cat) tags.push('<span class="sheet-tag">' + esc(cat.name) + '</span>');
    tags = tags.concat((r.styles || []).map(function (s) {
        return '<span class="sheet-tag blue">' + esc(s) + '</span>';
    }));
    document.getElementById('sheetTags').innerHTML = tags.join('');

    var rows = [];
    if (r.year) rows.push(['year', r.year]);
    if (r.label) rows.push(['label', r.label + (r.catno && r.catno !== 'none' ? ' (' + r.catno + ')' : '')]);
    if (r.format) rows.push(['format', r.formatDetail ? r.format + ', ' + r.formatDetail : r.format]);
    if (r.tracks) rows.push(['tracks', r.tracks]);
    if (r.runtime) rows.push(['runtime', hms(r.runtime)]);
    if (r.added) rows.push(['shelved', r.added]);
    document.getElementById('sheetRows').innerHTML = rows.map(function (kv) {
        return '<div><span>' + kv[0] + '</span>' + esc(kv[1]) + '</div>';
    }).join('');

    document.getElementById('sheetNote').textContent = r.runtimeNote ? r.runtimeNote + '.' : '';

    var links = [];
    if (r.discogs) links.push([r.discogs, 'view on discogs']);
    if (r.buy) links.push([r.buy, 'buy the vinyl or cd']);
    if (r.bandcamp) links.push([r.bandcamp, 'hear it on bandcamp']);
    document.getElementById('sheetLinks').innerHTML = links.map(function (l) {
        return '<a href="' + esc(l[0]) + '" target="_blank" rel="noopener">' + esc(l[1]) + '</a>';
    }).join('<span class="sep"> &middot; </span>');

    showSheet(i);
}

function openBandSheet(b, i) {
    document.getElementById('sheetRows').style.display = 'none';
    document.getElementById('sheetTags').innerHTML = '';
    document.getElementById('sheetNote').textContent = '';

    var img = document.getElementById('sheetImg');
    img.src = b.art || '';
    img.alt = b.name;
    document.getElementById('sheetArtist').textContent = b.name;
    document.getElementById('sheetTitle').textContent =
        b.count + (b.count === 1 ? ' release' : ' releases') + ' in my collection';

    var rel = b.releases.map(function (x) {
        var t = x.tracks ? '<span class="disco-tracks">' + x.tracks + (x.tracks === 1 ? ' track' : ' tracks') + '</span>' : '';
        var why = x.why ? '<span class="disco-why">' + esc(x.why) + '</span>' : '';
        return '<li>' +
                    '<a href="' + esc(x.bandcamp) + '" target="_blank" rel="noopener">' +
                        '<img class="disco-thumb" src="' + esc(x.art) + '" alt="" loading="lazy">' +
                    '</a>' +
                    '<span class="disco-info">' +
                        '<a class="disco-title" href="' + esc(x.bandcamp) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a>' +
                        t + why +
                    '</span>' +
               '</li>';
    }).join('');
    document.getElementById('sheetDisco').innerHTML =
        '<div class="disco-head">discography</div><ul>' + rel + '</ul>';

    document.getElementById('sheetLinks').innerHTML =
        '<a href="' + esc(b.url) + '" target="_blank" rel="noopener">visit ' + esc(b.name) + ' on bandcamp</a>';

    showSheet(i);
}

function showSheet(i) {
    document.getElementById('sheetPrev').disabled = (i <= 0);
    document.getElementById('sheetNext').disabled = (i >= VIEW.length - 1);
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
    sheet.scrollTop = 0;
    document.getElementById('sheetClose').focus({ preventScroll: true });
    sheet.scrollTop = 0;
}

function closeSheet() {
    sheet.classList.remove('open');
    document.body.style.overflow = '';
    if (sheetIndex >= 0 && VIEW[sheetIndex]) {
        var btn = grid.querySelector('[data-id="' + VIEW[sheetIndex].id + '"]');
        if (btn) btn.focus();
    }
    sheetIndex = -1;
}

grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.rec');
    if (!btn) return;
    var id = btn.dataset.id;
    var i = VIEW.findIndex(function (r) { return String(r.id) === id; });
    if (i !== -1) openSheet(i);
});
document.getElementById('sheetClose').addEventListener('click', closeSheet);
document.getElementById('sheetPrev').addEventListener('click', function () { openSheet(sheetIndex - 1); });
document.getElementById('sheetNext').addEventListener('click', function () { openSheet(sheetIndex + 1); });
sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', function (e) {
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'ArrowLeft' && sheetIndex > 0) openSheet(sheetIndex - 1);
    if (e.key === 'ArrowRight' && sheetIndex < VIEW.length - 1) openSheet(sheetIndex + 1);
});

document.getElementById('random').addEventListener('click', function () {
    if (!VIEW.length) return;
    var i = Math.floor(Math.random() * VIEW.length);
    if (VIEW.length > 1 && i === sheetIndex) i = (i + 1) % VIEW.length;
    openSheet(i);
});

qEl.addEventListener('input', render);
sortEl.addEventListener('change', render);
viewEl.addEventListener('change', render);

function applySource(source) {
    SOURCE = source;
    subtitleEl.textContent = COPY[source].subtitle;
    introEl.textContent = COPY[source].intro;

    sortEl.innerHTML = SORTS[source].map(function (o) {
        return '<option value="' + o[0] + '">' + o[1] + '</option>';
    }).join('');
    sortEl.value = SORTS[source][0][0];

    viewEl.value = 'category';

    render();
}

document.getElementById('tabs').addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t || t.disabled || t.dataset.source === SOURCE) return;
    [].forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('on', x === t); });
    applySource(t.dataset.source);
});

fetch('collection.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        RECORDS = data.records || [];

        var releasesByBand = {};
        RECORDS.forEach(function (r) {
            if (r.source !== 'bandcamp') return;
            (releasesByBand[r.bandId] = releasesByBand[r.bandId] || []).push(r);
        });
        BANDS = (data.bandcampArtists || []).map(function (b) {
            var rel = (releasesByBand[b.bandId] || []).slice().sort(function (a, c) {
                return (c.tracks || 0) - (a.tracks || 0) || (c.added || '').localeCompare(a.added || '');
            });
            var hay = (b.name + ' ' + rel.map(function (x) { return x.title; }).join(' ')).toLowerCase();
            return {
                id: 'band' + b.bandId,
                bandId: b.bandId,
                name: b.name,
                count: b.count,
                art: b.art,
                added: b.added,
                url: b.url,
                category: b.category,
                releases: rel,
                hay: hay
            };
        });

        build();
        render();
    })
    .catch(function (err) {
        grid.innerHTML = '<p class="empty">could not load the shelf. try a refresh.</p>';
        statsEl.textContent = '';
        console.error('collection:', err);
    });
