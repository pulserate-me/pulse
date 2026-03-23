import { HttpAgent } from "@icp-sdk/core/agent";
import { useState } from "react";
import type { MediaType } from "../backend";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

// Map file MIME type to a canonical MIME type safe for mobile playback
function getCanonicalMimeType(file: File): string {
  const t = file.type;
  if (t.startsWith("video/")) {
    // video/quicktime is iPhone .MOV which is H.264 — serve as video/mp4
    if (t === "video/quicktime" || t === "video/x-m4v") return "video/mp4";
    return t || "video/mp4";
  }
  if (t.startsWith("audio/")) {
    if (t === "audio/mp4" || t === "audio/x-m4a") return "audio/mp4";
    if (t === "audio/ogg") return "audio/ogg";
    if (t === "audio/mpeg" || t === "audio/mp3") return "audio/mpeg";
    return t || "audio/webm";
  }
  if (t.startsWith("image/")) return t || "image/jpeg";
  return t || "application/octet-stream";
}

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
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      // Re-wrap the file bytes as a typed Blob so the stored content has the correct MIME type
      const mimeType = getCanonicalMimeType(file);
      const rawBytes = new Uint8Array(await file.arrayBuffer());
      // Embed MIME type by creating a new Blob with the canonical type and converting back to bytes
      const typedBlob = new Blob([rawBytes], { type: mimeType });
      const bytes = new Uint8Array(await typedBlob.arrayBuffer());

      const { hash } = await storageClient.putFile(
        bytes,
        (pct) => setUploadProgress(pct),
        mimeType,
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
