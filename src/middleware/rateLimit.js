import { BlockList, isIPv4 } from 'node:net';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const MINUTE = 60 * 1000;

// ponytail: snapshot of https://www.cloudflare.com/ips/ (30 Sep 2026); refresh if Cloudflare adds ranges.
const cloudflare = new BlockList();
for (const cidr of [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32',
]) {
  const [network, prefix] = cidr.split('/');
  cloudflare.addSubnet(network, Number(prefix), isIPv4(network) ? 'ipv4' : 'ipv6');
}

const fromCloudflare = (ip) => {
  const plain = ip.replace(/^::ffff:/, '');
  return cloudflare.check(plain, isIPv4(plain) ? 'ipv4' : 'ipv6');
};

// CF-Connecting-IP is only trusted from Cloudflare's own edge; from anyone else it is a spoofable header that would hand out fresh budgets.
export const clientIp = (req) => {
  const forwarded = req.headers['cf-connecting-ip'];
  return forwarded && fromCloudflare(req.ip) ? forwarded : req.ip;
};

// ponytail: in-memory store, per process; move to a shared store if the API runs more than one instance.
const limiter = (windowMs, limit, message, options = {}) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message },
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  ...options,
});

export const loginLimiter = limiter(15 * MINUTE, 10, 'Too many login attempts, try again later', { skipSuccessfulRequests: true });

export const submissionLimiter = () => limiter(10 * MINUTE, 5, 'Too many submissions, try again later');
