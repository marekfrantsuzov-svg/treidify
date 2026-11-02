import { describe, expect, it } from "vitest";
import { cleanLine, cleanText } from "./sanitize";

describe("cleanText", () => {
  it("strips tags and decodes entities", () => {
    expect(cleanText("<p>Gold &amp; silver <b>rise</b> &#8212; dollar slips</p>")).toBe("Gold & silver rise — dollar slips");
  });
  it("removes scripts, styles and event handlers entirely", () => {
    const s = cleanText('<script>alert(1)</script><style>p{color:red}</style><img src=x onerror="alert(2)">Fed holds');
    expect(s).toBe("Fed holds");
  });
  it("removes Microsoft Word markup and leaked CSS", () => {
    const word = `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View></w:WordDocument></xml><![endif]-->Normal 0 false false false EN-US X-NONE X-NONE /* Style Definitions */ table.MsoNormalTable {mso-style-name:"Table Normal"; mso-tstyle-rowband-size:0; font-size:11.0pt;} <p class="MsoNormal" style="margin:0cm;font-family:Calibri">Gold prices climbed on Monday.</p>`;
    expect(cleanText(word)).toBe("Gold prices climbed on Monday.");
  });
  it("handles entity-encoded HTML", () => {
    expect(cleanText("&lt;p&gt;Yields fall&lt;/p&gt;&lt;p&gt;Gold up&lt;/p&gt;")).toBe("Yields fall\n\nGold up");
  });
  it("drops a tag cut off at the end", () => {
    expect(cleanText('The dollar weakened. <a href="https://exa')).toBe("The dollar weakened.");
  });
  it("keeps paragraphs", () => {
    expect(cleanText("<p>One.</p><p>Two.</p>")).toBe("One.\n\nTwo.");
  });
  it("cleanLine collapses to one line", () => {
    expect(cleanLine("<h1>Gold</h1><p>record</p>")).toBe("Gold record");
  });
  it("leaves ordinary text with braces-free colons alone", () => {
    expect(cleanText("Ratio: 2:1 in favour of buyers")).toBe("Ratio: 2:1 in favour of buyers");
  });
});
