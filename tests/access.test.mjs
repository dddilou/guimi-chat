import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsOrigin,isLocalAdmin} from '../access.mjs';
test('public HTTPS and local HTTP can submit, foreign origins cannot',()=>{
 assert.ok(acceptsOrigin({host:'guimi.example.com',origin:'https://guimi.example.com'}));
 assert.ok(acceptsOrigin({host:'127.0.0.1:3210',origin:'http://127.0.0.1:3210'}));
 assert.ok(acceptsOrigin({host:'internal:3210',origin:'https://guimi.example.com'},'https://guimi.example.com'));
 for(const origin of [undefined,'null','https://evil.example','https://guimi.example.com.evil.example'])assert.equal(acceptsOrigin({host:'guimi.example.com',origin}),false);
});
test('public visitors and reverse proxy requests cannot change the shared key',()=>{
 assert.ok(isLocalAdmin({headers:{host:'localhost:3210'},socket:{remoteAddress:'127.0.0.1'}}));
 assert.equal(isLocalAdmin({headers:{host:'guimi.example.com'},socket:{remoteAddress:'127.0.0.1'}}),false);
 assert.equal(isLocalAdmin({headers:{host:'localhost:3210'},socket:{remoteAddress:'192.168.1.3'}}),false);
});
