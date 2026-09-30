// An exported DATABASE_URL beats --env-file, and the suite wipes tables, so refuse anything but a local test DB.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

let url;
try {
  url = new URL(process.env.DATABASE_URL);
} catch {
  url = null;
}

if (!url || !LOCAL_HOSTS.has(url.hostname) || !/test/i.test(url.pathname)) {
  console.error(`Refusing to run: DATABASE_URL must point at a local test database (host ${url?.hostname ?? '?'}, db ${url?.pathname ?? '?'}). Unset any exported DATABASE_URL.`);
  process.exit(1);
}
