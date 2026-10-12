// Preserve the existing public Quick log interface; shared actor checks have one owner.
export {
  currentClientWriter,
  assertClientWriter,
  ambiguousClientWrite,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
