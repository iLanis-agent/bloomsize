(function (root) {
  // Bloom filter sizing. Formulas from Wikipedia "Bloom filter": p ~ (1 - e^(-kn/m))^k, k = (m/n) ln 2, m = -n ln p / (ln 2)^2.
  var LN2 = Math.LN2;
  function fpApprox(m, n, k) { if (n <= 0) return 0; return Math.pow(1 - Math.exp(-k * n / m), k); }
  // Exact false positive probability with no independence assumption: after kn independent uniform bit picks,
  // P(i bits set) comes from an occupancy chain; a query (k fresh picks) hits only set bits with probability (i/m)^k.
  // Same value as the Stirling-number formula of Bose et al. that the Wikipedia page cites. Returns null when too big to compute.
  function fpExact(m, n, k) {
    if (n <= 0) return 0; var throws = n * k; if (m * throws > 4e7 || m > 20000) return null;
    var P = new Float64Array(Math.min(m, throws) + 2), Q, i, t; P[0] = 1;
    for (t = 0; t < throws; t++) {
      var top = Math.min(m, t + 1); Q = new Float64Array(P.length);
      for (i = 0; i <= Math.min(top, P.length - 1); i++) { var p = P[i]; if (!p) continue; Q[i] += p * (i / m); if (i + 1 < Q.length) Q[i + 1] += p * ((m - i) / m); }
      P = Q;
    }
    var e = 0; for (i = 0; i < P.length; i++) e += P[i] * Math.pow(i / m, k); return e;
  }
  function sizeFor(n, p, opts) {
    var m = Math.ceil(-n * Math.log(p) / (LN2 * LN2)), kReal = (m / n) * LN2, k = Math.max(1, Math.round(kReal));
    if (opts && opts.k) k = opts.k;
    return { n: n, targetP: p, m: m, bytes: Math.ceil(m / 8), bitsPerItem: m / n, kReal: kReal, k: k, pActual: fpApprox(m, n, k) };
  }
  function fromBits(m, n) { var kReal = (m / n) * LN2, k = Math.max(1, Math.round(kReal)); return { m: m, n: n, kReal: kReal, k: k, p: fpApprox(m, n, k), bitsPerItem: m / n }; }
  // largest n whose approximate false positive rate stays at or under p, for a filter of m bits and k hashes
  function capacity(m, k, p) { var lo = 0, hi = m * 4; if (fpApprox(m, 1, k) > p) return 0; while (hi - lo > 1) { var mid = Math.floor((lo + hi) / 2); if (fpApprox(m, mid, k) <= p) lo = mid; else hi = mid; } return lo; }
  function overfill(m, k, n, factors) { return factors.map(function (f) { var nn = Math.round(n * f); return { factor: f, n: nn, p: fpApprox(m, nn, k) }; }); }
  // memory for storing the items themselves (no overhead) versus the filter
  function versusRaw(n, itemBytes, filterBytes) { var raw = n * itemBytes; return { rawBytes: raw, ratio: raw / filterBytes }; }
  // deterministic simulation: a real bit array, double hashing h1 + i*h2 (Kirsch-Mitzenmacher), n inserted ids, `probes` absent ids tested
  function mix(x) { x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; }
  function simulate(m, k, n, probes, seed) {
    seed = seed | 0; var bits = new Uint8Array(m), i, j;
    function idx(id, j) { var h1 = mix(id ^ seed), h2 = mix(id + 0x9e3779b9 + seed) | 1; return ((h1 + Math.imul(j, h2)) >>> 0) % m; }
    for (i = 0; i < n; i++) for (j = 0; j < k; j++) bits[idx(i, j)] = 1;
    var set = 0; for (i = 0; i < m; i++) set += bits[i];
    var hits = 0; for (i = 0; i < probes; i++) { var id = n + 1000003 + i, all = true; for (j = 0; j < k; j++) if (!bits[idx(id, j)]) { all = false; break; } if (all) hits++; }
    var members = 0; for (i = 0; i < Math.min(n, 2000); i++) { var ok = true; for (j = 0; j < k; j++) if (!bits[idx(i, j)]) { ok = false; break; } if (ok) members++; }
    return { empirical: hits / probes, hits: hits, probes: probes, bitsSet: set, fill: set / m, membersFound: members, membersChecked: Math.min(n, 2000) };
  }
  var api = { fpApprox: fpApprox, fpExact: fpExact, sizeFor: sizeFor, fromBits: fromBits, capacity: capacity, overfill: overfill, versusRaw: versusRaw, simulate: simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BloomSize = api;
})(typeof window !== 'undefined' ? window : this);
