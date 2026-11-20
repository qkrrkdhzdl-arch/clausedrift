// Fast path for development: the same suite, without a browser.
// The browser run (tools/run_tests.py, or /tests.html) is the one that proves
// the page itself works; this only checks the libraries.
import '../docs/tests.js';
