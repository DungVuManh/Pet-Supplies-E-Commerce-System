import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, createModelIndexes, disconnectDatabase } from "./config/database.js";
import { loadEnvironment } from "./config/env.js";
import { getFirebaseAuth } from "./config/firebase.js";

async function startServer() {
 const config = loadEnvironment();
 const server = createServer(createApp(config));
 let stopping = false;
 async function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  console.info("Shutting down");
  const deadline = setTimeout(() => {
   console.error("Shutdown timed out");
   server.closeAllConnections();
   process.exit(1);
  }, 10_000);
  try {
   if (server.listening) {
    await new Promise((resolve, reject) => {
     server.close((error) => (error ? reject(error) : resolve()));
    });
   }
   await disconnectDatabase();
  } catch {
   console.error("Shutdown failed");
   process.exitCode = 1;
  } finally {
   clearTimeout(deadline);
  }
 }
 process.once("SIGINT", () => void shutdown(0));
 process.once("SIGTERM", () => void shutdown(0));
 try {
  getFirebaseAuth(config);
  await connectDatabase(config.MONGODB_URI);
  await createModelIndexes();
  // A termination signal may arrive while the initial connection is pending.
  if (stopping) {
   await disconnectDatabase();
   return;
  }
  await new Promise((resolve, reject) => {
   server.once("error", reject);
   server.listen(config.PORT, () => {
    server.off("error", reject);
    resolve();
   });
  });
  server.on("error", () => {
   console.error("HTTP server error");
   void shutdown(1);
  });
  console.info(`Backend listening on port ${config.PORT}`);
 } catch {
  console.error(
   "Startup failed; check Firebase credentials, MongoDB availability, indexes and the configured port",
  );
  await shutdown(1);
 }
}
startServer().catch((error) => {
 // Only configuration errors originate here; their messages contain field names.
 console.error(error instanceof Error ? error.message : "Startup failed");
 process.exitCode = 1;
});
