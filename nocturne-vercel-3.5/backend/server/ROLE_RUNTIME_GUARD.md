# NOCTURNE Role Runtime Guard

The multiplayer role controller is installed explicitly after a multiplayer `Sim` is created and again at role-action ingress if necessary. The server must never rely on a frontend deployment for role resolution.

Runtime diagnostics expected for a successful role action:

1. `roleAction received`
2. `role runtime` with the actor and installed role
3. `role actor`
4. `role immediate result`
5. `roleAction success`

If step 2 is missing, the running Render service is not executing the current backend build.
