import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('all Windows webviews use identical environment options', () => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
  const args = source.match(/const BROWSER_ARGS: &str = "([^"]*)"/)[1];
  assert.equal(args, config.app.windows.find(window => window.label === 'island').additionalBrowserArgs,
    'WebView2 rejects additional windows with HRESULT 0x8007139F when environment options differ');
  assert.ok(!args.includes('msSmartScreenProtection'));
  for (const name of ['desktop.rs', 'notebook.rs']) {
    const windowSource = readFileSync(new URL(`../src-tauri/src/${name}`, import.meta.url), 'utf8');
    assert.match(windowSource, /additional_browser_args\(crate::BROWSER_ARGS\)/);
  }
});
