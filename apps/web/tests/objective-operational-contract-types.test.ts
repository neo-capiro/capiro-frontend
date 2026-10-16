import { expectTypeOf, it } from "vitest";
import type { useObjectiveOperational } from "../src/features/portfolio/objectives/operational/query";
import type {
  OperationalRead,
  OperationalReadRequest,
  OperationalSectionName,
} from "../src/shared/capiro/operations/objective-operational";

it("retains the scoped hook's concrete operational receiving types", () => {
  type Result = ReturnType<typeof useObjectiveOperational>;
  expectTypeOf<Result["value"]>().toEqualTypeOf<OperationalRead | undefined>();
  expectTypeOf<Result["request"]>().toEqualTypeOf<OperationalReadRequest>();
  expectTypeOf<Result["next"]>()
    .parameter(0)
    .toEqualTypeOf<OperationalSectionName>();
  expectTypeOf<Result["canNext"]>().returns.toEqualTypeOf<boolean>();
});
