/* Generated from the Pydantic JSON Schema. Do not edit by hand. */

export type ImageKey = string;
export type Lang = "en" | "hi";
export type PowersOn = ("yes" | "no" | "unsure") | null;

export interface ScanRequest {
  image_key: ImageKey;
  lang: Lang;
  powers_on?: PowersOn;
}
