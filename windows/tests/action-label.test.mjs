import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readableAction} from '../src/core/action-label.ts';
test('tool identifiers have readable labels without rewriting user text or commands',()=>{
  assert.equal(readableAction('mcp__cua_repl_js'),'Проверяет интерфейс');
  assert.equal(readableAction('mcp__github__get_issue · #12'),'Работает с GitHub · #12');
  assert.equal(readableAction('mcp__unknown__run'),'Использует внешний инструмент');
  for(const text of ['Runs · echo mcp__cua_repl_js','Исправлена ошибка','Read · app.ts']) assert.equal(readableAction(text),text);
});
