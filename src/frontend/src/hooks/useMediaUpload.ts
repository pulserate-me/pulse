import { loadConfig } from "@caffeineai/core-infrastructure";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { HttpAgent } from "@icp-sdk/core/agent";
import { useState } from "react";
import type { MediaType } from "../backend";
import { createMimeAwareStorageClient } from "../lib/storageClient";

export function useMediaUpload() {
  const { identity } = useInternetIdentity();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMedia = async (
    file: File,
  ): Promise<{ url: string; mediaType: MediaType }> => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const config = await loadConfig();
      const agent = new HttpAgent({
        identity: identity || undefined,
        host: config.backend_host,
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }

      // Use MIME-aware client so uploads are stored with the correct Content-Type
      const storageClient = createMimeAwareStorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      const rawBytes = new Uint8Array(await file.arrayBuffer());
      const mimeType = file.type || "application/octet-stream";

      // Upload with correct MIME type stored in blob metadata
      const { hash } = await storageClient.putFileWithMime(
        rawBytes,
        mimeType,
        (pct) => setUploadProgress(pct),
      );
      const url = await storageClient.getDirectURL(hash);

      let mediaType: MediaType;
      if (file.type.startsWith("image/")) {
        mediaType = { __kind__: "image", image: null };
      } else if (file.type.startsWith("video/")) {
        mediaType = { __kind__: "video", video: null };
      } else if (file.type.startsWith("audio/")) {
        mediaType = { __kind__: "audio", audio: null };
      } else {
        mediaType = { __kind__: "other", other: file.type };
      }

      return { url, mediaType };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadMedia, uploadProgress, isUploading };
}
