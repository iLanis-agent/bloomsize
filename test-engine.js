var B = require('./engine.js'); var fails = 0, n = 0;
function eq(a, b, m) { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', m, JSON.stringify(a), JSON.stringify(b)); } }
function near(a, b, tol, m) { n++; if (!(Math.abs(a - b) <= tol)) { fails++; console.log('FAIL', m, a, b); } }
function ok(c, m) { n++; if (!c) { fails++; console.log('FAIL', m); } }
// Oracle 1: brute force. Enumerate every way kn insertions can land in m bits, then every query (k picks); exact probability by counting.
function brute(m, nn, k) {
  var throws = nn * k, total = Math.pow(m, throws), fp = 0, c, t, bits, q, i;
  for (c = 0; c < total; c++) {
    bits = 0; var x = c; for (t = 0; t < throws; t++) { bits |= 1 << (x % m); x = Math.floor(x / m); }
    var hit = 0; for (q = 0; q < Math.pow(m, k); q++) { var y = q, all = true; for (i = 0; i < k; i++) { if (!(bits & (1 << (y % m)))) { all = false; break; } y = Math.floor(y / m); } if (all) hit++; }
    fp += hit / Math.pow(m, k);
  }
  return fp / total;
}
var cases = [[4, 1, 1], [4, 2, 1], [5, 1, 2], [5, 2, 2], [6, 2, 2], [6, 1, 3], [5, 3, 1], [7, 2, 2], [6, 3, 2], [4, 3, 2], [8, 2, 2], [5, 2, 3], [6, 2, 3]];
cases.forEach(function (c) { near(B.fpExact(c[0], c[1], c[2]), brute(c[0], c[1], c[2]), 1e-12, 'exact vs brute force m=' + c[0] + ' n=' + c[1] + ' k=' + c[2]); });
// Oracle 2: the Stirling-number formula the Wikipedia page cites (Bose et al.): (1/m^(k(n+1))) * sum i^k * i! * C(m,i) * S(kn,i), in exact BigInt arithmetic
function stirling(m, nn, k) {
  var N = nn * k, S = [], i, j; for (i = 0; i <= N; i++) { S.push([]); for (j = 0; j <= m; j++) S[i].push(0n); } S[0][0] = 1n;
  for (i = 1; i <= N; i++) for (j = 1; j <= Math.min(i, m); j++) S[i][j] = BigInt(j) * S[i - 1][j] + S[i - 1][j - 1];
  function fact(x) { var r = 1n; for (var q = 2n; q <= BigInt(x); q++) r *= q; return r; }
  function C(a, b) { return fact(a) / (fact(b) * fact(a - b)); }
  var sum = 0n; for (i = 1; i <= m; i++) sum += BigInt(i) ** BigInt(k) * fact(i) * C(m, i) * S[N][i];
  var den = BigInt(m) ** BigInt(k * (nn + 1)); return Number(sum * 10n ** 18n / den) / 1e18;
}
[[10, 3, 2], [16, 5, 3], [20, 4, 4], [12, 6, 2], [30, 5, 5], [9, 9, 1], [25, 10, 3]].forEach(function (c) { near(B.fpExact(c[0], c[1], c[2]), stirling(c[0], c[1], c[2]), 1e-12, 'exact vs Stirling formula ' + c); });
// the approximation (independence assumed) understates the true rate for small filters
[[10, 3, 2], [16, 5, 3], [20, 4, 4], [30, 5, 5]].forEach(function (c) { ok(B.fpExact(c[0], c[1], c[2]) >= B.fpApprox(c[0], c[1], c[2]), 'approx below exact ' + c); });
near(B.fpExact(5000, 1000, 4) / B.fpApprox(5000, 1000, 4), 1, 0.002, 'large filters: approximation is close');
// Wikipedia anchors: m = -n ln p / (ln 2)^2, k = (m/n) ln 2, fewer than 10 bits per element for 1 percent
var s = B.sizeFor(1e6, 0.01); eq(s.m, Math.ceil(1e6 * Math.log(100) / (Math.LN2 * Math.LN2)), 'm formula'); ok(s.bitsPerItem < 10 && s.bitsPerItem > 9.5, '1 percent needs under 10 bits per item'); eq(s.k, 7, 'k = 7 for 1 percent'); near(s.kReal, s.bitsPerItem * Math.LN2, 1e-12, 'k formula');
near(s.pActual, 0.01, 0.0001, 'achieved p near target'); eq(s.bytes, Math.ceil(s.m / 8), 'bytes');
near(B.sizeFor(1e6, 0.001).bitsPerItem, 14.378, 0.001, '0.1 percent = 14.38 bits per item'); near(B.sizeFor(1e6, 1e-6).bitsPerItem, 28.755, 0.001, 'one in a million = 28.76 bits');
// with optimal real-valued k the rate is (1/2)^k
[[1000, 8000], [1000, 12000], [500, 6000]].forEach(function (c) { var kr = (c[1] / c[0]) * Math.LN2; near(Math.pow(1 - Math.exp(-kr * c[0] / c[1]), kr), Math.pow(0.5, kr), 1e-12, 'optimal k gives 2^-k'); });
// monotonic: more items or fewer bits raises p; k optimum near m/n ln 2
ok(B.fpApprox(1000, 100, 3) < B.fpApprox(1000, 200, 3), 'more items raises p'); ok(B.fpApprox(2000, 100, 3) < B.fpApprox(1000, 100, 3), 'more bits lowers p');
var best = 1, bk = 0; for (var k = 1; k <= 30; k++) { var pk = B.fpApprox(9585, 1000, k); if (pk < best) { best = pk; bk = k; } } eq(bk, 7, 'best integer k by scan for 9.585 bits per item');
// capacity inverts the formula
[[9585059, 7, 0.01], [100000, 5, 0.05], [8000, 4, 0.001]].forEach(function (c) { var cap = B.capacity(c[0], c[1], c[2]); ok(B.fpApprox(c[0], cap, c[1]) <= c[2] && B.fpApprox(c[0], cap + 1, c[1]) > c[2], 'capacity boundary ' + c); });
eq(B.capacity(100, 20, 1e-9), 2, 'tiny filter holds 2 items at 1e-9'); eq(B.capacity(100, 20, 1e-20), 0, 'and none at 1e-20');
// overfilling
var o = B.overfill(s.m, s.k, 1e6, [1, 2, 5, 10]); eq(o.map(function (x) { return x.n; }), [1e6, 2e6, 5e6, 1e7], 'overfill n'); ok(o[1].p > 0.1 && o[1].p < 0.25, 'twice the items is roughly 15 percent'); ok(o[3].p > 0.9, 'ten times the items is nearly always yes');
// Oracle 3: a real bit array with double hashing, simulated
[[100000, 5, 10000, 1], [95851, 7, 10000, 2], [47926, 4, 10000, 3], [200000, 10, 20000, 4], [80000, 3, 20000, 5], [120000, 8, 10000, 6]].forEach(function (c) {
  var r = B.simulate(c[0], c[1], c[2], 200000, c[3]), p = B.fpApprox(c[0], c[2], c[1]), sigma = Math.sqrt(p * (1 - p) / 200000);
  eq(r.membersFound, r.membersChecked, 'no false negatives ' + c); near(r.empirical, p, 4 * sigma + 0.03 * p, 'simulated vs formula ' + c);
  near(r.fill, 1 - Math.exp(-c[1] * c[2] / c[0]), 0.01, 'bit fill matches 1-e^(-kn/m) ' + c);
});
var a = B.simulate(50000, 4, 5000, 20000, 9), b = B.simulate(50000, 4, 5000, 20000, 9); eq(a, b, 'simulation is deterministic');
var f = B.fromBits(8000, 1000); eq(f.k, 6, 'from bits k'); near(f.p, B.fpApprox(8000, 1000, 6), 1e-15, 'from bits p'); near(B.versusRaw(1e6, 20, 1198133).ratio, 16.69, 0.01, 'raw vs filter');
console.log(n + ' checks, ' + fails + ' failures'); process.exit(fails ? 1 : 0);
