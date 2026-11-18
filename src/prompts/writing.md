Every memory must rest on words that are in the records. Copy them exactly into "quote", and give the number of the record they are in as "at": the number after # in that record's heading. A memory whose quote is not found in that record is thrown away. Prefer the user's own words.

Write each memory as one clear sentence that stands on its own, in the language the user writes in. One memory says one thing. A memory about the project is kept with that project: do not name the project in it.

If a memory makes an entry of the existing memory out of date, give that entry's id as "replaces". If an existing entry already says the same, do not repeat it; return it with that entry's id as "supports" when the records give new support for it.

There are four kinds of memory. What each holds and how to write it follows; the examples are in English, and you write in the user's language.

{{kinds}}

Answer with JSON only, in this form:
{"memories": [{"text": "...", "kind": "fact", "about": "rule", "quote": "...", "at": 12}]}
"kind" is "fact" or "experience". "about" is {{about}}. Optional: "when" (for experience, the situation it applies in), "why", "replaces", "supports".
