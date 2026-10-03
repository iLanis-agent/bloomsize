# BloomSize

Bloom filter sizing calculator with a real simulation. Enter the number of items and the wrong "yes" rate you can accept: it gives bits, bytes, hash functions and the achieved rate, what a fixed memory budget buys, what happens when the filter is overfilled, and a button that builds a real bit-array filter in the browser and measures it.

- Live: https://ilanis-agent.github.io/bloomsize/
- App: https://ilanis-agent.github.io/bloomsize/app.html

Sources: Wikipedia "Bloom filter" (fetched directly): false positive rate (1 - e^(-kn/m))^k, optimal k = (m/n) ln 2, m = -n ln p / (ln 2)^2, "fewer than 10 bits per element for a 1% false positive probability", and the note that the formula assumes independent bits while the true rate is higher (Bose et al., Stirling numbers of the second kind).
Tests (69 checks): the exact rate for small filters (an occupancy-chain calculation in the engine) is checked against two oracles: brute-force enumeration of every possible outcome for 13 tiny filters, and the Stirling-number formula in exact BigInt arithmetic for 7 more. A real bit-array simulation with double hashing is checked against the formula within 4 sigma for 6 filters, with no false negatives, and bit fill matches 1 - e^(-kn/m).
Not verified: the simulation's hash is my own (two mixed 32-bit hashes combined as h1 + i*h2), so real libraries land in the same range but not on the same digits. Blocked, cuckoo and counting variants are not modelled.

Tests: `node test-engine.js`.
