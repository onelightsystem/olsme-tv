# Security and Dependency Plan (Branch 295.10, Oct 3, 2025)

## IPFS Vulnerabilities
- **Issue**: `ipfs-http-client@60.0.0` has vulnerabilities in `nanoid` (moderate) and `parse-duration` (high), and is deprecated in favor of Helia[](https://github.com/ipfs/js-ipfs/issues/4336).
- **Action**: Pinned to `ipfs-http-client@59.0.0` to avoid breaking changes. Plan migration to Helia by Oct 10, 2025 (Week 2).
- **Helia Migration Steps**:
  1. Install `@helia/core` (already in `package.json` as `0.0.0`).
  2. Update `src/lib/ipfs-client.ts` to use Helia.
  3. Test IPFS logging with `npm run dev`.
  4. Update Firestore `ipfs_logs` schema if needed.