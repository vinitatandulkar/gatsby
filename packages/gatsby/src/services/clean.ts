/* eslint-disable @typescript-eslint/camelcase */
import clean from "../commands/clean"
import { IProgram } from "../commands/types"
import { Reporter } from "../.."

export const unstable_clean = async (
  program: IProgram,
  reporter: Reporter
): Promise<void> =>
  clean({
    directory: program.directory,
    report: reporter,
  }).then()
