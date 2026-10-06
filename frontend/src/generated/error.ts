/* Generated from the Pydantic JSON Schema. Do not edit by hand. */

export type ErrorCode = string;
export type MessageUserFriendly = string;
export type MessageDev = string | null;

export interface ErrorResponse {
  error_code: ErrorCode;
  message_user_friendly: MessageUserFriendly;
  message_dev: MessageDev;
}
