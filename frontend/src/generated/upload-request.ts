/* Generated from the Pydantic JSON Schema. Do not edit by hand. */

export type ContentType = "image/jpeg";
export type SizeBytes = number;

export interface UploadRequest {
  content_type: ContentType;
  size_bytes: SizeBytes;
}
