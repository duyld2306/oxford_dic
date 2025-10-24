import axios from "axios";
import { load } from "cheerio";
import { ObjectId } from "mongodb";

async function crawlWordDirect(word, maxSuffix = 5) {
  const words = [];

  function buildUrls(w) {
    const slug = String(w).trim().replace(/\s+/g, "-").toLowerCase();
    const base = `https://www.oxfordlearnersdictionaries.com/definition/english/${slug}`;
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
        $("div.symbols")
          .filter((_, el) => $(el).siblings("h1.headword").length > 0) // có h1.headword là sibling
          .first() // lấy div.symbols đầu tiên thỏa điều kiện
          .find("span")
          .first()
          .attr("class")
          ?.split("_")[1] || "";
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
        $("h1.headword")
          .first()
          .siblings("span.labels")
          .filter((_, el) => $(el).closest(".variants").length === 0)
          .first()
          .text() || "";

      const senses = [];
      $("li.sense")
        .filter(
          (_, el) =>
            $(el).closest(".idioms").length === 0 &&
            $(el).closest(".collapse").length === 0 &&
            $(el).closest(".pv-g").length === 0
        )
        .each((_, el) => {
          const $el = $(el);
          const def = $el.find("span.def").first();
          if (!def || !def.text()) return;
          const s = {
            symbol:
              $el
                .find(
                  ".sensetop > div.symbols span, .sensetop ~ div.symbols span"
                )
                .first()
                .attr("class")
                ?.split("_")[1] || "",
            labels:
              $el
                .find(".sensetop > span.labels, .sensetop ~ span.labels")
                .filter((_, el) => $(el).closest(".variants").length === 0)
                .first()
                .text() || "",
            dis_g:
              $el
                .find(".sensetop > span.dis-g, .sensetop ~ span.dis-g")
                .first()
                .text() || "",
            variants: (() => {
              const v = $el
                .find(".sensetop > div.variants, .sensetop ~ div.variants")
                .first();
              return v && v.length ? { text: v.text(), html: v.html() } : {};
            })(),
            grammar:
              $el
                .find(".sensetop > span.grammar, .sensetop ~ span.grammar")
                .first()
                .text() || "",
            cf:
              $el
                .find(".sensetop > span.cf, .sensetop ~ span.cf")
                .first()
                .text() || "",
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
          $el
            .find("ul.examples li")
            .filter(
              (_, el) =>
                $(el).closest(".idioms").length === 0 &&
                $(el).closest(".collapse").length === 0
            )
            .each((_, ex) => {
              const $ex = $(ex);
              const cf = $ex.find("span.cf").first().text() || "";
              const labels =
                $ex
                  .find("span.labels")
                  .filter((_, el) => $(el).closest(".variants").length === 0)
                  .first()
                  .text() || "";
              const x = $ex.find("span.x").first().text() || "";
              if (cf || labels || x)
                s.examples.push({ cf, labels, en: x, vi: "" });
            });
          senses.push(s);
        });

      const phrasal_verb_senses = [];
      $("span.pv-g").each((_, el) => {
        const $pvs = $(el);
        const pv = $pvs.find("span.pv").first();

        // --- Lưu variants trước khi tách khỏi DOM ---
        const v = pv.find("div.variants").first();
        const variantsData =
          v && v.length ? { text: v.text().trim(), html: v.html().trim() } : {};

        // --- Gỡ bỏ variants khỏi pv (để không dính vào .text()) ---
        pv.find("div.variants").remove();

        // --- Lấy word ---
        let word = "";
        if (pv.find(".pvarr").length > 0) {
          // Có chứa .pvarr → thay thành ↔
          word = pv
            .html()
            .replace(/<span class="pvarr">([^<]*)<\/span>/g, " ↔ $1")
            .replace(/<[^>]+>/g, "") // bỏ thẻ HTML còn sót
            .trim();
        } else {
          word = pv.text().trim();
        }

        // --- Lấy labels ---
        const labels =
          $pvs
            .find(".webtop span.labels")
            .filter((_, el) => $(el).closest(".variants").length === 0)
            .first()
            .text()
            .trim() || "";

        // --- Kết quả cuối ---
        const item = {
          word,
          labels,
          variants: variantsData,
          senses: [],
        };
        $pvs
          .closest(".pv-g")
          .find("li.sense")
          .each((_, sEl) => {
            const $sEl = $(sEl);
            const def = $sEl.find("span.def").first();
            if (!def || !def.text()) return;
            const s = {
              symbol:
                $sEl
                  .find(
                    ".sensetop > div.symbols span, .sensetop ~ div.symbols span"
                  )
                  .first()
                  .attr("class")
                  ?.split("_")[1] || "",
              labels:
                $sEl
                  .find(".sensetop > span.labels, .sensetop ~ span.labels")
                  .filter((_, el) => $(el).closest(".variants").length === 0)
                  .first()
                  .text() || "",
              dis_g:
                $sEl
                  .find(".sensetop > span.dis-g, .sensetop ~ span.dis-g")
                  .first()
                  .text() || "",
              variants: (() => {
                const v = $sEl
                  .find(".sensetop > div.variants, .sensetop ~ div.variants")
                  .first();
                return v && v.length ? { text: v.text(), html: v.html() } : {};
              })(),
              grammar:
                $sEl
                  .find(".sensetop > span.grammar, .sensetop ~ span.grammar")
                  .first()
                  .text() || "",
              cf:
                $sEl
                  .find(".sensetop > span.cf, .sensetop ~ span.cf")
                  .first()
                  .text() || "",
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
            $sEl
              .find("ul.examples li")
              .filter((_, el) => $(el).closest(".collapse").length === 0)
              .each((_, ex) => {
                const x = $(ex).find("span.x").first().text();
                if (x) s.examples.push({ en: x, vi: "" });
              });
            item.senses.push(s);
          });
        phrasal_verb_senses.push(item);
      });

      const idioms = [];
      $("div.idioms span.idm-g").each((_, el) => {
        const $idm = $(el);
        const item = {
          word: $idm.find("span.idm").first().text() || "",
          labels:
            $idm
              .find(".webtop span.labels")
              .filter((_, el) => $(el).closest(".variants").length === 0)
              .first()
              .text() || "",
          variants: (() => {
            const v = $idm.find(".webtop div.variants").first();
            return v && v.length ? { text: v.text(), html: v.html() } : {};
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
                  .find(
                    ".sensetop > div.symbols span, .sensetop ~ div.symbols span"
                  )
                  .first()
                  .attr("class")
                  ?.split("_")[1] || "",
              labels:
                $sEl
                  .find(".sensetop > span.labels, .sensetop ~ span.labels")
                  .filter((_, el) => $(el).closest(".variants").length === 0)
                  .first()
                  .text() || "",
              dis_g:
                $sEl
                  .find(".sensetop > span.dis-g, .sensetop ~ span.dis-g")
                  .first()
                  .text() || "",
              variants: (() => {
                const v = $sEl
                  .find(".sensetop > div.variants, .sensetop ~ div.variants")
                  .first();
                return v && v.length ? { text: v.text(), html: v.html() } : {};
              })(),
              grammar:
                $sEl
                  .find(".sensetop > span.grammar, .sensetop ~ span.grammar")
                  .first()
                  .text() || "",
              cf:
                $sEl
                  .find(".sensetop > span.cf, .sensetop ~ span.cf")
                  .first()
                  .text() || "",
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
            $sEl
              .find("ul.examples li")
              .filter((_, el) => $(el).closest(".collapse").length === 0)
              .each((_, ex) => {
                const x = $(ex).find("span.x").first().text();
                if (x) s.examples.push({ en: x, vi: "" });
              });
            item.senses.push(s);
          });
        idioms.push(item);
      });

      const phrasal_verbs = [];
      $(".phrasal_verb_links ul.pvrefs li").each((_, li) => {
        const a = $(li).find("a").first();
        if (a && a.length) {
          phrasal_verbs.push(a.text());
        }
      });

      // Assign ObjectIds as requested:
      // - one ObjectId for each word entry
      // - each idiom has an ObjectId
      // - each sense (both main senses and idiom senses) has an ObjectId
      // - each example (both main senses and idiom senses) has an ObjectId

      const assignIdsToSenses = (arr) =>
        arr.map((s) => ({
          _id: new ObjectId(),
          ...s,
          definition_vi: "",
          definition_vi_short: "",
          examples: (s.examples || []).map((ex) => ({
            _id: new ObjectId(),
            ...ex,
          })),
        }));

      const wordDoc = {
        _id: new ObjectId(),
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
        senses: assignIdsToSenses(senses),
        phrasal_verb_senses: (phrasal_verb_senses || []).map((pv) => ({
          _id: new ObjectId(),
          ...pv,
          senses: assignIdsToSenses(pv.senses || []),
        })),
        idioms: (idioms || []).map((idm) => ({
          _id: new ObjectId(),
          ...idm,
          senses: assignIdsToSenses(idm.senses || []),
        })),
        phrasal_verbs,
      };

      words.push(wordDoc);
    } catch (e) {
      throw new Error("crawl_request_error");
    }
  }
  return words;
}

export { crawlWordDirect };
