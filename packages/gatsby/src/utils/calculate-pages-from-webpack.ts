import webpack from "webpack"
import { IPage } from "../redux/types"

export const calculatePagesFromWebpack = (
  stats: webpack.Stats,
  pages: IPage[],
  previousHashes: Map<string, string> = new Map()
): { chunkHashes: Map<string, string>; pages: string[] } => {
  const pagesToRun: string[] = []
  const chunkHashes = new Map()
  stats.compilation.chunks.forEach(chunk => {
    if (chunk.name && chunk.name.startsWith(`component---`)) {
      // new file needs rebuild
      if (
        !previousHashes.has(chunk.name) ||
        previousHashes.get(chunk.name) !== chunk.hash
      ) {
        pages.forEach(page => {
          if (page.componentChunkName === chunk.name) {
            pagesToRun.push(page.path)
          }
        })
      }

      chunkHashes.set(chunk.name, chunk.hash)
    } else if (
      chunk.name &&
      (chunk.name.startsWith(`app`) || chunk.name.startsWith(`commons`))
    ) {
      if (
        !previousHashes.has(chunk.name) ||
        previousHashes.get(chunk.name) !== chunk.hash
      ) {
        pages.forEach(page => {
          pagesToRun.push(page.path)
        })
      }

      chunkHashes.set(chunk.name, chunk.hash)
    }
  })

  return {
    chunkHashes,
    pages: Array.from(new Set(pagesToRun)),
  }
}
