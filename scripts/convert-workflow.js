/**
 * Converts ComfyUI UI workflow JSON to API prompt format.
 * Run once after updating workflow.json: npm run convert-workflow
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'workflows', 'workflow.json');
const OUTPUT = path.join(__dirname, '..', 'workflows', 'workflow-api.json');

function buildLinkMap(links) {
  const byId = new Map();
  for (const link of links) {
    const [id, sourceNode, sourceSlot, targetNode, targetSlot, type] = link;
    byId.set(id, { sourceNode, sourceSlot, targetNode, targetSlot, type });
  }
  return byId;
}

function workflowToApi(workflow) {
  const linkMap = buildLinkMap(workflow.links || []);
  const prompt = {};

  for (const node of workflow.nodes || []) {
    if (node.type === 'Note') continue;
    if (node.mode === 4) continue;

    const inputs = {};

    for (const input of node.inputs || []) {
      if (input.link != null) {
        const link = linkMap.get(input.link);
        if (link) {
          inputs[input.name] = [String(link.sourceNode), link.sourceSlot];
        }
      }
    }

    const widgetInputs = (node.inputs || []).filter((i) => i.widget);
    const widgetValues = node.widgets_values || [];

    if (node.type === 'KSampler' && widgetValues.length === widgetInputs.length + 1) {
      // KSampler widgets_values includes hidden control_after_generate at index 1
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

    prompt[String(node.id)] = {
      inputs,
      class_type: node.type,
      _meta: { title: node.title || node.type },
    };
  }

  return prompt;
}

const workflow = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const api = workflowToApi(workflow);
fs.writeFileSync(OUTPUT, JSON.stringify(api, null, 2));
console.log(`Converted ${Object.keys(api).length} nodes -> ${OUTPUT}`);
