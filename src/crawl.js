import axios from "axios";
import { load } from "cheerio";

async function crawlWordDirect(word, maxSuffix = 5) {
  const words = [];

  function buildUrls(w) {
    const base = `https://www.oxfordlearnersdictionaries.com/definition/english/${w}`;
    const urls = [];
    for (let i = 1; i <= maxSuffix; i++) {
      urls.push(`${base}_${i}`);
    }
    return urls;
  }

  const urls = buildUrls(word);
  for (let i = 0; i < urls.length; i++) {
    const link = urls[i];
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const { data: html } = await axios.get(link, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 30000,
        validateStatus: (s) => s < 500,
      });
      const $ = load(html || "");
      const foundWord = $("h1.headword").first().text() || null;
      if (!foundWord) {
        break;
      }

      const pos = $("span.pos").first().text() || "";
      const symbol =
        $("div.symbols span").first().attr("class")?.split("_")[1] || "";
      const phonetic =
        $("div.phons_br div.sound").first().attr("data-src-mp3") || "";
      const phonetic_text = $("div.phons_br span.phon").first().text() || "";
      const phonetic_am =
        $("div.phons_n_am div.sound").first().attr("data-src-mp3") || "";
      const phonetic_am_text =
        $("div.phons_n_am span.phon").first().text() || "";
      const variants = (() => {
        const v = $("h1.headword").first().siblings("div.variants").first();
        return v && v.length ? { text: v.text(), html: v.html() } : {};
      })();
      const grammar =
        $("h1.headword").first().siblings("span.grammar").first().text() || "";
      const labels =
        $("h1.headword").first().siblings("span.labels").first().text() || "";

      const senses = [];
      $("li.sense").each((_, el) => {
        const $el = $(el);
        const def = $el.find("span.def").first();
        if (!def || !def.text()) return;
        const s = {
          symbol:
            $el
              .find(":scope > div.symbols span")
              .first()
              .attr("class")
              ?.split("_")[1] || "",
          labels: $el.find(":scope > span.labels").first().text() || "",
          dis_g: $el.find(":scope > span.dis-g").first().text() || "",
          variants: (() => {
            const v = $el.find(":scope > div.variants").first();
            return v && v.length ? { text: v.text(), html: v.html() } : {};
          })(),
          grammar: $el.find(":scope > span.grammar").first().text() || "",
          cf: $el.find(":scope > span.cf").first().text() || "",
          definition: def.text(),
          synonyms: [],
          opposites: [],
          see_alsos: [],
          examples: [],
        };
        $el.find("span.xrefs").each((_, xr) => {
          const $xr = $(xr);
          const type = $xr.find("span.prefix").first().text();
          if (type === "synonym") {
            $xr.find("a").each((_, a) => s.synonyms.push($(a).text()));
          } else if (type === "opposite") {
            $xr.find("a").each((_, a) => s.opposites.push($(a).text()));
          } else if (type === "see also") {
            $xr.find("a").each((_, a) => s.see_alsos.push($(a).text()));
          }
        });
        $el.find("ul.examples li").each((_, ex) => {
          const $ex = $(ex);
          const cf = $ex.find("span.cf").first().text() || "";
          const x = $ex.find("span.x").first().text() || "";
          if (cf || x) s.examples.push({ cf, x });
        });
        senses.push(s);
      });

      const idioms = [];
      $("div.idioms span.idm-g").each((_, el) => {
        const $idm = $(el);
        const item = {
          word: $idm.find("span.idm").first().text() || "",
          labels:
            $idm.closest(".webtop").find("span.labels").first().text() || "",
          variants: (() => {
            const v = $idm.closest(".webtop").find("div.variants").first();
            return v && v.length ? { text: v.text(), html: v.html() } : "";
          })(),
          senses: [],
        };
        $idm
          .closest(".idm-g")
          .find("li.sense")
          .each((_, sEl) => {
            const $sEl = $(sEl);
            const def = $sEl.find("span.def").first();
            if (!def || !def.text()) return;
            const s = {
              symbol:
                $sEl
                  .find(".sensetop > div.symbols span")
                  .first()
                  .attr("class")
                  ?.split("_")[1] || "",
              labels: $sEl.find(".sensetop > span.labels").first().text() || "",
              dis_g: $sEl.find(".sensetop > span.dis-g").first().text() || "",
              variants: (() => {
                const v = $sEl.find(".sensetop > div.variants").first();
                return v && v.length ? { text: v.text(), html: v.html() } : {};
              })(),
              grammar:
                $sEl.find(".sensetop > span.grammar").first().text() || "",
              cf: $sEl.find(".sensetop > span.cf").first().text() || "",
              definition: def.text(),
              synonyms: [],
              opposites: [],
              see_alsos: [],
              examples: [],
            };
            $sEl.find("span.xrefs").each((_, xr) => {
              const $xr = $(xr);
              const type = $xr.find("span.prefix").first().text();
              if (type === "synonym") {
                $xr.find("a").each((_, a) => s.synonyms.push($(a).text()));
              } else if (type === "opposite") {
                $xr.find("a").each((_, a) => s.opposites.push($(a).text()));
              } else if (type === "see also") {
                $xr.find("a").each((_, a) => s.see_alsos.push($(a).text()));
              }
            });
            $sEl.find("ul.examples li").each((_, ex) => {
              const x = $(ex).find("span.x").first().text();
              if (x) s.examples.push(x);
            });
            item.senses.push(s);
          });
        idioms.push(item);
      });

      const phrasal_verbs = [];
      $(".phrasal_verb_links ul.pvrefs li").each((_, li) => {
        const a = $(li).find("a").first();
        if (a && a.length) {
          phrasal_verbs.push({ word: a.text(), link: a.attr("href") });
        }
      });

      words.push({
        word: foundWord,
        pos,
        symbol,
        phonetic,
        phonetic_text,
        phonetic_am,
        phonetic_am_text,
        variants,
        grammar,
        labels,
        senses,
        idioms,
        phrasal_verbs,
      });
    } catch (e) {
      throw new Error("crawl_request_error");
    }
  }
  return words;
}

export { crawlWordDirect };
