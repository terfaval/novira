import fs from "fs"
import path from "path"
import { parseHtmlToCanonical } from "../src"

const fixtures = [
  "Babits Mihály_A gólyakalifa.html",
  "Krúdy Gyula_A vörös postakocsi.html",
  "Mikszáth Kálmán_A jó palócok.html",
  "Mikszáth Kálmán_Szent Péter esernyője.html",
  "Móricz Zsigmond_Árvácska.html"
]

describe("HTML Canonicalization", () => {
  for (const file of fixtures) {
    it(`parses ${file}`, () => {
      const html = fs.readFileSync(
        path.join(__dirname, "fixtures", file),
        "utf8"
      )

      const result = parseHtmlToCanonical(html)

      expect(result).toMatchSnapshot()
    })
  }
})
