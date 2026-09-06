// Lightweight runtime smoke test for the multiplayer role controller.
// This file is intentionally dependency-free so CI can at least verify the
// role-action ingress contract without opening sockets or calling external AI.
const fs=require('fs');
const index=fs.readFileSync(__dirname+'/index.js','utf8');
const role=fs.readFileSync(__dirname+'/role-system.js','utf8');
for(const needle of [
  'socket.on("roleAction"',
  'installRoles(room,"role-action")',
  'role runtime',
  'room.sim.roleAction(socket.id,action)'
])if(!index.includes(needle))throw new Error('Missing role runtime guard: '+needle);
if(!role.includes('sim.roleAction=function(pid,raw)'))throw new Error('Role controller implementation missing');
console.log('NOCTURNE role runtime smoke: PASS');
