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

var RECORDS = [];
var VIEW = [];
var CARDS = [];
var HEADS = {};
var SOURCE = 'vinyl';

var grid = document.getElementById('grid');
var statsEl = document.getElementById('stats');
var qEl = document.getElementById('q');
var sortEl = document.getElementById('sort');
var viewEl = document.getElementById('view');
var emptyEl = document.getElementById('empty');
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
    CARDS = RECORDS.map(function (r) {
        var btn = document.createElement('button');
        btn.className = 'rec' + (r.mine ? ' mine' : '');
        btn.dataset.id = r.id;
        btn.innerHTML = cardHTML(r);
        grid.appendChild(btn);
        return { el: btn, rec: r };
    });
}

function render() {
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

    document.getElementById('sheetPrev').disabled = (i <= 0);
    document.getElementById('sheetNext').disabled = (i >= VIEW.length - 1);

    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('sheetClose').focus();
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
document.getElementById('tabs').addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t || t.disabled) return;
    SOURCE = t.dataset.source;
    [].forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('on', x === t); });
    render();
});

fetch('collection.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
        RECORDS = data.records || [];
        build();
        render();
    })
    .catch(function (err) {
        grid.innerHTML = '<p class="empty">could not load the shelf. try a refresh.</p>';
        statsEl.textContent = '';
        console.error('collection:', err);
    });
