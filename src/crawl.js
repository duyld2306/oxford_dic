import puppeteer from "puppeteer";

async function crawlWordDirect(word, maxSuffix = 5) {
  const words = [];
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(100000);

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
      await page.goto(link, { waitUntil: "domcontentloaded" });
      const foundWord = await page.evaluate(() => {
        const el = document.querySelector("h1.headword");
        return el ? el.textContent : null;
      });
      if (!foundWord) {
        break;
      }

      const pos = await page.evaluate(() => {
        const pos = document.querySelector("span.pos");
        return pos ? pos.textContent : "";
      });
      const symbol = await page.evaluate(() => {
        const s = document.querySelector("div.symbols span");
        return s ? s.getAttribute("class").split("_")[1] : "";
      });
      const phonetic = await page.evaluate(() => {
        const phon = document.querySelector("div.phons_br div.sound");
        return phon ? phon.getAttribute("data-src-mp3") : "";
      });
      const phonetic_text = await page.evaluate(() => {
        const phon = document.querySelector("div.phons_br span.phon");
        return phon ? phon.textContent : "";
      });
      const phonetic_am = await page.evaluate(() => {
        const phon = document.querySelector("div.phons_n_am div.sound");
        return phon ? phon.getAttribute("data-src-mp3") : "";
      });
      const phonetic_am_text = await page.evaluate(() => {
        const phon = document.querySelector("div.phons_n_am span.phon");
        return phon ? phon.textContent : "";
      });
      const senses = await page.evaluate(() => {
        const sensesHTML = document.querySelectorAll("li.sense");
        const senseArray = [];
        sensesHTML.forEach((sense) => {
          const definition = sense.querySelector("span.def");
          if (!definition) return;
          const senseObj = {};
          const symbol = sense.querySelector(":scope > div.symbols span");
          senseObj.symbol = symbol
            ? symbol.getAttribute("class").split("_")[1]
            : "";
          const labels = sense.querySelector(":scope > span.labels");
          senseObj.labels = labels ? labels.textContent : "";
          const disG = sense.querySelector(":scope > span.dis-g");
          senseObj.dis_g = disG ? disG.textContent : "";
          const variants = sense.querySelector(":scope > div.variants");
          senseObj.variants = variants
            ? { text: variants.textContent, html: variants.outerHTML }
            : {};
          const grammar = sense.querySelector(":scope > span.grammar");
          senseObj.grammar = grammar ? grammar.textContent : "";
          const cf = sense.querySelector(":scope > span.cf");
          senseObj.cf = cf ? cf.textContent : "";
          senseObj.definition = definition.textContent;
          senseObj.synonyms = [];
          senseObj.opposites = [];
          senseObj.see_alsos = [];
          sense.querySelectorAll("span.xrefs").forEach((xref) => {
            const type = xref.querySelector("span.prefix")?.textContent;
            if (type === "synonym") {
              xref
                .querySelectorAll("a")
                .forEach((a) => senseObj.synonyms.push(a.textContent));
            } else if (type === "opposite") {
              xref
                .querySelectorAll("a")
                .forEach((a) => senseObj.opposites.push(a.textContent));
            } else if (type === "see also") {
              xref
                .querySelectorAll("a")
                .forEach((a) => senseObj.see_alsos.push(a.textContent));
            }
          });
          senseObj.examples = [];
          sense.querySelectorAll("ul.examples li").forEach((example) => {
            const cf = example.querySelector("span.cf");
            const x = example.querySelector("span.x");
            const cfContent = cf ? cf.textContent : "";
            const xContent = x ? x.textContent : "";
            if (cfContent || xContent) {
              senseObj.examples.push({ cf: cfContent, x: xContent });
            }
          });
          senseArray.push(senseObj);
        });
        return senseArray;
      });
      const idioms = await page.evaluate(() => {
        const idiomsHTML = document.querySelectorAll("div.idioms span.idm-g");
        const idiomArray = [];
        idiomsHTML.forEach((idiom) => {
          const idiomObj = {};
          const word = idiom.querySelector("span.idm");
          idiomObj.word = word ? word.textContent : "";
          const labels = idiom.querySelector(".webtop > span.labels");
          idiomObj.labels = labels ? labels.textContent : "";
          const variants = idiom.querySelector(".webtop > div.variants");
          idiomObj.variants = variants
            ? { text: variants.textContent, html: variants.outerHTML }
            : "";
          const idmHTML = idiom.querySelectorAll("li.sense");
          const senseArray = [];
          idmHTML.forEach((sense) => {
            const definition = sense.querySelector("span.def");
            if (!definition) return;
            const senseObj = {};
            const symbol = sense.querySelector(".sensetop > div.symbols span");
            senseObj.symbol = symbol
              ? symbol.getAttribute("class").split("_")[1]
              : "";
            const labels = sense.querySelector(".sensetop > span.labels");
            senseObj.labels = labels ? labels.textContent : "";
            const disG = sense.querySelector(".sensetop > span.dis-g");
            senseObj.dis_g = disG ? disG.textContent : "";
            const variants = sense.querySelector(".sensetop > div.variants");
            senseObj.variants = variants
              ? { text: variants.textContent, html: variants.outerHTML }
              : {};
            const grammar = sense.querySelector(".sensetop > span.grammar");
            senseObj.grammar = grammar ? grammar.textContent : "";
            const cf = sense.querySelector(".sensetop > span.cf");
            senseObj.cf = cf ? cf.textContent : "";
            senseObj.definition = definition.textContent;
            senseObj.synonyms = [];
            senseObj.opposites = [];
            senseObj.see_alsos = [];
            sense.querySelectorAll("span.xrefs").forEach((xref) => {
              const type = xref.querySelector("span.prefix")?.textContent;
              if (type === "synonym") {
                xref
                  .querySelectorAll("a")
                  .forEach((a) => senseObj.synonyms.push(a.textContent));
              } else if (type === "opposite") {
                xref
                  .querySelectorAll("a")
                  .forEach((a) => senseObj.opposites.push(a.textContent));
              } else if (type === "see also") {
                xref
                  .querySelectorAll("a")
                  .forEach((a) => senseObj.see_alsos.push(a.textContent));
              }
            });
            senseObj.examples = [];
            sense.querySelectorAll("ul.examples li").forEach((example) => {
              const x = example.querySelector("span.x");
              if (x) senseObj.examples.push(x.textContent);
            });
            senseArray.push(senseObj);
          });
          idiomObj.senses = senseArray;
          idiomArray.push(idiomObj);
        });
        return idiomArray;
      });
      const phrasal_verbs = await page.evaluate(() => {
        const pvsHTML = document.querySelectorAll(
          ".phrasal_verb_links ul.pvrefs li"
        );
        const pvArray = [];
        pvsHTML.forEach((pv) => {
          const pvObj = {};
          const word = pv.querySelector("a");
          if (word) {
            pvObj.word = word.textContent;
            pvObj.link = word.href;
          }
          pvArray.push(pvObj);
        });
        return pvArray;
      });

      words.push({
        word: foundWord,
        pos,
        symbol,
        phonetic,
        phonetic_text,
        phonetic_am,
        phonetic_am_text,
        senses,
        idioms,
        phrasal_verbs,
      });
    } catch (e) {
      throw new Error("crawl_goto_error");
    }
  }

  await browser.close();
  return words;
}

export { crawlWordDirect };
