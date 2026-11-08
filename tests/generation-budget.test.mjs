import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GENERATION_LIMITS,GENERATION_TIMEOUT} from '../modules/openai.mjs';
test('output tokens are provider-limited while cancellation/time and call guards remain',()=>{assert.equal(GENERATION_TIMEOUT,300000);assert.equal(GENERATION_LIMITS.seconds,300);assert.equal(GENERATION_LIMITS.outputTokens,null);assert.equal(GENERATION_LIMITS.calls,1)});
