/**
 * Group and merge raw key occurrences into the Map format buildPo expects.
 */

/**
 * Merge grouped key occurrences into final entries ready for buildPo.
 * Accumulates refs, comments, varSets across occurrences, deduplicates, and builds comment string.
 *
 * @param keys array of raw key objects from keysMap.byPo
 * @returns Map<groupKey, mergedEntry>
 */
export function mergeKeys(keys) {
    const merged = new Map();

    for (const [groupKey, group] of groupKeys(keys)) {
        const final = {...group[0], refs: [], comments: [], varSets: []};

        for (const key of group) {
            final.refs.push(key.ref);
            if (key.isPlural) final.isPlural = true;
            if (key.hasDynamicOptions) final.hasDynamicOptions = true;
            if (key.hasNamingViolation) final.hasNamingViolation = true;
            if (key.varSets?.length) final.varSets.push(...key.varSets);
            if (key.comments?.length) final.comments.push(...key.comments);
        }

        deduplicateVarSets(final);
        deduplicateComments(final);
        final.comment = finalizeComment(final);
        merged.set(groupKey, final);
    }

    return merged;
}

function deduplicateVarSets(entry) {
    entry.varSets = entry.varSets.reduce((acc, v) => {
        if (!acc.some(({name}) => name === v.name)) acc.push(v);
        return acc;
    }, []);
}

function deduplicateComments(entry) {
    entry.comments = [...new Set(entry.comments)];
}

/**
 * Group raw keys by value + context into arrays of same-key occurrences.
 * Filters out dynamic and unknown-ns keys.
 *
 * @param keys array of raw key objects from keysMap.byPo
 * @returns Map<groupKey, key[]>
 */
function groupKeys(keys) {
    const groups = new Map();

    for (const key of keys) {
        if (key.isDynamic || key.isUnknownNs) continue;
        const groupKey = key.context ? `${key.value}\x00${key.context}` : key.value;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(key);
    }

    return groups;
}

/**
 * Build the extracted comment string from accumulated comments, varSets and descriptions.
 *
 * @param entry merged key entry
 * @returns combined comment string or null
 */
function finalizeComment(entry) {
    const parts = [...entry.comments];
    for (const {name, desc} of entry.varSets) {
        parts.push(`{{${name}}}${desc ? ` — ${desc}` : ''}`);
    }
    if (entry.contextDesc) parts.push(`Context "${entry.context}": ${entry.contextDesc}`);
    return parts.length ? parts.join('\n') : null;
}
