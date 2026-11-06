# Testing the HTTP API with Postman

These collections call the NestJS HTTP API. Postman does not connect to the attendance TCP service directly.

## Before importing

1. Start MySQL, apply the Prisma migration, and run the backend seed as described in the [backend README](../README.md).
2. Start both backend processes: `pnpm start:attendance:dev` and `pnpm start:dev` in separate terminals.
3. Use a **development database**. The domain collection creates a test employee and performs attendance writes. It deletes the test attendance and deactivates the employee at the end; the inactive employee row remains because the API has no employee deletion endpoint.
4. Import `Absensi_WFH_Auth.postman_collection.json` and `Absensi_WFH_Domain.postman_collection.json` into Postman. Set the `baseUrl` collection variable if the HTTP API is not at `http://localhost:3000`. Enter the seeded account's password in the `demoPassword` collection variable **locally for each collection**. The exported JSON intentionally contains no password, JWT, or private key.

## Run the end-to-end domain collection

Select local files in the `photo` form-data field before running these requests:

| Request | Select this bundled file | Collection variable with its SHA-256 base64url hash |
| --- | --- | --- |
| `Check-in dengan foto` | `fixtures/check-in.png` | `checkInPhotoSha256` |
| `Check-in kedua ditolak` | `fixtures/check-in.png` | `checkInPhotoSha256` |
| `Ganti foto hari ini` | `fixtures/replacement.png` | `replacementPhotoSha256` |
| `HRD tidak boleh ganti foto` | `fixtures/replacement.png` | `replacementPhotoSha256` |

Use the Postman desktop app or an agent that can access those local files. Do not manually set `Content-Type` for multipart requests; Postman must add the boundary. Run the collection **once, in folder order**, starting at `00 Kesiapan`. The `Login ADMIN` request generates a unique test employee code, email, and password for each run. Later requests reuse the IDs and JWTs captured by response tests. The newly created employee checks in, while HRD can only monitor the attendance. The final folder removes the attendance, logs out, and deactivates the employee.

The two bundled PNG files are one-pixel test fixtures. Their hashes are already included in the collection. If you select a different file, update the corresponding hash variable first. You can calculate it with Node.js:

```powershell
node -e "const fs=require('node:fs');const crypto=require('node:crypto');console.log(crypto.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('base64url'))" "C:\path\to\photo.png"
```

Paste the printed hash into `checkInPhotoSha256` or `replacementPhotoSha256`. The signature signs the **file bytes**, not the multipart envelope. A mismatched file/hash is rejected with `SIGNATURE_INVALID`.

## Run the authentication collection

Run `Absensi_WFH_Auth.postman_collection.json` in order to test ADMIN and EMPLOYEE login, `/me`, logout, and invalid credentials/signatures. It uses the two seeded accounts. This collection does not create employees or attendance. The login response tests capture JWTs; the logout tests discard the session token and test signing key.

## Request proof and local data

The collection-level pre-request script signs method, path plus query, timestamp, nonce, and SHA-256 body digest with P-256. JSON/bodyless requests use proof `v1`; photo requests use `v2`. The script lives in `auth-proof-prerequest.js` and is embedded into both JSON collections. For Postman testing only, the private JWK is stored in a local collection variable so consecutive requests can use the same key. The browser application uses a non-exportable key instead.

If a run stops midway, inspect `employeeId` and `attendanceId` in the local collection variables. Complete the cleanup requests on the same Asia/Jakarta business date when possible. Clear `adminToken`, `employeeToken`, `proofPrivateKey`, `proofPublicKey`, `testEmployeePassword`, and `demoPassword` after testing. Do not export the modified collection with these values.

To regenerate both JSON collections after changing the signature script or fixtures, run `node postman/generate-collections.mjs` from the backend repository root. Check proof compatibility with `pnpm test:postman:proof`. This smoke test verifies the generated signature code; it does not run Postman's Collection Runner or make HTTP requests.
