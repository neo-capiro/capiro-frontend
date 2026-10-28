/**
 * The ONE place the frontend resolves the canonical routines receiving boundary.
 *
 * Production resolves the installed published package, exactly as before. The consent observation opt-in, the facet and
 * the two renewal routes are not published yet and the installed `@capiro/meri-contracts@0.1.26` is immutable until the
 * new cohort, so qualification aliases THIS module to the source-stage receiver rather than importing a private path or
 * writing to any package, lockfile or vendor directory. Nothing else in the app imports the boundary directly.
 */
export {
  receiveRoutinesRequest,
  receiveRoutinesResponse,
  receiveRoutineManagementSessionRequest,
  routinesMetadata,
  routineManagementSessionPath,
} from "@capiro/meri-contracts/routines-application";
