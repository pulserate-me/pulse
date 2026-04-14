/**
 * MIME-aware StorageClient wrapper.
 *
 * The upstream @caffeineai/object-storage StorageClient.putFile() hardcodes
 * `Content-Type: application/octet-stream` in its fileHeaders, so every upload
 * is stored with the wrong type regardless of what you pass.
 *
 * This module subclasses StorageClient and overrides putFile to inject the
 * correct Content-Type into the blob metadata headers before upload.
 */
import { StorageClient } from "@caffeineai/object-storage";
import type { HttpAgent } from "@icp-sdk/core/agent";

export class MimeAwareStorageClient extends StorageClient {
  async putFileWithMime(
    blobBytes: Uint8Array,
    mimeType: string,
    onProgress?: (percentage: number) => void,
  ): Promise<{ hash: string }> {
    // Access private methods via cast — the parent class exposes them at runtime
    const self = this as unknown as {
      processFileForUpload: (
        file: Blob,
        headers: Record<string, string>,
      ) => Promise<{
        chunks: Blob[];
        chunkHashes: unknown[];
        blobHashTree: { tree: { hash: unknown }; headers: string[] };
      }>;
      getCertificate: (hash: string) => Promise<Uint8Array>;
      storageGatewayClient: {
        uploadBlobTree: (
          blobHashTree: unknown,
          bucket: string,
          size: number,
          owner: string,
          projectId: string,
          cert: Uint8Array,
        ) => Promise<void>;
      };
      parallelUpload: (
        chunks: Blob[],
        chunkHashes: unknown[],
        blobRootHash: unknown,
        httpHeaders: Record<string, string>,
        onProgress?: (pct: number) => void,
      ) => Promise<void>;
      bucket: string;
      backendCanisterId: string;
      projectId: string;
    };

    const resolvedMime = mimeType || "application/octet-stream";

    const file = new Blob([new Uint8Array(blobBytes)], { type: resolvedMime });

    const fileHeaders: Record<string, string> = {
      "Content-Type": resolvedMime,
      "Content-Length": file.size.toString(),
    };

    const { chunks, chunkHashes, blobHashTree } =
      await self.processFileForUpload(file, fileHeaders);

    const blobRootHash = blobHashTree.tree.hash;
    const hashString = (
      blobRootHash as { toShaString: () => string }
    ).toShaString();

    const certificateBytes = await self.getCertificate(hashString);

    await self.storageGatewayClient.uploadBlobTree(
      blobHashTree,
      self.bucket,
      file.size,
      self.backendCanisterId,
      self.projectId,
      certificateBytes,
    );

    const httpHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    await self.parallelUpload(
      chunks,
      chunkHashes,
      blobRootHash,
      httpHeaders,
      onProgress,
    );

    return { hash: hashString };
  }
}

export function createMimeAwareStorageClient(
  bucket: string,
  storageGatewayUrl: string,
  backendCanisterId: string,
  projectId: string,
  agent: HttpAgent,
): MimeAwareStorageClient {
  return new MimeAwareStorageClient(
    bucket,
    storageGatewayUrl,
    backendCanisterId,
    projectId,
    agent,
  );
}
