// Adapted from Louis-CFM/coucou flow/text.rs, MIT. Source f09ac0b.
// What Coucou does to the words before pasting them, and the numbers of the
// Statistics page. Port of FlowText.swift; nothing here touches the OS, so it
// runs in the tests as it is.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// A word Coucou writes another way: "cloud code" → "Claude Code".
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Replacement {
    #[serde(default = "new_id")]
    pub id: String,
    pub from: String,
    pub to: String,
}

/// Say the trigger, get the whole text: "my signature" → "Have a nice day,\nLouis".
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Snippet {
    #[serde(default = "new_id")]
    pub id: String,
    pub trigger: String,
    pub text: String,
}

/// A fresh id for an entry: time and a counter, unique enough for one machine.
pub fn new_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{:x}-{:x}", nanos, COUNTER.fetch_add(1, Ordering::Relaxed))
}

/// A dictation ready to paste, its snippets still set aside: each trigger heard
/// became a mark (⟦1⟧) so that nothing else (replacements, dictionary, Claude's
/// clean-up) touches the snippet's own text; `finish` puts the texts in at the end.
#[derive(Debug, Clone, PartialEq)]
pub struct Prepared {
    pub text: String,
    /// Mark → the snippet's text.
    pub snippets: BTreeMap<String, String>,
}

/// Snippet triggers set aside first (they are said as is), then the
/// replacements, then the dictionary's words get their exact spelling.
pub fn prepare(text: &str, words: &[String], replacements: &[Replacement], snippets: &[Snippet]) -> Prepared {
    let mut out = text.to_string();
    let mut marks = BTreeMap::new();
    for (index, snippet) in snippets.iter().enumerate() {
        if snippet.text.is_empty() {
            continue;
        }
        let mark = format!("⟦{}⟧", index + 1);
        let replaced = replacing(&snippet.trigger, &mark, &out);
        if replaced != out {
            marks.insert(mark, snippet.text.clone());
            out = replaced;
        }
    }
    for r in replacements {
        if !r.to.is_empty() {
            out = replacing(&r.from, &r.to, &out);
        }
    }
    for word in words {
        if is_plain_word(word) {
            out = replacing(word, word, &out);
        }
    }
    Prepared { text: out, snippets: marks }
}

/// The marks replaced by their snippets' text.
pub fn finish(text: &str, snippets: &BTreeMap<String, String>) -> String {
    let mut out = text.to_string();
    for (mark, value) in snippets {
        out = out.replace(mark.as_str(), value);
    }
    out
}

/// Whether a rewritten text still has every mark (otherwise the rewrite is not used).
#[cfg(test)]
pub fn keeps_marks(text: &str, snippets: &BTreeMap<String, String>) -> bool {
    snippets.keys().all(|m| text.contains(m.as_str()))
}

/// Everything done on this computer: snippets, replacements and the dictionary.
#[cfg(test)]
pub fn apply(text: &str, words: &[String], replacements: &[Replacement], snippets: &[Snippet]) -> String {
    let p = prepare(text, words, replacements, snippets);
    finish(&p.text, &p.snippets)
}

fn is_word_char(c: char) -> bool {
    c.is_alphanumeric()
}

/// The letters-and-digits runs of a phrase: "Rendez-vous !" → ["Rendez", "vous"].
pub fn tokens(s: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    for c in s.chars() {
        if is_word_char(c) {
            current.push(c);
        } else if !current.is_empty() {
            out.push(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

/// A run of word characters in a text, by char index.
struct Run {
    start: usize,
    end: usize,
    lower: String,
}

fn runs(chars: &[char]) -> Vec<Run> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        if is_word_char(chars[i]) {
            let start = i;
            while i < chars.len() && is_word_char(chars[i]) {
                i += 1;
            }
            let lower: String = chars[start..i].iter().collect::<String>().to_lowercase();
            out.push(Run { start, end: i, lower });
        } else {
            i += 1;
        }
    }
    out
}

/// Every occurrence of `phrase`, ignoring case and what separates its words
/// ("rendez vous", "Rendez-vous"), but only as whole words: "art" never matches
/// in "partir".
pub fn replacing(phrase: &str, replacement: &str, text: &str) -> String {
    let wanted: Vec<String> = tokens(phrase).into_iter().map(|t| t.to_lowercase()).collect();
    if wanted.is_empty() {
        return text.to_string();
    }
    let chars: Vec<char> = text.chars().collect();
    let runs = runs(&chars);
    let mut out = String::with_capacity(text.len());
    let mut copied = 0; // char index copied up to
    let mut i = 0;
    while i + wanted.len() <= runs.len() {
        let matches = wanted.iter().enumerate().all(|(k, w)| runs[i + k].lower == *w);
        if matches {
            let start = runs[i].start;
            let end = runs[i + wanted.len() - 1].end;
            out.extend(&chars[copied..start]);
            out.push_str(replacement);
            copied = end;
            i += wanted.len();
        } else {
            i += 1;
        }
    }
    out.extend(&chars[copied..]);
    out
}

/// Only words made of letters, digits, spaces, hyphens and apostrophes get
/// their spelling fixed: "C++" would match every lone "c".
pub fn is_plain_word(word: &str) -> bool {
    let letters = word.chars().filter(|c| c.is_alphanumeric()).count();
    letters >= 2 && word.chars().all(|c| c.is_alphanumeric() || matches!(c, ' ' | '-' | '\'' | '’'))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rep(from: &str, to: &str) -> Replacement {
        Replacement { id: new_id(), from: from.into(), to: to.into() }
    }

    fn snip(trigger: &str, text: &str) -> Snippet {
        Snippet { id: new_id(), trigger: trigger.into(), text: text.into() }
    }

    #[test]
    fn replacements_ignore_case_and_separators_but_keep_whole_words() {
        assert_eq!(replacing("cloud code", "Claude Code", "j'ouvre Cloud-Code ce matin"), "j'ouvre Claude Code ce matin");
        assert_eq!(replacing("rendez vous", "rendez-vous", "un Rendez vous demain"), "un rendez-vous demain");
        assert_eq!(replacing("art", "ART", "partir à l'art"), "partir à l'ART");
        assert_eq!(replacing("", "x", "rien"), "rien");
        assert_eq!(replacing("open ai", "x", "I use OpenAI and open-ai"), "I use OpenAI and x");
    }

    #[test]
    fn the_dictionary_fixes_the_spelling_of_plain_words_only() {
        let words = vec!["Supabase".to_string(), "C++".to_string(), "Next.js".to_string()];
        assert_eq!(apply("on passe sur supabase et c", &words, &[], &[]), "on passe sur Supabase et c");
        assert!(is_plain_word("Claude Code"));
        assert!(is_plain_word("aujourd'hui"));
        assert!(!is_plain_word("C++"));
        assert!(!is_plain_word("x"));
    }

    #[test]
    fn snippets_are_set_aside_from_everything_else() {
        let snippets = vec![snip("ma signature", "Belle journée,\nLouis Code")];
        let reps = vec![rep("code", "CODE")];
        let p = prepare("merci, ma signature", &[], &reps, &snippets);
        assert_eq!(p.text, "merci, ⟦1⟧");
        assert!(keeps_marks(&p.text, &p.snippets));
        assert!(!keeps_marks("merci", &p.snippets));
        assert_eq!(finish(&p.text, &p.snippets), "merci, Belle journée,\nLouis Code");
        // A snippet with no text is never a mark.
        let empty = vec![snip("vide", "")];
        assert_eq!(apply("c'est vide", &[], &[], &empty), "c'est vide");
    }

}
