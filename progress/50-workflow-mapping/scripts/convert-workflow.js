/**
 * Converts a ComfyUI UI workflow JSON to API prompt format.
 * Run once after updating workflow.json: npm run convert-workflow
 *
 * Handles the realities of a hand-built ComfyUI export:
 *  - mode 4 (bypass) nodes are removed but their connections are "passed
 *    through" to the upstream source (matching ComfyUI runtime behavior).
 *  - mode 2 (mute) and Note/MarkdownNote nodes are dropped.
 *  - The graph is pruned to only the nodes the real output needs, so a stray
 *    second pipeline or display-only nodes (e.g. Image Comparer) are excluded.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'workflows', 'workflow.json');
const OUTPUT = path.join(__dirname, '..', 'workflows', 'workflow-api.json');

// The app always drives the render from this LoadImage (base wireframe).
// The output SaveImage we keep must descend from it; this prunes away any
// unrelated/demo pipeline that happens to live in the same export.
const ANCHOR_NODE_ID = '370';

const SKIP_TYPES = new Set(['Note', 'MarkdownNote']);
const MODE_MUTE = 2;
const MODE_BYPASS = 4;

function buildLinkMap(links) {
  const byId = new Map();
  for (const link of links || []) {
    const [id, sourceNode, sourceSlot, targetNode, targetSlot, type] = link;
    byId.set(id, { sourceNode, sourceSlot, targetNode, targetSlot, type });
  }
  return byId;
}

function indexNodes(nodes) {
  const byId = new Map();
  for (const node of nodes || []) {
    byId.set(node.id, node);
  }
  return byId;
}

/**
 * Follow a connection back to its first non-bypassed source node.
 * Returns { nodeId, slot } or null if the connection dead-ends at a
 * bypassed/muted node with no matching upstream input.
 */
function resolveSource(nodeId, slot, nodesById, linkMap, seen = new Set()) {
  const node = nodesById.get(nodeId);
  if (!node || seen.has(nodeId)) return null;

  if (node.mode === MODE_MUTE) return null;

  if (node.mode === MODE_BYPASS) {
    seen.add(nodeId);
    const outType = node.outputs?.[slot]?.type;
    // ComfyUI passes a bypassed node's output through the first input of the
    // same type. Find that input and keep resolving upstream.
    const passInput = (node.inputs || []).find(
      (input) => input.type === outType && input.link != null
    );
    if (!passInput) return null;
    const link = linkMap.get(passInput.link);
    if (!link) return null;
    return resolveSource(link.sourceNode, link.sourceSlot, nodesById, linkMap, seen);
  }

  return { nodeId, slot };
}

function buildNodeInputs(node, nodesById, linkMap) {
  const inputs = {};

  for (const input of node.inputs || []) {
    if (input.link == null) continue;
    const link = linkMap.get(input.link);
    if (!link) continue;
    const resolved = resolveSource(link.sourceNode, link.sourceSlot, nodesById, linkMap);
    if (resolved) {
      inputs[input.name] = [String(resolved.nodeId), resolved.slot];
    }
  }

  const widgetInputs = (node.inputs || []).filter((i) => i.widget);
  const widgetValues = node.widgets_values || [];

  if (node.type === 'KSampler' && widgetValues.length === widgetInputs.length + 1) {
    // KSampler widgets_values includes a hidden control_after_generate at index 1.
    const aligned = [
      widgetValues[0],
      widgetValues[2],
      widgetValues[3],
      widgetValues[4],
      widgetValues[5],
      widgetValues[6],
    ];
    widgetInputs.forEach((input, index) => {
      if (index < aligned.length) inputs[input.name] = aligned[index];
    });
  } else {
    widgetInputs.forEach((input, index) => {
      if (index < widgetValues.length) {
        inputs[input.name] = widgetValues[index];
      }
    });
  }

  return inputs;
}

function workflowToApi(workflow) {
  const linkMap = buildLinkMap(workflow.links);
  const nodesById = indexNodes(workflow.nodes);
  const prompt = {};

  for (const node of workflow.nodes || []) {
    if (SKIP_TYPES.has(node.type)) continue;
    if (node.mode === MODE_MUTE || node.mode === MODE_BYPASS) continue;

    prompt[String(node.id)] = {
      inputs: buildNodeInputs(node, nodesById, linkMap),
      class_type: node.type,
      _meta: { title: node.title || node.type },
    };
  }

  return pruneToOutput(prompt);
}

/** Collect a node and all of its transitive input ancestors. */
function collectAncestors(startId, prompt, acc = new Set()) {
  if (!prompt[startId] || acc.has(startId)) return acc;
  acc.add(startId);
  for (const value of Object.values(prompt[startId].inputs)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      collectAncestors(value[0], prompt, acc);
    }
  }
  return acc;
}

/**
 * Keep only the SaveImage outputs that descend from the anchor node, plus
 * everything they depend on. Drops unrelated pipelines and leaf/display nodes.
 */
function pruneToOutput(prompt) {
  const saveNodes = Object.keys(prompt).filter(
    (id) => prompt[id].class_type === 'SaveImage'
  );

  const keep = new Set();
  for (const saveId of saveNodes) {
    const ancestors = collectAncestors(saveId, prompt);
    if (ancestors.has(ANCHOR_NODE_ID)) {
      ancestors.forEach((id) => keep.add(id));
    }
  }

  // Fallback: if nothing matched the anchor, keep the whole graph rather than
  // emit an empty workflow.
  if (keep.size === 0) return prompt;

  const pruned = {};
  for (const id of Object.keys(prompt)) {
    if (keep.has(id)) pruned[id] = prompt[id];
  }
  return pruned;
}

const workflow = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const api = workflowToApi(workflow);
fs.writeFileSync(OUTPUT, JSON.stringify(api, null, 2));
console.log(`Converted ${Object.keys(api).length} nodes -> ${OUTPUT}`);
